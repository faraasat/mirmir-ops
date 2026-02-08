// History Entry Management

import { v4 as uuid } from 'uuid';
import { getHistoryDatabase } from './database';
import { getCurrentSession, updateSessionStats } from './session';
import { shouldExcludeUrl } from './retention';
import type { HistoryEntry, HistoryFilter, HistoryStats } from './types';

/**
 * Add a history entry
 */
export async function addHistoryEntry(
  entry: Omit<HistoryEntry, 'id' | 'sessionId' | 'timestamp'>
): Promise<HistoryEntry> {
  // Check if URL should be excluded
  if (entry.context?.url) {
    const shouldExclude = await shouldExcludeUrl(entry.context.url);
    if (shouldExclude) {
      console.log('[History] Skipping excluded URL:', entry.context.url);
      // Return a placeholder entry without actually saving
      return {
        id: 'excluded-' + Date.now(),
        sessionId: 'excluded',
        timestamp: Date.now(),
        ...entry,
      } as HistoryEntry;
    }
  }
  
  const session = await getCurrentSession();
  
  const fullEntry: HistoryEntry = {
    id: uuid(),
    sessionId: session.id,
    timestamp: Date.now(),
    ...entry,
  };
  
  const db = getHistoryDatabase();
  await db.entries.add(fullEntry);
  
  // Update session stats
  const statsUpdate: Parameters<typeof updateSessionStats>[0] = {};
  
  if (entry.type === 'command') {
    statsUpdate.commandCount = 1;
  }
  if (entry.type === 'action') {
    statsUpdate.actionCount = 1;
    if (entry.result?.success) {
      statsUpdate.successCount = 1;
    }
  }
  if (entry.type === 'error') {
    statsUpdate.errorCount = 1;
  }
  if (entry.context?.url) {
    statsUpdate.url = entry.context.url;
  }
  
  await updateSessionStats(statsUpdate);
  
  return fullEntry;
}

/**
 * Log a command
 */
export async function logCommand(
  input: string,
  context?: { url: string; title: string; tabId?: number },
  intent?: { action: string; confidence: number }
): Promise<HistoryEntry> {
  return addHistoryEntry({
    type: 'command',
    command: {
      input,
      intent: intent?.action,
      confidence: intent?.confidence,
    },
    context,
  });
}

/**
 * Log an action
 */
export async function logAction(
  action: {
    type: string;
    target?: string;
    parameters?: Record<string, unknown>;
    permissionTier?: number;
  },
  result: {
    success: boolean;
    data?: unknown;
    error?: string;
    duration?: number;
  },
  context?: { url: string; title: string; tabId?: number }
): Promise<HistoryEntry> {
  return addHistoryEntry({
    type: result.success ? 'action' : 'error',
    action,
    result,
    context,
  });
}

/**
 * Log an LLM response
 */
export async function logLLMResponse(
  llm: {
    provider: string;
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    response?: string;
  },
  context?: { url: string; title: string; tabId?: number }
): Promise<HistoryEntry> {
  return addHistoryEntry({
    type: 'response',
    llm,
    context,
  });
}

/**
 * Log navigation
 */
export async function logNavigation(
  context: { url: string; title: string; tabId?: number }
): Promise<HistoryEntry> {
  return addHistoryEntry({
    type: 'navigation',
    context,
  });
}

/**
 * Query history entries
 */
export async function queryHistory(filter: HistoryFilter): Promise<HistoryEntry[]> {
  const db = getHistoryDatabase();
  let query = db.entries.orderBy('timestamp').reverse();
  
  // Apply filters
  if (filter.sessionId) {
    query = db.entries.where('sessionId').equals(filter.sessionId).reverse();
  }
  
  if (filter.type) {
    const types = Array.isArray(filter.type) ? filter.type : [filter.type];
    query = db.entries.where('type').anyOf(types).reverse();
  }
  
  // Get all entries then filter in memory for complex conditions
  let entries = await query.toArray();
  
  if (filter.startDate) {
    entries = entries.filter(e => e.timestamp >= filter.startDate!);
  }
  
  if (filter.endDate) {
    entries = entries.filter(e => e.timestamp <= filter.endDate!);
  }
  
  if (filter.url) {
    entries = entries.filter(e => e.context?.url?.includes(filter.url!));
  }
  
  if (filter.searchText) {
    const search = filter.searchText.toLowerCase();
    entries = entries.filter(e => 
      e.command?.input?.toLowerCase().includes(search) ||
      e.action?.type?.toLowerCase().includes(search) ||
      e.llm?.response?.toLowerCase().includes(search) ||
      e.context?.title?.toLowerCase().includes(search)
    );
  }
  
  if (filter.tags && filter.tags.length > 0) {
    entries = entries.filter(e => 
      e.tags?.some(t => filter.tags!.includes(t))
    );
  }
  
  if (filter.success !== undefined) {
    entries = entries.filter(e => e.result?.success === filter.success);
  }
  
  // Apply pagination
  if (filter.offset) {
    entries = entries.slice(filter.offset);
  }
  
  if (filter.limit) {
    entries = entries.slice(0, filter.limit);
  }
  
  return entries;
}

/**
 * Get history entry by ID
 */
export async function getHistoryEntry(id: string): Promise<HistoryEntry | undefined> {
  const db = getHistoryDatabase();
  return db.entries.get(id);
}

/**
 * Delete history entry
 */
export async function deleteHistoryEntry(id: string): Promise<void> {
  const db = getHistoryDatabase();
  await db.entries.delete(id);
}

/**
 * Delete history entries by filter
 */
export async function deleteHistoryEntries(filter: HistoryFilter): Promise<number> {
  const entries = await queryHistory(filter);
  const ids = entries.map(e => e.id);
  
  const db = getHistoryDatabase();
  await db.entries.bulkDelete(ids);
  
  return ids.length;
}

/**
 * Get history statistics
 */
export async function getHistoryStats(): Promise<HistoryStats> {
  const db = getHistoryDatabase();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  
  const [totalEntries, totalSessions, todayEntries, allEntries] = await Promise.all([
    db.entries.count(),
    db.sessions.count(),
    db.entries.where('timestamp').aboveOrEqual(todayStart).toArray(),
    db.entries.toArray(),
  ]);
  
  // Calculate today's stats
  const commandsToday = todayEntries.filter(e => e.type === 'command').length;
  const actionsToday = todayEntries.filter(e => e.type === 'action').length;
  
  // Calculate success rate
  const actionsWithResults = allEntries.filter(e => e.type === 'action' && e.result);
  const successCount = actionsWithResults.filter(e => e.result?.success).length;
  const successRate = actionsWithResults.length > 0 
    ? Math.round((successCount / actionsWithResults.length) * 100) 
    : 100;
  
  // Most visited URLs
  const urlCounts = new Map<string, number>();
  allEntries.forEach(e => {
    if (e.context?.url) {
      try {
        const host = new URL(e.context.url).hostname;
        if (host) {
          urlCounts.set(host, (urlCounts.get(host) || 0) + 1);
        }
      } catch {
        // Skip invalid URLs (e.g., 'unknown')
      }
    }
  });
  const mostVisitedUrls = Array.from(urlCounts.entries())
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Most used actions
  const actionCounts = new Map<string, number>();
  allEntries.forEach(e => {
    if (e.action?.type) {
      actionCounts.set(e.action.type, (actionCounts.get(e.action.type) || 0) + 1);
    }
  });
  const mostUsedActions = Array.from(actionCounts.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Token usage
  const tokenUsage = { total: 0, byProvider: {} as Record<string, number> };
  allEntries.forEach(e => {
    if (e.llm) {
      const tokens = (e.llm.promptTokens || 0) + (e.llm.completionTokens || 0);
      tokenUsage.total += tokens;
      tokenUsage.byProvider[e.llm.provider] = (tokenUsage.byProvider[e.llm.provider] || 0) + tokens;
    }
  });
  
  return {
    totalEntries,
    totalSessions,
    commandsToday,
    actionsToday,
    successRate,
    mostVisitedUrls,
    mostUsedActions,
    tokenUsage,
  };
}

/**
 * Export history to JSON or CSV
 */
export async function exportHistory(options: {
  format: 'json' | 'csv';
  filter?: HistoryFilter;
}): Promise<string> {
  const entries = await queryHistory(options.filter || {});
  
  if (options.format === 'json') {
    return JSON.stringify(entries, null, 2);
  }
  
  // CSV format
  const headers = ['id', 'sessionId', 'timestamp', 'type', 'command', 'action', 'result', 'url'];
  const rows = entries.map(e => [
    e.id,
    e.sessionId,
    new Date(e.timestamp).toISOString(),
    e.type,
    e.command?.input || '',
    e.action?.type || '',
    e.result?.success ? 'success' : e.result?.error || '',
    e.context?.url || '',
  ]);
  
  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
}
