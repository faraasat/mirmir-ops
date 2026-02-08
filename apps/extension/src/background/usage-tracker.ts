import { getUsage, updateUsage, getCurrentPlanLimits, incrementUsage } from './storage';
import { TIMEOUTS } from '@/shared/constants';
import type { UsageStats } from '@/shared/types';

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function initializeUsageTracker(): void {
  // Set up periodic sync
  syncInterval = setInterval(syncUsageWithBackend, TIMEOUTS.USAGE_SYNC_INTERVAL);
  
  // Check for daily/monthly resets
  checkAndResetCounters();
  
  console.log('[MirmirOps] Usage tracker initialized');
}

export async function trackUsage(
  category: 'llm' | 'voice' | 'action' | 'byok',
  detail: string
): Promise<void> {
  switch (category) {
    case 'llm':
      await incrementUsage('cloudLlmRequests');
      break;
    case 'voice':
      await incrementUsage('voiceCommands');
      break;
    case 'byok':
      await incrementUsage('byokRequests');
      break;
    // Actions don't have a counter, they're just logged
  }

  console.log(`[MirmirOps] Usage tracked: ${category}/${detail}`);
}

export async function checkLimit(
  category: 'llm' | 'voice' | 'action' | 'byok' | 'shadowTabs' | 'workflows' | 'memory'
): Promise<boolean> {
  const usage = await getUsage();
  const limits = await getCurrentPlanLimits();

  switch (category) {
    case 'llm':
      return limits.cloudLlmRequests === -1 || usage.cloudLlmRequests < limits.cloudLlmRequests;
    case 'voice':
      return limits.voiceCommands === -1 || usage.voiceCommands < limits.voiceCommands;
    case 'byok':
      return limits.byokRequests === -1 || usage.byokRequests < limits.byokRequests;
    case 'shadowTabs':
      return limits.shadowTabs === -1 || usage.activeShadowTabs < limits.shadowTabs;
    case 'workflows':
      return limits.workflowTemplates === -1 || usage.savedWorkflows < limits.workflowTemplates;
    case 'memory':
      return limits.semanticMemoryEntries === -1 || usage.semanticMemoryUsed < limits.semanticMemoryEntries;
    case 'action':
      // Actions are always allowed (rate-limited elsewhere)
      return true;
  }
}

export async function getUsageStats(): Promise<UsageStats> {
  return getUsage();
}

export async function getRemainingLimits(): Promise<Record<string, { used: number; limit: number; remaining: number }>> {
  const usage = await getUsage();
  const limits = await getCurrentPlanLimits();

  const calculate = (used: number, limit: number) => ({
    used,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - used),
  });

  return {
    cloudLlmRequests: calculate(usage.cloudLlmRequests, limits.cloudLlmRequests),
    byokRequests: calculate(usage.byokRequests, limits.byokRequests),
    voiceCommands: calculate(usage.voiceCommands, limits.voiceCommands),
    shadowTabs: calculate(usage.activeShadowTabs, limits.shadowTabs),
    workflows: calculate(usage.savedWorkflows, limits.workflowTemplates),
    semanticMemory: calculate(usage.semanticMemoryUsed, limits.semanticMemoryEntries),
  };
}

async function syncUsageWithBackend(): Promise<void> {
  // In a full implementation, this would sync with the backend API
  // For now, just update the last synced timestamp
  await updateUsage({ lastSyncedAt: Date.now() });
  console.log('[MirmirOps] Usage synced (local only for now)');
}

async function checkAndResetCounters(): Promise<void> {
  const usage = await getUsage();
  const now = Date.now();
  const lastSync = usage.lastSyncedAt;

  // Check if we need to reset daily counters (voice commands)
  const lastSyncDate = new Date(lastSync);
  const nowDate = new Date(now);
  
  if (lastSyncDate.getDate() !== nowDate.getDate()) {
    await updateUsage({ voiceCommands: 0 });
    console.log('[MirmirOps] Daily counters reset');
  }

  // Check if we need to reset monthly counters (LLM requests)
  if (lastSyncDate.getMonth() !== nowDate.getMonth()) {
    await updateUsage({
      cloudLlmRequests: 0,
      byokRequests: 0,
    });
    console.log('[MirmirOps] Monthly counters reset');
  }
}

export function cleanup(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
