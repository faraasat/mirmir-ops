// Analytics Tracker - Comprehensive usage analytics tracking

import browser from 'webextension-polyfill';

/**
 * Analytics event types
 */
export type AnalyticsEventType =
  | 'llm_request'
  | 'llm_response'
  | 'voice_command'
  | 'action_executed'
  | 'workflow_run'
  | 'cross_site_task'
  | 'shadow_tab_created'
  | 'form_filled'
  | 'data_extracted'
  | 'permission_granted'
  | 'permission_denied'
  | 'error';

/**
 * Analytics event structure
 */
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: number;
  sessionId: string;
  data: {
    // LLM specific
    provider?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    latencyMs?: number;
    cost?: number;
    
    // Action specific
    actionType?: string;
    success?: boolean;
    errorMessage?: string;
    domain?: string;
    
    // Voice specific
    transcript?: string;
    confidence?: number;
    
    // Workflow specific
    workflowId?: string;
    stepCount?: number;
    
    // Cross-site specific
    siteCount?: number;
    
    // Generic
    durationMs?: number;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Daily analytics summary
 */
export interface DailyAnalytics {
  date: string; // YYYY-MM-DD
  llmRequests: number;
  llmTokensUsed: number;
  llmCost: number;
  voiceCommands: number;
  actionsExecuted: number;
  workflowsRun: number;
  errorsCount: number;
  avgLatencyMs: number;
  topActions: Record<string, number>;
  topDomains: Record<string, number>;
  topModels: Record<string, number>;
}

/**
 * Session analytics
 */
export interface SessionAnalytics {
  sessionId: string;
  startedAt: number;
  endedAt?: number;
  eventCount: number;
  llmRequests: number;
  actionsExecuted: number;
  errors: number;
}

/**
 * Token cost rates (per 1M tokens)
 */
const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4': { input: 30, output: 60 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4o': { input: 5, output: 15 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  
  // Anthropic
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3.5-sonnet': { input: 3, output: 15 },
  
  // Local/Free
  'webllm': { input: 0, output: 0 },
  'ollama': { input: 0, output: 0 },
};

// Storage keys
const ANALYTICS_EVENTS_KEY = 'analytics_events';
const ANALYTICS_DAILY_KEY = 'analytics_daily';
const ANALYTICS_SESSION_KEY = 'analytics_session';

// Current session
let currentSessionId: string | null = null;
let eventBuffer: AnalyticsEvent[] = [];
const BUFFER_FLUSH_SIZE = 10;
const BUFFER_FLUSH_INTERVAL = 30000; // 30 seconds

/**
 * Initialize the analytics tracker
 */
export function initializeAnalytics(): void {
  currentSessionId = generateSessionId();
  
  // Set up periodic buffer flush
  setInterval(flushEventBuffer, BUFFER_FLUSH_INTERVAL);
  
  // Track session start
  trackEvent('action_executed', {
    actionType: 'session_start',
    success: true,
  });
  
  console.log('[Analytics] Initialized with session:', currentSessionId);
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Track an analytics event
 */
export function trackEvent(
  type: AnalyticsEventType,
  data: AnalyticsEvent['data']
): void {
  const event: AnalyticsEvent = {
    id: generateEventId(),
    type,
    timestamp: Date.now(),
    sessionId: currentSessionId || 'unknown',
    data,
  };
  
  eventBuffer.push(event);
  
  // Flush if buffer is full
  if (eventBuffer.length >= BUFFER_FLUSH_SIZE) {
    flushEventBuffer();
  }
}

/**
 * Track LLM request
 */
export function trackLLMRequest(params: {
  provider: string;
  model: string;
  inputTokens?: number;
}): void {
  trackEvent('llm_request', params);
}

/**
 * Track LLM response
 */
export function trackLLMResponse(params: {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}): void {
  const { provider, model, inputTokens, outputTokens, latencyMs, success, errorMessage } = params;
  
  // Calculate cost
  const cost = calculateTokenCost(model, inputTokens, outputTokens);
  
  trackEvent('llm_response', {
    provider,
    model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    latencyMs,
    cost,
    success,
    errorMessage,
  });
}

/**
 * Track voice command
 */
export function trackVoiceCommand(params: {
  transcript: string;
  confidence?: number;
  success: boolean;
  latencyMs?: number;
}): void {
  trackEvent('voice_command', params);
}

/**
 * Track action execution
 */
export function trackAction(params: {
  actionType: string;
  success: boolean;
  domain?: string;
  durationMs?: number;
  errorMessage?: string;
}): void {
  trackEvent('action_executed', params);
}

/**
 * Track workflow execution
 */
export function trackWorkflow(params: {
  workflowId: string;
  stepCount: number;
  success: boolean;
  durationMs: number;
  errorMessage?: string;
}): void {
  trackEvent('workflow_run', params);
}

/**
 * Track cross-site task
 */
export function trackCrossSiteTask(params: {
  siteCount: number;
  success: boolean;
  durationMs: number;
  errorMessage?: string;
}): void {
  trackEvent('cross_site_task', params);
}

/**
 * Track error
 */
export function trackError(params: {
  errorMessage: string;
  actionType?: string;
  domain?: string;
  metadata?: Record<string, unknown>;
}): void {
  trackEvent('error', {
    success: false,
    ...params,
  });
}

/**
 * Calculate token cost based on model
 */
export function calculateTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Find matching model cost
  const modelKey = Object.keys(TOKEN_COSTS).find(key => 
    model.toLowerCase().includes(key.toLowerCase())
  );
  
  if (!modelKey) {
    return 0; // Unknown model, assume free
  }
  
  const rates = TOKEN_COSTS[modelKey];
  const inputCost = (inputTokens / 1_000_000) * rates.input;
  const outputCost = (outputTokens / 1_000_000) * rates.output;
  
  return inputCost + outputCost;
}

/**
 * Flush event buffer to storage
 */
async function flushEventBuffer(): Promise<void> {
  if (eventBuffer.length === 0) return;
  
  const eventsToFlush = [...eventBuffer];
  eventBuffer = [];
  
  try {
    // Get existing events
    const result = await browser.storage.local.get(ANALYTICS_EVENTS_KEY);
    const existingEvents: AnalyticsEvent[] = result[ANALYTICS_EVENTS_KEY] || [];
    
    // Add new events
    const allEvents = [...existingEvents, ...eventsToFlush];
    
    // Keep only last 7 days of events
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentEvents = allEvents.filter(e => e.timestamp > cutoff);
    
    // Store events
    await browser.storage.local.set({
      [ANALYTICS_EVENTS_KEY]: recentEvents,
    });
    
    // Update daily analytics
    await updateDailyAnalytics(eventsToFlush);
    
  } catch (error) {
    // Put events back in buffer
    eventBuffer = [...eventsToFlush, ...eventBuffer];
    console.error('[Analytics] Failed to flush events:', error);
  }
}

/**
 * Update daily analytics from events
 */
async function updateDailyAnalytics(events: AnalyticsEvent[]): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get existing daily analytics
  const result = await browser.storage.local.get(ANALYTICS_DAILY_KEY);
  const dailyData: Record<string, DailyAnalytics> = result[ANALYTICS_DAILY_KEY] || {};
  
  // Initialize today's data if not present
  if (!dailyData[today]) {
    dailyData[today] = {
      date: today,
      llmRequests: 0,
      llmTokensUsed: 0,
      llmCost: 0,
      voiceCommands: 0,
      actionsExecuted: 0,
      workflowsRun: 0,
      errorsCount: 0,
      avgLatencyMs: 0,
      topActions: {},
      topDomains: {},
      topModels: {},
    };
  }
  
  const todayData = dailyData[today];
  let totalLatency = todayData.avgLatencyMs * todayData.llmRequests;
  
  // Process events
  for (const event of events) {
    switch (event.type) {
      case 'llm_response':
        todayData.llmRequests++;
        todayData.llmTokensUsed += event.data.totalTokens || 0;
        todayData.llmCost += event.data.cost || 0;
        if (event.data.latencyMs) {
          totalLatency += event.data.latencyMs;
        }
        if (event.data.model) {
          todayData.topModels[event.data.model] = (todayData.topModels[event.data.model] || 0) + 1;
        }
        break;
        
      case 'voice_command':
        todayData.voiceCommands++;
        break;
        
      case 'action_executed':
        todayData.actionsExecuted++;
        if (event.data.actionType) {
          todayData.topActions[event.data.actionType] = (todayData.topActions[event.data.actionType] || 0) + 1;
        }
        if (event.data.domain) {
          todayData.topDomains[event.data.domain] = (todayData.topDomains[event.data.domain] || 0) + 1;
        }
        break;
        
      case 'workflow_run':
        todayData.workflowsRun++;
        break;
        
      case 'error':
        todayData.errorsCount++;
        break;
    }
  }
  
  // Update average latency
  if (todayData.llmRequests > 0) {
    todayData.avgLatencyMs = totalLatency / todayData.llmRequests;
  }
  
  // Store updated data
  await browser.storage.local.set({
    [ANALYTICS_DAILY_KEY]: dailyData,
  });
}

/**
 * Get analytics for a date range
 */
export async function getAnalytics(
  startDate: string,
  endDate: string
): Promise<DailyAnalytics[]> {
  const result = await browser.storage.local.get(ANALYTICS_DAILY_KEY);
  const dailyData: Record<string, DailyAnalytics> = result[ANALYTICS_DAILY_KEY] || {};
  
  const analytics: DailyAnalytics[] = [];
  
  // Get all dates in range
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    if (dailyData[dateStr]) {
      analytics.push(dailyData[dateStr]);
    }
  }
  
  return analytics;
}

/**
 * Get today's analytics
 */
export async function getTodayAnalytics(): Promise<DailyAnalytics | null> {
  const today = new Date().toISOString().split('T')[0];
  const result = await browser.storage.local.get(ANALYTICS_DAILY_KEY);
  const dailyData: Record<string, DailyAnalytics> = result[ANALYTICS_DAILY_KEY] || {};
  
  return dailyData[today] || null;
}

/**
 * Get analytics summary for last N days
 */
export async function getAnalyticsSummary(days: number = 7): Promise<{
  totalLLMRequests: number;
  totalTokensUsed: number;
  totalCost: number;
  totalVoiceCommands: number;
  totalActions: number;
  totalWorkflows: number;
  totalErrors: number;
  avgLatencyMs: number;
  topActions: [string, number][];
  topDomains: [string, number][];
  topModels: [string, number][];
  dailyTrend: DailyAnalytics[];
}> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const dailyTrend = await getAnalytics(
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );
  
  // Aggregate
  let totalLLMRequests = 0;
  let totalTokensUsed = 0;
  let totalCost = 0;
  let totalVoiceCommands = 0;
  let totalActions = 0;
  let totalWorkflows = 0;
  let totalErrors = 0;
  let totalLatency = 0;
  const allActions: Record<string, number> = {};
  const allDomains: Record<string, number> = {};
  const allModels: Record<string, number> = {};
  
  for (const day of dailyTrend) {
    totalLLMRequests += day.llmRequests;
    totalTokensUsed += day.llmTokensUsed;
    totalCost += day.llmCost;
    totalVoiceCommands += day.voiceCommands;
    totalActions += day.actionsExecuted;
    totalWorkflows += day.workflowsRun;
    totalErrors += day.errorsCount;
    totalLatency += day.avgLatencyMs * day.llmRequests;
    
    for (const [action, count] of Object.entries(day.topActions)) {
      allActions[action] = (allActions[action] || 0) + count;
    }
    for (const [domain, count] of Object.entries(day.topDomains)) {
      allDomains[domain] = (allDomains[domain] || 0) + count;
    }
    for (const [model, count] of Object.entries(day.topModels)) {
      allModels[model] = (allModels[model] || 0) + count;
    }
  }
  
  // Sort and get top 10
  const sortByCount = (obj: Record<string, number>): [string, number][] => 
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 10);
  
  return {
    totalLLMRequests,
    totalTokensUsed,
    totalCost,
    totalVoiceCommands,
    totalActions,
    totalWorkflows,
    totalErrors,
    avgLatencyMs: totalLLMRequests > 0 ? totalLatency / totalLLMRequests : 0,
    topActions: sortByCount(allActions),
    topDomains: sortByCount(allDomains),
    topModels: sortByCount(allModels),
    dailyTrend,
  };
}

/**
 * Get recent events
 */
export async function getRecentEvents(limit: number = 50): Promise<AnalyticsEvent[]> {
  const result = await browser.storage.local.get(ANALYTICS_EVENTS_KEY);
  const events: AnalyticsEvent[] = result[ANALYTICS_EVENTS_KEY] || [];
  
  return events.slice(-limit).reverse();
}

/**
 * Clear analytics data
 */
export async function clearAnalytics(): Promise<void> {
  await browser.storage.local.remove([
    ANALYTICS_EVENTS_KEY,
    ANALYTICS_DAILY_KEY,
    ANALYTICS_SESSION_KEY,
  ]);
}

/**
 * Export analytics data
 */
export async function exportAnalytics(): Promise<{
  events: AnalyticsEvent[];
  daily: Record<string, DailyAnalytics>;
  exportedAt: number;
}> {
  const eventsResult = await browser.storage.local.get(ANALYTICS_EVENTS_KEY);
  const dailyResult = await browser.storage.local.get(ANALYTICS_DAILY_KEY);
  
  return {
    events: eventsResult[ANALYTICS_EVENTS_KEY] || [],
    daily: dailyResult[ANALYTICS_DAILY_KEY] || {},
    exportedAt: Date.now(),
  };
}
