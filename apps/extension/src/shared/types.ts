// Core types for MirmirOps

// ============================================
// Subscription and Usage Types
// ============================================

export type PlanType = 'free' | 'pro' | 'enterprise';

export interface PlanLimits {
  cloudLlmRequests: number;  // per month, -1 for unlimited
  byokRequests: number;       // per month, -1 for unlimited
  voiceCommands: number;      // per day, -1 for unlimited
  shadowTabs: number;         // concurrent
  workflowTemplates: number;  // saved, -1 for unlimited
  scheduledWorkflows: number; // active, -1 for unlimited
  historyRetentionDays: number;
  semanticMemoryEntries: number; // -1 for unlimited
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    cloudLlmRequests: 50,
    byokRequests: 100,
    voiceCommands: 20,
    shadowTabs: 2,
    workflowTemplates: 3,
    scheduledWorkflows: 0,
    historyRetentionDays: 7,
    semanticMemoryEntries: 1000,
  },
  pro: {
    cloudLlmRequests: 2000,
    byokRequests: -1,
    voiceCommands: -1,
    shadowTabs: 6,
    workflowTemplates: -1,
    scheduledWorkflows: 5,
    historyRetentionDays: 90,
    semanticMemoryEntries: 50000,
  },
  enterprise: {
    cloudLlmRequests: -1,
    byokRequests: -1,
    voiceCommands: -1,
    shadowTabs: -1,
    workflowTemplates: -1,
    scheduledWorkflows: -1,
    historyRetentionDays: -1,
    semanticMemoryEntries: -1,
  },
};

export interface UsageStats {
  cloudLlmRequests: number;
  byokRequests: number;
  voiceCommands: number;
  activeShadowTabs: number;
  savedWorkflows: number;
  activeScheduledWorkflows: number;
  semanticMemoryUsed: number;
  lastSyncedAt: number;
}

// ============================================
// Permission Types (Web Agent API Tiers)
// ============================================

export type PermissionTier = 'passive' | 'read-only' | 'mutable-safe' | 'mutable-critical';

export interface Permission {
  tier: PermissionTier;
  action: string;
  domain: string;
  grantedAt: number;
  expiresAt?: number;
}

// ============================================
// LLM Types
// ============================================

export type LLMProvider = 'webllm' | 'openai' | 'anthropic' | 'ollama' | 'byok';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: LLMProvider;
  model: string;
  finishReason?: string;
}

// ============================================
// Intent and Command Types
// ============================================

export interface ParsedIntent {
  action: string;
  target?: string;
  parameters: Record<string, unknown>;
  confidence: number;
  rawInput: string;
  entities: ExtractedEntity[];
}

export interface ExtractedEntity {
  type: 'url' | 'email' | 'date' | 'number' | 'selector' | 'text';
  value: string;
  start: number;
  end: number;
}

// ============================================
// Action Types
// ============================================

export type ActionType = 
  | 'navigate'
  | 'click'
  | 'type'
  | 'scroll'
  | 'extract'
  | 'wait'
  | 'screenshot'
  | 'copy'
  | 'paste'
  | 'select'
  | 'hover'
  | 'fill-form'
  | 'submit'
  | 'download';

export interface Action {
  id: string;
  type: ActionType;
  target?: string;
  value?: unknown;
  options?: Record<string, unknown>;
  permissionTier: PermissionTier;
}

export interface ActionResult {
  actionId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
  timestamp: number;
}

// ============================================
// History Types
// ============================================

export interface HistoryEntry {
  id: string;
  sessionId: string;
  timestamp: number;
  type: 'command' | 'action' | 'response' | 'error';
  data: {
    input?: string;
    intent?: ParsedIntent;
    action?: Action;
    result?: ActionResult;
    response?: string;
    error?: string;
  };
  url?: string;
  tabId?: number;
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt?: number;
  commandCount: number;
  actionCount: number;
  successRate: number;
  urls: string[];
}

// ============================================
// Workflow Types
// ============================================

export interface WorkflowStep {
  id: string;
  action: Action;
  conditions?: WorkflowCondition[];
  onSuccess?: string; // next step id
  onFailure?: string; // step id or 'abort'
  retryCount?: number;
  timeout?: number;
}

export interface WorkflowCondition {
  type: 'element-exists' | 'element-visible' | 'url-matches' | 'text-contains';
  selector?: string;
  value?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  trigger?: WorkflowTrigger;
  createdAt: number;
  updatedAt: number;
  runCount: number;
  lastRunAt?: number;
}

export interface WorkflowTrigger {
  type: 'manual' | 'scheduled' | 'url-match' | 'shortcut';
  config: Record<string, unknown>;
}

// ============================================
// Message Types (Background <-> Content/UI)
// ============================================

export type MessageType =
  | 'EXECUTE_ACTION'
  | 'EXTRACT_DATA'
  | 'GET_PAGE_CONTEXT'
  | 'LLM_REQUEST'
  | 'VOICE_COMMAND'
  | 'SAVE_HISTORY'
  | 'GET_HISTORY'
  | 'SAVE_WORKFLOW'
  | 'RUN_WORKFLOW'
  | 'CHECK_PERMISSION'
  | 'REQUEST_PERMISSION'
  | 'SYNC_USAGE'
  | 'GET_LIMITS'
  // Cross-site orchestration
  | 'CREATE_SHADOW_TAB'
  | 'CLOSE_SHADOW_TAB'
  | 'GET_SHADOW_TABS'
  | 'EXECUTE_CROSS_SITE_TASK'
  | 'COMPARE_PRICES'
  | 'SCRAPE_SITES';

export interface Message<T = unknown> {
  type: MessageType;
  payload: T;
  tabId?: number;
  timestamp: number;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Storage Types
// ============================================

export interface StorageData {
  user?: {
    id: string;
    email: string;
    plan: PlanType;
    token?: string;
  };
  settings: UserSettings;
  usage: UsageStats;
  permissions: Permission[];
}

export interface UserSettings {
  defaultLLMProvider: LLMProvider;
  defaultModel: string;
  voiceEnabled: boolean;
  voiceLanguage: string;
  voiceFeedbackEnabled: boolean; // TTS for agent responses
  voiceAutoSubmit: boolean; // Auto-submit voice commands
  voiceRate: number; // TTS speaking rate
  voicePitch: number; // TTS pitch
  historyEnabled: boolean;
  analyticsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  apiKeys: Partial<Record<LLMProvider, string>>;
}

export const DEFAULT_SETTINGS: UserSettings = {
  defaultLLMProvider: 'webllm',
  defaultModel: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
  voiceEnabled: true,
  voiceLanguage: 'en-US',
  voiceFeedbackEnabled: true,
  voiceAutoSubmit: true,
  voiceRate: 1.0,
  voicePitch: 1.0,
  historyEnabled: true,
  analyticsEnabled: false,
  theme: 'system',
  apiKeys: {},
};
