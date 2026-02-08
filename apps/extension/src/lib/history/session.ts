// Session Management for History

import { v4 as uuid } from 'uuid';
import { getHistoryDatabase } from './database';
import type { Session } from './types';

// Current session state
let currentSession: Session | null = null;

/**
 * Start a new session
 */
export async function startSession(): Promise<Session> {
  // End current session if exists
  if (currentSession) {
    await endSession();
  }
  
  currentSession = {
    id: uuid(),
    startedAt: Date.now(),
    commandCount: 0,
    actionCount: 0,
    successCount: 0,
    errorCount: 0,
    urls: [],
  };
  
  const db = getHistoryDatabase();
  await db.sessions.add(currentSession);
  
  return currentSession;
}

/**
 * Get current session, starting one if needed
 */
export async function getCurrentSession(): Promise<Session> {
  if (!currentSession) {
    await startSession();
  }
  return currentSession!;
}

/**
 * End current session
 */
export async function endSession(): Promise<void> {
  if (!currentSession) return;
  
  currentSession.endedAt = Date.now();
  
  const db = getHistoryDatabase();
  await db.sessions.update(currentSession.id, {
    endedAt: currentSession.endedAt,
    commandCount: currentSession.commandCount,
    actionCount: currentSession.actionCount,
    successCount: currentSession.successCount,
    errorCount: currentSession.errorCount,
    urls: currentSession.urls,
  });
  
  currentSession = null;
}

/**
 * Update session stats
 */
export async function updateSessionStats(updates: {
  commandCount?: number;
  actionCount?: number;
  successCount?: number;
  errorCount?: number;
  url?: string;
}): Promise<void> {
  if (!currentSession) return;
  
  if (updates.commandCount !== undefined) {
    currentSession.commandCount += updates.commandCount;
  }
  if (updates.actionCount !== undefined) {
    currentSession.actionCount += updates.actionCount;
  }
  if (updates.successCount !== undefined) {
    currentSession.successCount += updates.successCount;
  }
  if (updates.errorCount !== undefined) {
    currentSession.errorCount += updates.errorCount;
  }
  if (updates.url && !currentSession.urls.includes(updates.url)) {
    currentSession.urls.push(updates.url);
  }
}

/**
 * Get session by ID
 */
export async function getSession(id: string): Promise<Session | undefined> {
  const db = getHistoryDatabase();
  return db.sessions.get(id);
}

/**
 * Get recent sessions
 */
export async function getRecentSessions(limit: number = 10): Promise<Session[]> {
  const db = getHistoryDatabase();
  return db.sessions
    .orderBy('startedAt')
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Delete old sessions (for retention policy)
 */
export async function deleteOldSessions(retentionDays: number): Promise<number> {
  if (retentionDays < 0) return 0; // -1 means keep forever
  
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const db = getHistoryDatabase();
  
  // Get sessions to delete
  const oldSessions = await db.sessions
    .where('startedAt')
    .below(cutoff)
    .toArray();
  
  const sessionIds = oldSessions.map(s => s.id);
  
  // Delete entries for those sessions
  await db.entries
    .where('sessionId')
    .anyOf(sessionIds)
    .delete();
  
  // Delete sessions
  await db.sessions
    .where('id')
    .anyOf(sessionIds)
    .delete();
  
  return sessionIds.length;
}

/**
 * Get session summary
 */
export function getSessionSummary(session: Session): string {
  const duration = session.endedAt 
    ? Math.round((session.endedAt - session.startedAt) / 60000)
    : Math.round((Date.now() - session.startedAt) / 60000);
  
  const successRate = session.actionCount > 0
    ? Math.round((session.successCount / session.actionCount) * 100)
    : 100;
  
  return `${session.commandCount} commands, ${session.actionCount} actions (${successRate}% success), ${duration} min`;
}
