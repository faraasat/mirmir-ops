// React hook for history management

import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  getHistoryDatabase,
  queryHistory,
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
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live query for sessions
  const db = getHistoryDatabase();
  const sessions = useLiveQuery(
    () => db.sessions.orderBy('startedAt').reverse().limit(10).toArray(),
    [],
    []
  );

  // Load entries
  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [entriesData, statsData] = await Promise.all([
        queryHistory(filter),
        getHistoryStats(),
      ]);
      
      setEntries(entriesData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  // Initial load
  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Auto-refresh on filter change
  useEffect(() => {
    if (options.autoRefresh) {
      const interval = setInterval(loadEntries, 30000);
      return () => clearInterval(interval);
    }
  }, [loadEntries, options.autoRefresh]);

  const refresh = useCallback(async () => {
    await loadEntries();
  }, [loadEntries]);

  const deleteEntry = useCallback(async (id: string) => {
    try {
      await deleteHistoryEntry(id);
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    }
  }, [loadEntries]);

  const deleteEntries_fn = useCallback(async (deleteFilter: HistoryFilter) => {
    try {
      await deleteHistoryEntries(deleteFilter);
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entries');
    }
  }, [loadEntries]);

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
