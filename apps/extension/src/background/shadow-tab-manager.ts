// Shadow Tab Manager - Manages background tabs for cross-site orchestration
import browser from 'webextension-polyfill';
import { checkLimit, trackUsage } from './usage-tracker';
import { logAction } from '@/lib/history';

export interface ShadowTabOptions {
  taskId?: string;
  url: string;
  waitForLoad?: boolean;
  timeout?: number; // ms
  throttle?: 'low' | 'medium' | 'high';
  autoClose?: boolean; // Auto-close after task completion
  inheritCookies?: boolean;
}

export interface ShadowTab {
  id: number;
  url: string;
  taskId?: string;
  createdAt: number;
  status: 'loading' | 'ready' | 'executing' | 'completed' | 'error';
  throttleLevel: 'low' | 'medium' | 'high';
  autoClose: boolean;
  lastActivityAt: number;
  error?: string;
}

export interface ShadowTabResult {
  tabId: number;
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}

// Store shadow tabs in memory
const shadowTabs = new Map<number, ShadowTab>();
let activeShadowTabCount = 0;

// Constants
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_SHADOW_TABS = 10; // Safety limit
const CLEANUP_INTERVAL = 60000; // 1 minute

/**
 * Initialize shadow tab manager
 */
export function initializeShadowTabManager(): void {
  // Set up periodic cleanup
  setInterval(cleanupStaleShadowTabs, CLEANUP_INTERVAL);
  
  // Listen for tab removal to clean up shadow tabs
  browser.tabs.onRemoved.addListener((tabId) => {
    if (shadowTabs.has(tabId)) {
      removeShadowTab(tabId);
    }
  });
  
  console.log('[ShadowTabManager] Initialized');
}

/**
 * Create a new shadow tab for background operations
 */
export async function createShadowTab(options: ShadowTabOptions): Promise<ShadowTab> {
  const {
    url,
    taskId,
    waitForLoad = true,
    timeout = DEFAULT_TIMEOUT,
    throttle = 'medium',
    autoClose = true,
  } = options;
  
  // Check usage limits
  const withinLimits = await checkLimit('shadowTab');
  if (!withinLimits) {
    throw new Error('Shadow tab limit reached. Please upgrade your plan.');
  }
  
  // Safety check
  if (activeShadowTabCount >= MAX_SHADOW_TABS) {
    throw new Error('Maximum shadow tab limit reached. Close some tabs first.');
  }
  
  // Create the tab in the background
  const tab = await browser.tabs.create({
    url,
    active: false, // Create in background
    pinned: false,
  });
  
  if (!tab.id) {
    throw new Error('Failed to create shadow tab');
  }
  
  const shadowTab: ShadowTab = {
    id: tab.id,
    url,
    taskId,
    createdAt: Date.now(),
    status: 'loading',
    throttleLevel: throttle,
    autoClose,
    lastActivityAt: Date.now(),
  };
  
  shadowTabs.set(tab.id, shadowTab);
  activeShadowTabCount++;
  
  // Track usage
  await trackUsage('shadowTab', 'created');
  
  // Log the action
  await logAction(
    { type: 'shadow-tab-create', target: url },
    { success: true, data: { tabId: tab.id, taskId } },
    { url, title: 'Shadow Tab', tabId: tab.id }
  );
  
  // Apply throttling
  await applyThrottling(tab.id, throttle);
  
  // Wait for page to load if requested
  if (waitForLoad) {
    try {
      await waitForTabReady(tab.id, timeout);
      shadowTab.status = 'ready';
    } catch (error) {
      shadowTab.status = 'error';
      shadowTab.error = error instanceof Error ? error.message : 'Load timeout';
      throw error;
    }
  }
  
  return shadowTab;
}

/**
 * Close a shadow tab
 */
export async function closeShadowTab(tabId: number): Promise<void> {
  const shadowTab = shadowTabs.get(tabId);
  
  if (!shadowTab) {
    // Tab might not be a shadow tab, still try to close
    try {
      await browser.tabs.remove(tabId);
    } catch {
      // Tab might already be closed
    }
    return;
  }
  
  try {
    await browser.tabs.remove(tabId);
  } catch {
    // Tab might already be closed
  }
  
  removeShadowTab(tabId);
  
  await logAction(
    { type: 'shadow-tab-close', target: String(tabId) },
    { success: true },
    { url: shadowTab.url, title: 'Shadow Tab', tabId }
  );
}

/**
 * Remove shadow tab from tracking
 */
function removeShadowTab(tabId: number): void {
  if (shadowTabs.has(tabId)) {
    shadowTabs.delete(tabId);
    activeShadowTabCount = Math.max(0, activeShadowTabCount - 1);
  }
}

/**
 * Get a shadow tab by ID
 */
export function getShadowTab(tabId: number): ShadowTab | undefined {
  return shadowTabs.get(tabId);
}

/**
 * Get all shadow tabs
 */
export function getAllShadowTabs(): ShadowTab[] {
  return Array.from(shadowTabs.values());
}

/**
 * Get shadow tabs for a specific task
 */
export function getShadowTabsForTask(taskId: string): ShadowTab[] {
  return Array.from(shadowTabs.values()).filter(tab => tab.taskId === taskId);
}

/**
 * Get active shadow tab count
 */
export function getActiveShadowTabCount(): number {
  return activeShadowTabCount;
}

/**
 * Wait for a tab to be ready (page loaded)
 */
export function waitForTabReady(tabId: number, timeout: number = DEFAULT_TIMEOUT): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkTab = async () => {
      try {
        const tab = await browser.tabs.get(tabId);
        
        if (tab.status === 'complete') {
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error('Tab load timeout'));
          return;
        }
        
        // Check again in 100ms
        setTimeout(checkTab, 100);
      } catch (error) {
        reject(error);
      }
    };
    
    checkTab();
  });
}

/**
 * Apply throttling to a shadow tab
 */
async function applyThrottling(tabId: number, level: 'low' | 'medium' | 'high'): Promise<void> {
  // Throttling is implemented by managing how we interact with the tab
  // We can't directly throttle browser resources, but we can:
  // 1. Pause execution between actions
  // 2. Limit concurrent requests from the tab
  // 3. Use setTimeout delays in content scripts
  
  const shadowTab = shadowTabs.get(tabId);
  if (shadowTab) {
    shadowTab.throttleLevel = level;
  }
  
  // Send throttle config to content script
  try {
    await browser.tabs.sendMessage(tabId, {
      type: 'SET_THROTTLE',
      payload: { level },
      timestamp: Date.now(),
    });
  } catch {
    // Content script might not be ready yet
  }
}

/**
 * Execute an action in a shadow tab
 */
export async function executeInShadowTab(
  tabId: number,
  action: {
    type: string;
    target?: string;
    value?: unknown;
    options?: Record<string, unknown>;
  }
): Promise<ShadowTabResult> {
  const startTime = Date.now();
  const shadowTab = shadowTabs.get(tabId);
  
  if (!shadowTab) {
    return {
      tabId,
      success: false,
      error: 'Tab is not a shadow tab',
      duration: 0,
    };
  }
  
  // Update status
  shadowTab.status = 'executing';
  shadowTab.lastActivityAt = Date.now();
  
  try {
    // Apply throttle delay based on level
    const delay = getThrottleDelay(shadowTab.throttleLevel);
    if (delay > 0) {
      await sleep(delay);
    }
    
    // Execute action in the tab
    const result = await browser.tabs.sendMessage(tabId, {
      type: 'EXECUTE_ACTION',
      payload: action,
      timestamp: Date.now(),
    });
    
    shadowTab.status = 'ready';
    shadowTab.lastActivityAt = Date.now();
    
    return {
      tabId,
      success: true,
      data: result,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    shadowTab.status = 'error';
    shadowTab.error = error instanceof Error ? error.message : 'Execution failed';
    
    return {
      tabId,
      success: false,
      error: shadowTab.error,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute extraction in a shadow tab
 */
export async function extractFromShadowTab(
  tabId: number,
  options: {
    selector?: string;
    extractType?: 'tables' | 'forms' | 'links' | 'images' | 'structured' | 'all';
  } = {}
): Promise<ShadowTabResult> {
  const startTime = Date.now();
  const shadowTab = shadowTabs.get(tabId);
  
  if (!shadowTab) {
    return {
      tabId,
      success: false,
      error: 'Tab is not a shadow tab',
      duration: 0,
    };
  }
  
  shadowTab.status = 'executing';
  shadowTab.lastActivityAt = Date.now();
  
  try {
    const result = await browser.tabs.sendMessage(tabId, {
      type: 'EXTRACT_DATA',
      payload: options,
      timestamp: Date.now(),
    });
    
    shadowTab.status = 'ready';
    
    return {
      tabId,
      success: true,
      data: result,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    shadowTab.status = 'error';
    
    return {
      tabId,
      success: false,
      error: error instanceof Error ? error.message : 'Extraction failed',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Navigate a shadow tab to a new URL
 */
export async function navigateShadowTab(
  tabId: number,
  url: string,
  waitForLoad: boolean = true,
  timeout: number = DEFAULT_TIMEOUT
): Promise<void> {
  const shadowTab = shadowTabs.get(tabId);
  
  if (!shadowTab) {
    throw new Error('Tab is not a shadow tab');
  }
  
  shadowTab.status = 'loading';
  shadowTab.url = url;
  shadowTab.lastActivityAt = Date.now();
  
  await browser.tabs.update(tabId, { url });
  
  if (waitForLoad) {
    await waitForTabReady(tabId, timeout);
    shadowTab.status = 'ready';
  }
}

/**
 * Close all shadow tabs for a task
 */
export async function closeTaskShadowTabs(taskId: string): Promise<void> {
  const taskTabs = getShadowTabsForTask(taskId);
  
  await Promise.all(taskTabs.map(tab => closeShadowTab(tab.id)));
}

/**
 * Close all shadow tabs
 */
export async function closeAllShadowTabs(): Promise<void> {
  const tabs = getAllShadowTabs();
  
  await Promise.all(tabs.map(tab => closeShadowTab(tab.id)));
}

/**
 * Clean up stale shadow tabs
 */
async function cleanupStaleShadowTabs(): Promise<number> {
  const now = Date.now();
  const staleTimeout = 5 * 60 * 1000; // 5 minutes of inactivity
  let cleaned = 0;
  
  for (const [tabId, shadowTab] of shadowTabs) {
    // Check if tab is stale
    const isStale = now - shadowTab.lastActivityAt > staleTimeout;
    const isError = shadowTab.status === 'error';
    const shouldAutoClose = shadowTab.autoClose && shadowTab.status === 'completed';
    
    if (isStale || isError || shouldAutoClose) {
      await closeShadowTab(tabId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[ShadowTabManager] Cleaned up ${cleaned} stale shadow tabs`);
  }
  
  return cleaned;
}

/**
 * Mark a shadow tab as completed
 */
export function markShadowTabCompleted(tabId: number): void {
  const shadowTab = shadowTabs.get(tabId);
  if (shadowTab) {
    shadowTab.status = 'completed';
    shadowTab.lastActivityAt = Date.now();
  }
}

/**
 * Get throttle delay based on level
 */
function getThrottleDelay(level: 'low' | 'medium' | 'high'): number {
  switch (level) {
    case 'low':
      return 100; // 100ms between actions
    case 'medium':
      return 500; // 500ms between actions
    case 'high':
      return 1000; // 1 second between actions
    default:
      return 500;
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create multiple shadow tabs in parallel
 */
export async function createShadowTabs(
  urls: string[],
  options: Omit<ShadowTabOptions, 'url'> = {}
): Promise<ShadowTab[]> {
  const taskId = options.taskId || `task_${Date.now()}`;
  
  const tabPromises = urls.map((url) =>
    createShadowTab({
      ...options,
      url,
      taskId,
      // Stagger creation slightly to avoid overwhelming the browser
    }).catch(error => {
      console.error(`[ShadowTabManager] Failed to create tab for ${url}:`, error);
      return null;
    })
  );
  
  const results = await Promise.all(tabPromises);
  return results.filter((tab): tab is ShadowTab => tab !== null);
}

/**
 * Execute actions in parallel across multiple shadow tabs
 */
export async function executeInParallel(
  executions: Array<{
    tabId: number;
    action: {
      type: string;
      target?: string;
      value?: unknown;
      options?: Record<string, unknown>;
    };
  }>
): Promise<ShadowTabResult[]> {
  const promises = executions.map(({ tabId, action }) =>
    executeInShadowTab(tabId, action)
  );
  
  return Promise.all(promises);
}
