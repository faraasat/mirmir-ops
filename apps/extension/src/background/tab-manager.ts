// Tab Manager - Manages tab lifecycle and state
import browser from 'webextension-polyfill';
import { logNavigation } from '@/lib/history';

export interface TabState {
  id: number;
  url: string;
  title: string;
  sessionId?: string;
  createdAt: number;
  lastActiveAt: number;
  isActive: boolean;
  pageLoadCount: number;
  lastExtensionAction?: number; // Timestamp of last extension-initiated action
}

// Store tab states in memory
const tabStates = new Map<number, TabState>();
let activeTabId: number | null = null;

// Track pending extension-initiated navigations
// When the extension triggers a navigation, we add the expected URL here
const pendingExtensionNavigations = new Map<number, { url: string; timestamp: number }>();

// Time window (ms) to consider a navigation as extension-initiated
const EXTENSION_ACTION_WINDOW = 5000; // 5 seconds

/**
 * Initialize tab manager and set up listeners
 */
export function initializeTabManager(): void {
  // Set up tab event listeners
  browser.tabs.onCreated.addListener(handleTabCreated);
  browser.tabs.onRemoved.addListener(handleTabRemoved);
  browser.tabs.onActivated.addListener(handleTabActivated);
  browser.tabs.onReplaced.addListener(handleTabReplaced);
  
  // Initialize with existing tabs
  initializeExistingTabs();
  
  console.log('[TabManager] Initialized');
}

/**
 * Initialize state for tabs that exist when extension starts
 */
async function initializeExistingTabs(): Promise<void> {
  try {
    const tabs = await browser.tabs.query({});
    const now = Date.now();
    
    for (const tab of tabs) {
      if (tab.id) {
        tabStates.set(tab.id, {
          id: tab.id,
          url: tab.url || '',
          title: tab.title || '',
          createdAt: now,
          lastActiveAt: tab.active ? now : now - 1000,
          isActive: tab.active || false,
          pageLoadCount: 1,
        });
        
        if (tab.active) {
          activeTabId = tab.id;
        }
      }
    }
    
    console.log(`[TabManager] Initialized ${tabStates.size} existing tabs`);
  } catch (error) {
    console.error('[TabManager] Failed to initialize existing tabs:', error);
  }
}

/**
 * Handle new tab creation
 */
function handleTabCreated(tab: browser.Tabs.Tab): void {
  if (!tab.id) return;
  
  const now = Date.now();
  
  tabStates.set(tab.id, {
    id: tab.id,
    url: tab.url || '',
    title: tab.title || '',
    createdAt: now,
    lastActiveAt: now,
    isActive: false,
    pageLoadCount: 0,
  });
  
  console.log(`[TabManager] Tab created: ${tab.id}`);
}

/**
 * Handle tab removal (cleanup)
 */
function handleTabRemoved(tabId: number, _removeInfo: browser.Tabs.OnRemovedRemoveInfoType): void {
  const state = tabStates.get(tabId);
  
  if (state) {
    // Only log navigation if this tab had recent extension activity
    // This prevents logging every closed tab
    const hasRecentExtensionActivity = state.lastExtensionAction && 
      (Date.now() - state.lastExtensionAction) < EXTENSION_ACTION_WINDOW * 2;
    
    if (state.url && !isInternalUrl(state.url) && hasRecentExtensionActivity) {
      // Don't await, fire and forget
      logNavigation({
        url: state.url,
        title: state.title,
        tabId,
      }).catch(() => {});
    }
    
    // Clean up tab state and pending navigations
    tabStates.delete(tabId);
    pendingExtensionNavigations.delete(tabId);
    
    // Update active tab if this was the active one
    if (activeTabId === tabId) {
      activeTabId = null;
    }
    
    console.log(`[TabManager] Tab removed: ${tabId}`);
  }
}

/**
 * Handle tab activation (user switches tabs)
 */
function handleTabActivated(activeInfo: browser.Tabs.OnActivatedActiveInfoType): void {
  const { tabId, windowId: _windowId } = activeInfo;
  const now = Date.now();
  
  // Mark previous active tab as inactive
  if (activeTabId !== null && activeTabId !== tabId) {
    const prevState = tabStates.get(activeTabId);
    if (prevState) {
      prevState.isActive = false;
    }
  }
  
  // Mark new tab as active
  const state = tabStates.get(tabId);
  if (state) {
    state.isActive = true;
    state.lastActiveAt = now;
  }
  
  activeTabId = tabId;
  
  // Notify sidepanel of active tab change
  browser.runtime.sendMessage({
    type: 'TAB_ACTIVATED',
    payload: { tabId, url: state?.url, title: state?.title },
    timestamp: now,
  }).catch(() => {
    // Sidepanel might not be open, ignore
  });
  
  console.log(`[TabManager] Tab activated: ${tabId}`);
}

/**
 * Handle tab replacement (e.g., when navigating from a prerendered page)
 */
function handleTabReplaced(addedTabId: number, removedTabId: number): void {
  const oldState = tabStates.get(removedTabId);
  
  if (oldState) {
    // Transfer state to new tab ID
    tabStates.set(addedTabId, {
      ...oldState,
      id: addedTabId,
    });
    tabStates.delete(removedTabId);
    
    // Update active tab reference if needed
    if (activeTabId === removedTabId) {
      activeTabId = addedTabId;
    }
    
    console.log(`[TabManager] Tab replaced: ${removedTabId} -> ${addedTabId}`);
  }
}

/**
 * Update tab state when page loads/navigates
 * Only logs to history if the navigation was triggered by the extension
 */
export function updateTabState(tabId: number, url: string, title: string): void {
  const state = tabStates.get(tabId);
  const now = Date.now();
  
  if (state) {
    const isNewPage = state.url !== url;
    
    state.url = url;
    state.title = title;
    state.lastActiveAt = now;
    
    if (isNewPage) {
      state.pageLoadCount++;
      
      // Only log navigation if it was initiated by the extension
      // Check if there's a pending extension navigation for this tab
      const pendingNav = pendingExtensionNavigations.get(tabId);
      const wasExtensionInitiated = pendingNav && 
        (now - pendingNav.timestamp) < EXTENSION_ACTION_WINDOW;
      
      // Also check if the tab had recent extension activity
      const hasRecentExtensionActivity = state.lastExtensionAction && 
        (now - state.lastExtensionAction) < EXTENSION_ACTION_WINDOW;
      
      if (!isInternalUrl(url) && (wasExtensionInitiated || hasRecentExtensionActivity)) {
        logNavigation({ url, title, tabId }).catch(() => {});
        console.log(`[TabManager] Logged extension-initiated navigation: ${url}`);
      }
      
      // Clear pending navigation after processing
      if (pendingNav) {
        pendingExtensionNavigations.delete(tabId);
      }
    }
  } else {
    // Tab not tracked yet, add it (don't log - not extension initiated)
    tabStates.set(tabId, {
      id: tabId,
      url,
      title,
      createdAt: now,
      lastActiveAt: now,
      isActive: tabId === activeTabId,
      pageLoadCount: 1,
    });
  }
}

/**
 * Mark that the extension is about to perform a navigation action on a tab
 * Call this BEFORE triggering a navigation to ensure it gets logged
 */
export function markExtensionNavigation(tabId: number, expectedUrl?: string): void {
  const now = Date.now();
  
  // Mark the tab as having recent extension activity
  const state = tabStates.get(tabId);
  if (state) {
    state.lastExtensionAction = now;
  }
  
  // If we know the expected URL, track it
  if (expectedUrl) {
    pendingExtensionNavigations.set(tabId, {
      url: expectedUrl,
      timestamp: now,
    });
  }
  
  console.log(`[TabManager] Marked extension navigation for tab ${tabId}`);
}

/**
 * Mark that the extension performed an action on a tab (non-navigation)
 * This helps track extension activity for context
 */
export function markExtensionAction(tabId: number): void {
  const state = tabStates.get(tabId);
  if (state) {
    state.lastExtensionAction = Date.now();
  }
}

/**
 * Get state for a specific tab
 */
export function getTabState(tabId: number): TabState | undefined {
  return tabStates.get(tabId);
}

/**
 * Get the currently active tab ID
 */
export function getActiveTabId(): number | null {
  return activeTabId;
}

/**
 * Get all tracked tab states
 */
export function getAllTabStates(): Map<number, TabState> {
  return new Map(tabStates);
}

/**
 * Get count of tracked tabs
 */
export function getTabCount(): number {
  return tabStates.size;
}

/**
 * Check if a URL is internal (extension pages, chrome://, etc.)
 */
function isInternalUrl(url: string): boolean {
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('moz-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('edge://') ||
    url === ''
  );
}

/**
 * Clean up stale tab states (tabs that no longer exist)
 */
export async function cleanupStaleTabs(): Promise<number> {
  try {
    const existingTabs = await browser.tabs.query({});
    const existingIds = new Set(existingTabs.map(t => t.id).filter(Boolean));
    
    let cleaned = 0;
    for (const tabId of tabStates.keys()) {
      if (!existingIds.has(tabId)) {
        tabStates.delete(tabId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[TabManager] Cleaned up ${cleaned} stale tab states`);
    }
    
    return cleaned;
  } catch (error) {
    console.error('[TabManager] Failed to cleanup stale tabs:', error);
    return 0;
  }
}
