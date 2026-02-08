// History Database using Dexie (IndexedDB wrapper)

import Dexie, { type Table } from 'dexie';
import type { Session, HistoryEntry } from './types';

export class HistoryDatabase extends Dexie {
  sessions!: Table<Session, string>;
  entries!: Table<HistoryEntry, string>;

  constructor() {
    super('MirmirOpsHistory');
    
    this.version(1).stores({
      sessions: 'id, startedAt, endedAt',
      entries: 'id, sessionId, timestamp, type, [type+timestamp], [sessionId+timestamp], *tags',
    });
  }
}

// Singleton database instance
let db: HistoryDatabase | null = null;

export function getHistoryDatabase(): HistoryDatabase {
  if (!db) {
    db = new HistoryDatabase();
  }
  return db;
}

/**
 * Clear all history data
 */
export async function clearHistoryDatabase(): Promise<void> {
  const database = getHistoryDatabase();
  await database.sessions.clear();
  await database.entries.clear();
}

/**
 * Export database for backup
 */
export async function exportDatabase(): Promise<{
  sessions: Session[];
  entries: HistoryEntry[];
}> {
  const database = getHistoryDatabase();
  const [sessions, entries] = await Promise.all([
    database.sessions.toArray(),
    database.entries.toArray(),
  ]);
  
  return { sessions, entries };
}

/**
 * Import database from backup
 */
export async function importDatabase(data: {
  sessions: Session[];
  entries: HistoryEntry[];
}): Promise<void> {
  const database = getHistoryDatabase();
  
  await database.transaction('rw', [database.sessions, database.entries], async () => {
    await database.sessions.bulkPut(data.sessions);
    await database.entries.bulkPut(data.entries);
  });
}

/**
 * Get database size
 */
export async function getDatabaseSize(): Promise<number> {
  const database = getHistoryDatabase();
  const [sessionCount, entryCount] = await Promise.all([
    database.sessions.count(),
    database.entries.count(),
  ]);
  
  // Estimate size (rough calculation)
  return sessionCount * 500 + entryCount * 1000; // bytes
}
