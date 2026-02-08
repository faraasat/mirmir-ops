// History Retention and Auto-Cleanup
import browser from 'webextension-polyfill';
import { getHistoryDatabase } from './database';
import { deleteOldSessions } from './session';
import { STORAGE_KEYS } from '@/shared/constants';

export interface RetentionSettings {
  retentionDays: number; // -1 = forever, 0 = session only
  excludedDomains: string[];
  excludedPatterns: string[]; // Regex patterns
  autoCleanupEnabled: boolean;
  maxEntriesCount: number; // 0 = unlimited
}

const DEFAULT_RETENTION: RetentionSettings = {
  retentionDays: 7, // Free plan default
  excludedDomains: [],
  excludedPatterns: [],
  autoCleanupEnabled: true,
  maxEntriesCount: 10000,
};

let cachedSettings: RetentionSettings = DEFAULT_RETENTION;

/**
 * Initialize the history cleanup scheduler
 */
export async function initializeHistoryCleanup(): Promise<void> {
  // Load settings
  await loadRetentionSettings();
  
  // Set up cleanup alarm (runs daily at 3 AM local time)
  const now = new Date();
  const nextRun = new Date();
  nextRun.setHours(3, 0, 0, 0);
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  const delayMinutes = Math.ceil((nextRun.getTime() - now.getTime()) / 60000);
  
  browser.alarms.create('history-cleanup', {
    delayInMinutes: delayMinutes,
    periodInMinutes: 24 * 60, // Daily
  });
  
  // Also run cleanup on startup if enabled
  const settings = await getRetentionSettings();
  if (settings.autoCleanupEnabled) {
    // Slight delay to not block startup
    setTimeout(() => runHistoryCleanup(), 5000);
  }
  
  console.log('[HistoryRetention] Initialized, next cleanup in', delayMinutes, 'minutes');
}

/**
 * Load retention settings from storage
 */
async function loadRetentionSettings(): Promise<RetentionSettings> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
    const settings = result[STORAGE_KEYS.SETTINGS];
    
    cachedSettings = {
      ...DEFAULT_RETENTION,
      ...settings?.historyRetention,
    };
    
    return cachedSettings;
  } catch (error) {
    console.error('[HistoryRetention] Failed to load settings:', error);
    cachedSettings = DEFAULT_RETENTION;
    return DEFAULT_RETENTION;
  }
}

/**
 * Get retention settings (cached)
 */
export async function getRetentionSettings(): Promise<RetentionSettings> {
  return cachedSettings;
}

/**
 * Update retention settings
 */
export async function updateRetentionSettings(
  updates: Partial<RetentionSettings>
): Promise<void> {
  const current = await getRetentionSettings();
  const newSettings = { ...current, ...updates };
  
  // Save to storage
  const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
  const allSettings = result[STORAGE_KEYS.SETTINGS] || {};
  
  await browser.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: {
      ...allSettings,
      historyRetention: newSettings,
    },
  });
  
  cachedSettings = newSettings;
}

/**
 * Run the history cleanup process
 */
export async function runHistoryCleanup(): Promise<{
  sessionsDeleted: number;
  entriesDeleted: number;
  entriesTrimmed: number;
}> {
  const settings = await getRetentionSettings();
  const result = {
    sessionsDeleted: 0,
    entriesDeleted: 0,
    entriesTrimmed: 0,
  };
  
  if (!settings.autoCleanupEnabled) {
    return result;
  }
  
  console.log('[HistoryRetention] Running cleanup...');
  
  try {
    // 1. Delete old sessions based on retention period
    if (settings.retentionDays >= 0) {
      result.sessionsDeleted = await deleteOldSessions(settings.retentionDays);
    }
    
    // 2. Delete orphaned entries (entries without sessions)
    result.entriesDeleted = await deleteOrphanedEntries();
    
    // 3. Trim entries if over max count
    if (settings.maxEntriesCount > 0) {
      result.entriesTrimmed = await trimExcessEntries(settings.maxEntriesCount);
    }
    
    console.log('[HistoryRetention] Cleanup complete:', result);
    return result;
  } catch (error) {
    console.error('[HistoryRetention] Cleanup failed:', error);
    return result;
  }
}

/**
 * Delete entries that don't belong to any session
 */
async function deleteOrphanedEntries(): Promise<number> {
  const db = getHistoryDatabase();
  
  // Get all session IDs
  const sessions = await db.sessions.toArray();
  const sessionIds = new Set(sessions.map(s => s.id));
  
  // Find orphaned entries
  const allEntries = await db.entries.toArray();
  const orphanedIds = allEntries
    .filter(e => !sessionIds.has(e.sessionId))
    .map(e => e.id);
  
  if (orphanedIds.length > 0) {
    await db.entries.bulkDelete(orphanedIds);
  }
  
  return orphanedIds.length;
}

/**
 * Trim excess entries if over the max count
 */
async function trimExcessEntries(maxCount: number): Promise<number> {
  const db = getHistoryDatabase();
  
  const totalCount = await db.entries.count();
  
  if (totalCount <= maxCount) {
    return 0;
  }
  
  const toDelete = totalCount - maxCount;
  
  // Get oldest entries to delete
  const oldestEntries = await db.entries
    .orderBy('timestamp')
    .limit(toDelete)
    .toArray();
  
  const idsToDelete = oldestEntries.map(e => e.id);
  await db.entries.bulkDelete(idsToDelete);
  
  return idsToDelete.length;
}

/**
 * Check if a URL should be excluded from history
 */
export async function shouldExcludeUrl(url: string): Promise<boolean> {
  const settings = await getRetentionSettings();
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // Check excluded domains
    for (const excludedDomain of settings.excludedDomains) {
      if (domain === excludedDomain || domain.endsWith('.' + excludedDomain)) {
        return true;
      }
    }
    
    // Check excluded patterns
    for (const pattern of settings.excludedPatterns) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(url)) {
          return true;
        }
      } catch {
        // Invalid regex, skip
      }
    }
    
    return false;
  } catch {
    // Invalid URL, don't exclude
    return false;
  }
}

/**
 * Add a domain to the exclusion list
 */
export async function addExcludedDomain(domain: string): Promise<void> {
  const settings = await getRetentionSettings();
  
  // Normalize domain
  const normalized = domain.toLowerCase().replace(/^www\./, '');
  
  if (!settings.excludedDomains.includes(normalized)) {
    await updateRetentionSettings({
      excludedDomains: [...settings.excludedDomains, normalized],
    });
  }
}

/**
 * Remove a domain from the exclusion list
 */
export async function removeExcludedDomain(domain: string): Promise<void> {
  const settings = await getRetentionSettings();
  const normalized = domain.toLowerCase().replace(/^www\./, '');
  
  await updateRetentionSettings({
    excludedDomains: settings.excludedDomains.filter(d => d !== normalized),
  });
}

/**
 * Add a URL pattern to the exclusion list
 */
export async function addExcludedPattern(pattern: string): Promise<void> {
  // Validate regex
  try {
    new RegExp(pattern);
  } catch {
    throw new Error('Invalid regex pattern');
  }
  
  const settings = await getRetentionSettings();
  
  if (!settings.excludedPatterns.includes(pattern)) {
    await updateRetentionSettings({
      excludedPatterns: [...settings.excludedPatterns, pattern],
    });
  }
}

/**
 * Remove a URL pattern from the exclusion list
 */
export async function removeExcludedPattern(pattern: string): Promise<void> {
  const settings = await getRetentionSettings();
  
  await updateRetentionSettings({
    excludedPatterns: settings.excludedPatterns.filter(p => p !== pattern),
  });
}

/**
 * Delete all history for a specific domain
 */
export async function deleteHistoryForDomain(domain: string): Promise<number> {
  const db = getHistoryDatabase();
  
  // Get all entries
  const allEntries = await db.entries.toArray();
  
  // Filter entries matching the domain
  const toDelete = allEntries.filter(entry => {
    if (!entry.context?.url) return false;
    try {
      const urlObj = new URL(entry.context.url);
      return urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain);
    } catch {
      return false;
    }
  });
  
  if (toDelete.length > 0) {
    await db.entries.bulkDelete(toDelete.map(e => e.id));
  }
  
  return toDelete.length;
}

/**
 * Get history storage statistics
 */
export async function getHistoryStorageStats(): Promise<{
  totalEntries: number;
  totalSessions: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  estimatedSizeKB: number;
}> {
  const db = getHistoryDatabase();
  
  const [entries, sessions] = await Promise.all([
    db.entries.toArray(),
    db.sessions.count(),
  ]);
  
  const timestamps = entries.map(e => e.timestamp);
  
  // Rough size estimation (JSON stringified length)
  const estimatedSize = entries.reduce((sum, e) => {
    return sum + JSON.stringify(e).length;
  }, 0);
  
  return {
    totalEntries: entries.length,
    totalSessions: sessions,
    oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
    newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    estimatedSizeKB: Math.round(estimatedSize / 1024),
  };
}
