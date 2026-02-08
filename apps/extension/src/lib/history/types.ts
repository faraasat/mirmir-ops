// History System Types

export interface Session {
  id: string;
  startedAt: number;
  endedAt?: number;
  commandCount: number;
  actionCount: number;
  successCount: number;
  errorCount: number;
  urls: string[];
  summary?: string;
}

export interface HistoryEntry {
  id: string;
  sessionId: string;
  timestamp: number;
  type: HistoryEntryType;
  
  // Command data
  command?: {
    input: string;
    intent?: string;
    confidence?: number;
  };
  
  // Action data
  action?: {
    type: string;
    target?: string;
    parameters?: Record<string, unknown>;
    permissionTier?: number;
  };
  
  // Result data
  result?: {
    success: boolean;
    data?: unknown;
    error?: string;
    duration?: number;
  };
  
  // Context
  context?: {
    url: string;
    title: string;
    tabId?: number;
  };
  
  // LLM data
  llm?: {
    provider: string;
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    response?: string;
  };
  
  // Tags for filtering
  tags?: string[];
}

export type HistoryEntryType = 
  | 'command'      // User input
  | 'action'       // Agent action
  | 'response'     // LLM response
  | 'error'        // Error occurred
  | 'workflow'     // Workflow execution
  | 'navigation';  // Page navigation

export interface HistoryFilter {
  sessionId?: string;
  type?: HistoryEntryType | HistoryEntryType[];
  startDate?: number;
  endDate?: number;
  url?: string;
  searchText?: string;
  tags?: string[];
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface HistoryStats {
  totalEntries: number;
  totalSessions: number;
  commandsToday: number;
  actionsToday: number;
  successRate: number;
  mostVisitedUrls: Array<{ url: string; count: number }>;
  mostUsedActions: Array<{ action: string; count: number }>;
  tokenUsage: {
    total: number;
    byProvider: Record<string, number>;
  };
}

export interface ExportOptions {
  format: 'json' | 'csv';
  filter?: HistoryFilter;
  includeSessions?: boolean;
}
