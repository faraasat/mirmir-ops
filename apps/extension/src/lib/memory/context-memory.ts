// Context Memory - Short-term and conversation context management

import browser from 'webextension-polyfill';

/**
 * Conversation message
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    intent?: string;
    action?: string;
    actionResult?: unknown;
    domain?: string;
    tokens?: number;
  };
}

/**
 * Conversation session
 */
export interface ConversationSession {
  id: string;
  messages: ConversationMessage[];
  startedAt: number;
  lastMessageAt: number;
  summary?: string;
  context: {
    activeDomain?: string;
    activeUrl?: string;
    currentTask?: string;
    pendingActions?: string[];
    userGoal?: string;
  };
}

/**
 * Short-term context
 */
export interface ShortTermContext {
  recentPages: Array<{
    url: string;
    title: string;
    visitedAt: number;
  }>;
  recentSearches: Array<{
    query: string;
    timestamp: number;
  }>;
  recentActions: Array<{
    action: string;
    params?: Record<string, unknown>;
    timestamp: number;
  }>;
  clipboardHistory: Array<{
    content: string;
    timestamp: number;
  }>;
  activeTask?: {
    description: string;
    steps: string[];
    currentStep: number;
    startedAt: number;
  };
}

// Storage keys
const SESSIONS_KEY = 'conversation_sessions';
const CURRENT_SESSION_KEY = 'current_session_id';
const SHORT_TERM_KEY = 'short_term_context';

// Configuration
const MAX_MESSAGES_PER_SESSION = 100;
const MAX_SESSIONS = 50;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_SHORT_TERM_ITEMS = 20;

// Current session cache
let currentSession: ConversationSession | null = null;

/**
 * Initialize context memory
 */
export async function initializeContextMemory(): Promise<void> {
  await loadCurrentSession();
  console.log('[ContextMemory] Initialized');
}

/**
 * Load the current session
 */
async function loadCurrentSession(): Promise<void> {
  const result = await browser.storage.local.get([SESSIONS_KEY, CURRENT_SESSION_KEY]);
  const sessions: ConversationSession[] = result[SESSIONS_KEY] || [];
  const currentId: string | undefined = result[CURRENT_SESSION_KEY];
  
  if (currentId) {
    const session = sessions.find(s => s.id === currentId);
    if (session && (Date.now() - session.lastMessageAt < SESSION_TIMEOUT)) {
      currentSession = session;
      return;
    }
  }
  
  // Start a new session
  currentSession = null;
}

/**
 * Get or create current session
 */
export async function getCurrentSession(): Promise<ConversationSession> {
  if (!currentSession) {
    currentSession = await createNewSession();
  } else if (Date.now() - currentSession.lastMessageAt > SESSION_TIMEOUT) {
    // Session timed out, start a new one
    currentSession = await createNewSession();
  }
  
  return currentSession;
}

/**
 * Create a new conversation session
 */
export async function createNewSession(): Promise<ConversationSession> {
  const now = Date.now();
  
  const session: ConversationSession = {
    id: `session_${now}_${Math.random().toString(36).slice(2, 8)}`,
    messages: [],
    startedAt: now,
    lastMessageAt: now,
    context: {},
  };
  
  currentSession = session;
  await saveCurrentSession();
  
  return session;
}

/**
 * Save the current session
 */
async function saveCurrentSession(): Promise<void> {
  if (!currentSession) return;
  
  const result = await browser.storage.local.get(SESSIONS_KEY);
  const sessions: ConversationSession[] = result[SESSIONS_KEY] || [];
  
  // Update or add session
  const existingIndex = sessions.findIndex(s => s.id === currentSession!.id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = currentSession;
  } else {
    sessions.unshift(currentSession);
  }
  
  // Limit number of sessions
  const trimmedSessions = sessions.slice(0, MAX_SESSIONS);
  
  await browser.storage.local.set({
    [SESSIONS_KEY]: trimmedSessions,
    [CURRENT_SESSION_KEY]: currentSession.id,
  });
}

/**
 * Add a message to the current session
 */
export async function addMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: ConversationMessage['metadata']
): Promise<ConversationMessage> {
  const session = await getCurrentSession();
  const now = Date.now();
  
  const message: ConversationMessage = {
    id: `msg_${now}_${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: now,
    metadata,
  };
  
  session.messages.push(message);
  session.lastMessageAt = now;
  
  // Trim old messages if needed
  if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
    // Summarize old messages before removing
    const oldMessages = session.messages.slice(0, session.messages.length - MAX_MESSAGES_PER_SESSION + 10);
    session.summary = summarizeMessages(oldMessages, session.summary);
    session.messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION + 10);
  }
  
  await saveCurrentSession();
  return message;
}

/**
 * Get recent messages from current session
 */
export async function getRecentMessages(limit: number = 20): Promise<ConversationMessage[]> {
  const session = await getCurrentSession();
  return session.messages.slice(-limit);
}

/**
 * Get full conversation context for LLM
 */
export async function getConversationContext(
  maxMessages: number = 20
): Promise<{
  messages: ConversationMessage[];
  summary?: string;
  context: ConversationSession['context'];
}> {
  const session = await getCurrentSession();
  
  return {
    messages: session.messages.slice(-maxMessages),
    summary: session.summary,
    context: session.context,
  };
}

/**
 * Update session context
 */
export async function updateSessionContext(
  context: Partial<ConversationSession['context']>
): Promise<void> {
  const session = await getCurrentSession();
  session.context = { ...session.context, ...context };
  await saveCurrentSession();
}

/**
 * Get all sessions
 */
export async function getAllSessions(): Promise<ConversationSession[]> {
  const result = await browser.storage.local.get(SESSIONS_KEY);
  return result[SESSIONS_KEY] || [];
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const result = await browser.storage.local.get(SESSIONS_KEY);
  const sessions: ConversationSession[] = result[SESSIONS_KEY] || [];
  
  const filtered = sessions.filter(s => s.id !== sessionId);
  
  await browser.storage.local.set({ [SESSIONS_KEY]: filtered });
  
  if (currentSession?.id === sessionId) {
    currentSession = null;
  }
}

/**
 * Summarize messages for context compression
 */
function summarizeMessages(
  messages: ConversationMessage[],
  existingSummary?: string
): string {
  const parts: string[] = [];
  
  if (existingSummary) {
    parts.push(`Previous context: ${existingSummary}`);
  }
  
  // Group messages by topic/intent
  const intents = new Set<string>();
  const actions = new Set<string>();
  
  for (const msg of messages) {
    if (msg.metadata?.intent) intents.add(msg.metadata.intent);
    if (msg.metadata?.action) actions.add(msg.metadata.action);
  }
  
  if (intents.size > 0) {
    parts.push(`Topics discussed: ${[...intents].join(', ')}`);
  }
  
  if (actions.size > 0) {
    parts.push(`Actions performed: ${[...actions].join(', ')}`);
  }
  
  // Extract key information from user messages
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.slice(0, 100));
  
  if (userMessages.length > 0) {
    parts.push(`User queries: ${userMessages.slice(-3).join('; ')}`);
  }
  
  return parts.join('. ');
}

// ============================================
// Short-Term Context
// ============================================

/**
 * Get short-term context
 */
export async function getShortTermContext(): Promise<ShortTermContext> {
  const result = await browser.storage.local.get(SHORT_TERM_KEY);
  return result[SHORT_TERM_KEY] || {
    recentPages: [],
    recentSearches: [],
    recentActions: [],
    clipboardHistory: [],
  };
}

/**
 * Save short-term context
 */
async function saveShortTermContext(context: ShortTermContext): Promise<void> {
  await browser.storage.local.set({ [SHORT_TERM_KEY]: context });
}

/**
 * Record page visit
 */
export async function recordPageVisit(url: string, title: string): Promise<void> {
  const context = await getShortTermContext();
  
  // Remove duplicate
  context.recentPages = context.recentPages.filter(p => p.url !== url);
  
  // Add new
  context.recentPages.unshift({
    url,
    title,
    visitedAt: Date.now(),
  });
  
  // Trim
  context.recentPages = context.recentPages.slice(0, MAX_SHORT_TERM_ITEMS);
  
  await saveShortTermContext(context);
}

/**
 * Record search
 */
export async function recordSearch(query: string): Promise<void> {
  const context = await getShortTermContext();
  
  context.recentSearches.unshift({
    query,
    timestamp: Date.now(),
  });
  
  context.recentSearches = context.recentSearches.slice(0, MAX_SHORT_TERM_ITEMS);
  
  await saveShortTermContext(context);
}

/**
 * Record action
 */
export async function recordAction(
  action: string,
  params?: Record<string, unknown>
): Promise<void> {
  const context = await getShortTermContext();
  
  context.recentActions.unshift({
    action,
    params,
    timestamp: Date.now(),
  });
  
  context.recentActions = context.recentActions.slice(0, MAX_SHORT_TERM_ITEMS);
  
  await saveShortTermContext(context);
}

/**
 * Add to clipboard history
 */
export async function addToClipboardHistory(content: string): Promise<void> {
  const context = await getShortTermContext();
  
  // Avoid duplicates
  context.clipboardHistory = context.clipboardHistory.filter(
    c => c.content !== content
  );
  
  context.clipboardHistory.unshift({
    content,
    timestamp: Date.now(),
  });
  
  context.clipboardHistory = context.clipboardHistory.slice(0, 10);
  
  await saveShortTermContext(context);
}

/**
 * Start a task
 */
export async function startTask(
  description: string,
  steps: string[]
): Promise<void> {
  const context = await getShortTermContext();
  
  context.activeTask = {
    description,
    steps,
    currentStep: 0,
    startedAt: Date.now(),
  };
  
  await saveShortTermContext(context);
  await updateSessionContext({ currentTask: description });
}

/**
 * Advance task to next step
 */
export async function advanceTask(): Promise<boolean> {
  const context = await getShortTermContext();
  
  if (!context.activeTask) return false;
  
  context.activeTask.currentStep++;
  
  if (context.activeTask.currentStep >= context.activeTask.steps.length) {
    // Task complete
    context.activeTask = undefined;
    await updateSessionContext({ currentTask: undefined });
    await saveShortTermContext(context);
    return true;
  }
  
  await saveShortTermContext(context);
  return false;
}

/**
 * Complete current task
 */
export async function completeTask(): Promise<void> {
  const context = await getShortTermContext();
  context.activeTask = undefined;
  await saveShortTermContext(context);
  await updateSessionContext({ currentTask: undefined });
}

/**
 * Get current task
 */
export async function getCurrentTask(): Promise<ShortTermContext['activeTask']> {
  const context = await getShortTermContext();
  return context.activeTask;
}

/**
 * Clear short-term context
 */
export async function clearShortTermContext(): Promise<void> {
  await browser.storage.local.remove(SHORT_TERM_KEY);
}

/**
 * Clear all context memory
 */
export async function clearAllContextMemory(): Promise<void> {
  currentSession = null;
  await browser.storage.local.remove([
    SESSIONS_KEY,
    CURRENT_SESSION_KEY,
    SHORT_TERM_KEY,
  ]);
}

// ============================================
// Context Building
// ============================================

/**
 * Build complete context for LLM prompt
 */
export async function buildLLMContext(): Promise<{
  systemContext: string;
  conversationHistory: ConversationMessage[];
  recentContext: string;
}> {
  const session = await getCurrentSession();
  const shortTerm = await getShortTermContext();
  
  // Build system context
  const contextParts: string[] = [];
  
  if (session.context.activeDomain) {
    contextParts.push(`Current domain: ${session.context.activeDomain}`);
  }
  
  if (session.context.userGoal) {
    contextParts.push(`User's goal: ${session.context.userGoal}`);
  }
  
  if (shortTerm.activeTask) {
    contextParts.push(`Active task: ${shortTerm.activeTask.description}`);
    contextParts.push(`Current step (${shortTerm.activeTask.currentStep + 1}/${shortTerm.activeTask.steps.length}): ${shortTerm.activeTask.steps[shortTerm.activeTask.currentStep]}`);
  }
  
  // Build recent context
  const recentParts: string[] = [];
  
  if (shortTerm.recentPages.length > 0) {
    const pages = shortTerm.recentPages.slice(0, 3).map(p => p.title).join(', ');
    recentParts.push(`Recent pages: ${pages}`);
  }
  
  if (shortTerm.recentSearches.length > 0) {
    const searches = shortTerm.recentSearches.slice(0, 3).map(s => s.query).join(', ');
    recentParts.push(`Recent searches: ${searches}`);
  }
  
  if (shortTerm.recentActions.length > 0) {
    const actions = shortTerm.recentActions.slice(0, 3).map(a => a.action).join(', ');
    recentParts.push(`Recent actions: ${actions}`);
  }
  
  return {
    systemContext: contextParts.join('\n'),
    conversationHistory: session.messages.slice(-20),
    recentContext: recentParts.join('\n'),
  };
}
