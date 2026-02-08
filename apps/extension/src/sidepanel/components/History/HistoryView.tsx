import React, { useState, useMemo } from 'react';
import { useHistory } from '../../hooks/useHistory';
import { HistoryItem } from './HistoryItem';
import type { HistoryEntry, HistoryEntryType } from '@/lib/history';

type FilterType = 'all' | HistoryEntryType;

export function HistoryView() {
  const [filter, setFilter] = useState<FilterType>('all');
  const { entries, stats, isLoading, error, refresh, deleteEntries, exportToJson } = useHistory({
    filter: { limit: 100 },
    autoRefresh: true,
  });

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter(entry => entry.type === filter);
  }, [entries, filter]);

  const groupedHistory = groupByDate(filteredEntries);

  return (
    <div className="flex flex-col h-full">
      {/* Stats Bar */}
      {stats && (
        <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 text-xs text-muted-foreground">
          <span>{stats.totalEntries} entries</span>
          <span>{stats.totalSessions} sessions</span>
          <span>{stats.successRate}% success</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-border">
        {(['all', 'command', 'action', 'response', 'error'] as FilterType[]).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              filter === type
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center h-32 text-red-500">
            <span>{error}</span>
            <button onClick={refresh} className="mt-2 text-sm text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-muted-foreground">Loading history...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <HistoryIcon className="w-8 h-8 mb-2" />
            <span>No history yet</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(groupedHistory).map(([date, groupEntries]) => (
              <div key={date}>
                <div className="sticky top-0 bg-muted/50 backdrop-blur-sm px-4 py-2">
                  <span className="text-xs font-medium text-muted-foreground">{date}</span>
                </div>
                {groupEntries.map((entry) => (
                  <HistoryItem key={entry.id} entry={entry} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {entries.length > 0 && (
        <div className="p-4 border-t border-border flex gap-2">
          <button
            onClick={async () => {
              const json = await exportToJson();
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `mirmirops-history-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex-1 btn-secondary text-sm"
          >
            Export
          </button>
          <button
            onClick={() => {
              if (confirm('Clear all history?')) {
                deleteEntries({});
              }
            }}
            className="flex-1 btn-secondary text-sm text-red-600 hover:bg-red-50"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

function groupByDate(historyEntries: HistoryEntry[]): Record<string, HistoryEntry[]> {
  const groups: Record<string, HistoryEntry[]> = {};
  
  for (const entry of historyEntries) {
    const date = new Date(entry.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dateKey: string;
    if (date.toDateString() === today.toDateString()) {
      dateKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = 'Yesterday';
    } else {
      dateKey = date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(entry);
  }
  
  return groups;
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
