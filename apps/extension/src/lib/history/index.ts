// History module exports

export * from './types';
export { getHistoryDatabase, clearHistoryDatabase, exportDatabase, importDatabase, getDatabaseSize } from './database';
export {
  startSession,
  getCurrentSession,
  endSession,
  getSession,
  getRecentSessions,
  deleteOldSessions,
  getSessionSummary,
} from './session';
export {
  addHistoryEntry,
  logCommand,
  logAction,
  logLLMResponse,
  logNavigation,
  queryHistory,
  getHistoryEntry,
  deleteHistoryEntry,
  deleteHistoryEntries,
  getHistoryStats,
  exportHistory,
} from './entries';
export {
  initializeHistoryCleanup,
  getRetentionSettings,
  updateRetentionSettings,
  runHistoryCleanup,
  shouldExcludeUrl,
  addExcludedDomain,
  removeExcludedDomain,
  addExcludedPattern,
  removeExcludedPattern,
  deleteHistoryForDomain,
  getHistoryStorageStats,
  type RetentionSettings,
} from './retention';
