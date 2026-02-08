// Workflow System Types

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  steps: WorkflowStep[];
  trigger?: WorkflowTrigger;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  
  // Stats
  runCount: number;
  successCount: number;
  lastRunAt?: number;
  averageDuration?: number;
  
  // Settings
  settings?: WorkflowSettings;
  
  // Tags for organization
  tags?: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  
  // Action to perform
  action: StepAction;
  
  // Control flow
  conditions?: StepCondition[];
  onSuccess?: string; // next step id, or 'end'
  onFailure?: string; // step id, 'retry', 'skip', or 'abort'
  
  // Options
  retryCount?: number;
  retryDelay?: number; // ms
  timeout?: number; // ms
  waitAfter?: number; // ms
  
  // Variables
  inputMapping?: Record<string, string>; // map workflow vars to step params
  outputMapping?: Record<string, string>; // map step result to workflow vars
}

export interface StepAction {
  type: ActionType;
  target?: string; // CSS selector or URL
  value?: unknown;
  parameters?: Record<string, unknown>;
}

export type ActionType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'fill'
  | 'select'
  | 'scroll'
  | 'wait'
  | 'extract'
  | 'screenshot'
  | 'assert'
  | 'llm'
  | 'custom';

export interface StepCondition {
  type: ConditionType;
  selector?: string;
  value?: unknown;
  operator?: 'equals' | 'contains' | 'matches' | 'exists' | 'visible';
  negate?: boolean;
}

export type ConditionType =
  | 'element-exists'
  | 'element-visible'
  | 'element-text'
  | 'url-matches'
  | 'variable-equals'
  | 'always';

export interface WorkflowTrigger {
  type: TriggerType;
  config: TriggerConfig;
  enabled: boolean;
}

export type TriggerType =
  | 'manual'
  | 'scheduled'
  | 'url-match'
  | 'keyboard-shortcut'
  | 'context-menu';

export interface TriggerConfig {
  // For scheduled
  cron?: string;
  timezone?: string;
  
  // For url-match
  urlPattern?: string;
  
  // For keyboard-shortcut
  shortcut?: string;
  
  // For context-menu
  menuTitle?: string;
  contexts?: string[];
}

export interface WorkflowSettings {
  runInBackground?: boolean;
  notifyOnComplete?: boolean;
  notifyOnError?: boolean;
  maxDuration?: number;
  continueOnError?: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  startedAt: number;
  endedAt?: number;
  status: ExecutionStatus;
  
  // Progress
  currentStepId?: string;
  completedSteps: string[];
  
  // Results
  variables: Record<string, unknown>;
  stepResults: Record<string, StepResult>;
  error?: string;
  
  // Context
  startUrl?: string;
  tabId?: number;
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface StepResult {
  stepId: string;
  status: 'success' | 'failure' | 'skipped';
  startedAt: number;
  endedAt: number;
  data?: unknown;
  error?: string;
  retryCount?: number;
}

export interface WorkflowFilter {
  tags?: string[];
  searchText?: string;
  triggerType?: TriggerType;
  hasSchedule?: boolean;
  limit?: number;
  offset?: number;
}
