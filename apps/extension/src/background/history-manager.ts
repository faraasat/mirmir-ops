import browser from 'webextension-polyfill';
import { v4 as uuidv4 } from 'uuid';
import type { HistoryEntry, Session } from '@/shared/types';
import { STORAGE_KEYS } from '@/shared/constants';
import { getCurrentPlanLimits } from './storage';

let currentSession: Session | null = null;

interface HistoryEntryInput {
  type: HistoryEntry['type'];
  data: HistoryEntry['data'];
  url?: string;
  tabId?: number;
}

export async function saveHistoryEntry(entry: HistoryEntryInput): Promise<HistoryEntry> {
  // Ensure we have a session
  if (!currentSession) {
    currentSession = await startSession();
  }

  const historyEntry: HistoryEntry = {
    id: uuidv4(),
    sessionId: currentSession.id,
    timestamp: Date.now(),
    type: entry.type,
    data: entry.data,
    url: entry.url,
    tabId: entry.tabId,
  };

  // Get existing history
  const result = await browser.storage.local.get(STORAGE_KEYS.HISTORY);
  const history: HistoryEntry[] = result[STORAGE_KEYS.HISTORY] || [];

  // Add new entry
  history.unshift(historyEntry);

  // Trim history based on plan limits
  const limits = await getCurrentPlanLimits();
  const retentionMs = limits.historyRetentionDays * 24 * 60 * 60 * 1000;
  const cutoff = limits.historyRetentionDays === -1 ? 0 : Date.now() - retentionMs;
  
  const trimmed = history.filter(h => h.timestamp > cutoff);

  // Save
  await browser.storage.local.set({ [STORAGE_KEYS.HISTORY]: trimmed });

  // Update session stats
  if (currentSession) {
    if (entry.type === 'command') {
      currentSession.commandCount++;
    } else if (entry.type === 'action') {
      currentSession.actionCount++;
      // Update success rate
      const success = entry.data.result?.success;
      if (success !== undefined) {
        const total = currentSession.actionCount;
        const prevSuccessful = Math.round(currentSession.successRate * (total - 1));
        currentSession.successRate = (prevSuccessful + (success ? 1 : 0)) / total;
      }
    }

    if (entry.url && !currentSession.urls.includes(entry.url)) {
      currentSession.urls.push(entry.url);
    }
  }

  return historyEntry;
}

export async function getHistory(
  limit: number = 100,
  offset: number = 0
): Promise<HistoryEntry[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.HISTORY);
  const history: HistoryEntry[] = result[STORAGE_KEYS.HISTORY] || [];
  
  return history.slice(offset, offset + limit);
}

export async function getHistoryBySession(sessionId: string): Promise<HistoryEntry[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.HISTORY);
  const history: HistoryEntry[] = result[STORAGE_KEYS.HISTORY] || [];
  
  return history.filter(h => h.sessionId === sessionId);
}

export async function searchHistory(
  query: string,
  filters?: {
    type?: HistoryEntry['type'];
    startDate?: number;
    endDate?: number;
    url?: string;
  }
): Promise<HistoryEntry[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.HISTORY);
  const history: HistoryEntry[] = result[STORAGE_KEYS.HISTORY] || [];
  
  const queryLower = query.toLowerCase();
  
  return history.filter(entry => {
    // Apply filters
    if (filters?.type && entry.type !== filters.type) return false;
    if (filters?.startDate && entry.timestamp < filters.startDate) return false;
    if (filters?.endDate && entry.timestamp > filters.endDate) return false;
    if (filters?.url && entry.url !== filters.url) return false;

    // Search in entry data
    const searchableText = JSON.stringify(entry.data).toLowerCase();
    return searchableText.includes(queryLower);
  });
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const result = await browser.storage.local.get(STORAGE_KEYS.HISTORY);
  const history: HistoryEntry[] = result[STORAGE_KEYS.HISTORY] || [];
  
  const filtered = history.filter(h => h.id !== id);
  await browser.storage.local.set({ [STORAGE_KEYS.HISTORY]: filtered });
}

export async function clearHistory(): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.HISTORY]: [] });
}

export async function startSession(): Promise<Session> {
  const session: Session = {
    id: uuidv4(),
    startedAt: Date.now(),
    commandCount: 0,
    actionCount: 0,
    successRate: 1,
    urls: [],
  };

  currentSession = session;
  return session;
}

export async function endSession(): Promise<Session | null> {
  if (currentSession) {
    currentSession.endedAt = Date.now();
    const ended = { ...currentSession };
    currentSession = null;
    return ended;
  }
  return null;
}

export function getCurrentSession(): Session | null {
  return currentSession;
}

export async function getRecentSessions(limit: number = 10): Promise<Session[]> {
  // In a full implementation, sessions would be stored separately
  // For now, derive from history
  const result = await browser.storage.local.get(STORAGE_KEYS.HISTORY);
  const history: HistoryEntry[] = result[STORAGE_KEYS.HISTORY] || [];
  
  const sessionMap = new Map<string, Session>();
  
  for (const entry of history) {
    if (!sessionMap.has(entry.sessionId)) {
      sessionMap.set(entry.sessionId, {
        id: entry.sessionId,
        startedAt: entry.timestamp,
        endedAt: entry.timestamp,
        commandCount: 0,
        actionCount: 0,
        successRate: 1,
        urls: [],
      });
    }
    
    const session = sessionMap.get(entry.sessionId)!;
    session.startedAt = Math.min(session.startedAt, entry.timestamp);
    session.endedAt = Math.max(session.endedAt || 0, entry.timestamp);
    
    if (entry.type === 'command') session.commandCount++;
    if (entry.type === 'action') session.actionCount++;
    if (entry.url && !session.urls.includes(entry.url)) {
      session.urls.push(entry.url);
    }
  }
  
  return Array.from(sessionMap.values())
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit);
}
