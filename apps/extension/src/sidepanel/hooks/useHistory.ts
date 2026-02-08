// React hook for history management

import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  getHistoryDatabase,
  getHistoryStats,
  deleteHistoryEntry,
  deleteHistoryEntries,
  exportHistory,
  type HistoryEntry,
  type HistoryFilter,
  type HistoryStats,
  type Session,
} from '@/lib/history';

export interface UseHistoryOptions {
  filter?: HistoryFilter;
  autoRefresh?: boolean;
}

export interface UseHistoryReturn {
  entries: HistoryEntry[];
  sessions: Session[];
  stats: HistoryStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refresh: () => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  deleteEntries: (filter: HistoryFilter) => Promise<void>;
  exportToJson: () => Promise<string>;
  exportToCsv: () => Promise<string>;
  setFilter: (filter: HistoryFilter) => void;
}

export function useHistory(options: UseHistoryOptions = {}): UseHistoryReturn {
  const [filter, setFilter] = useState<HistoryFilter>(options.filter || { limit: 50 });
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  let db: ReturnType<typeof getHistoryDatabase>;
  try {
    db = getHistoryDatabase();
  } catch (err) {
    console.error('[useHistory] Failed to get database:', err);
    return {
      entries: [],
      sessions: [],
      stats: null,
      isLoading: false,
      error: 'Failed to initialize history database',
      refresh: async () => {},
      deleteEntry: async () => {},
      deleteEntries: async () => {},
      exportToJson: async () => '[]',
      exportToCsv: async () => '',
      setFilter,
    };
  }

  // Live query for sessions — auto-updates when IndexedDB changes
  const sessions = useLiveQuery(
    () => {
      try {
        return db.sessions.orderBy('startedAt').reverse().limit(10).toArray();
      } catch {
        return [];
      }
    },
    [],
    []
  );

  // Live query for entries — auto-updates when IndexedDB changes
  const liveEntries = useLiveQuery(
    () => {
      try {
        return db.entries.orderBy('timestamp').reverse().limit(filter.limit || 100).toArray();
      } catch {
        return [];
      }
    },
    [filter.limit],
    []
  );

  // Apply remaining filters in memory (type, search, etc.)
  const entries: HistoryEntry[] = (liveEntries || []).filter(entry => {
    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      if (!types.includes(entry.type)) return false;
    }
    if (filter.sessionId && entry.sessionId !== filter.sessionId) return false;
    if (filter.startDate && entry.timestamp < filter.startDate) return false;
    if (filter.endDate && entry.timestamp > filter.endDate) return false;
    if (filter.url && !entry.context?.url?.includes(filter.url)) return false;
    if (filter.searchText) {
      const search = filter.searchText.toLowerCase();
      const matches =
        entry.command?.input?.toLowerCase().includes(search) ||
        entry.action?.type?.toLowerCase().includes(search) ||
        entry.llm?.response?.toLowerCase().includes(search) ||
        entry.context?.title?.toLowerCase().includes(search);
      if (!matches) return false;
    }
    if (filter.tags && filter.tags.length > 0) {
      if (!entry.tags?.some(t => filter.tags!.includes(t))) return false;
    }
    if (filter.success !== undefined && entry.result?.success !== filter.success) return false;
    return true;
  });

  // Load stats (not live-queryable easily, so we refresh periodically)
  const loadStats = useCallback(async () => {
    try {
      const statsData = await getHistoryStats();
      setStats(statsData);
      setError(null);
    } catch (err) {
      console.warn('[useHistory] Failed to load stats:', err);
      setStats({ totalEntries: 0, totalSessions: 0, commandsToday: 0, actionsToday: 0, successRate: 100, mostVisitedUrls: [], mostUsedActions: [], tokenUsage: { total: 0, byProvider: {} } });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial stats load
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Refresh stats when entries change
  useEffect(() => {
    if (liveEntries && liveEntries.length > 0) {
      loadStats();
    }
  }, [liveEntries?.length, loadStats]);

  // Auto-refresh stats periodically
  useEffect(() => {
    if (options.autoRefresh) {
      const interval = setInterval(loadStats, 15000);
      return () => clearInterval(interval);
    }
  }, [loadStats, options.autoRefresh]);

  const refresh = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  const deleteEntry = useCallback(async (id: string) => {
    try {
      await deleteHistoryEntry(id);
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    }
  }, [loadStats]);

  const deleteEntries_fn = useCallback(async (deleteFilter: HistoryFilter) => {
    try {
      await deleteHistoryEntries(deleteFilter);
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entries');
    }
  }, [loadStats]);

  const exportToJson = useCallback(async () => {
    return exportHistory({ format: 'json', filter });
  }, [filter]);

  const exportToCsv = useCallback(async () => {
    return exportHistory({ format: 'csv', filter });
  }, [filter]);

  return {
    entries,
    sessions: sessions || [],
    stats,
    isLoading,
    error,
    refresh,
    deleteEntry,
    deleteEntries: deleteEntries_fn,
    exportToJson,
    exportToCsv,
    setFilter,
  };
}
