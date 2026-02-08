import browser from 'webextension-polyfill';
import type { Message, MessageResponse } from '@/shared/types';
import { handleMessage } from './message-handler';

// Type for sidePanel API (Chrome MV3)
interface SidePanelAPI {
  setOptions: (options: { enabled?: boolean; path?: string }) => Promise<void>;
  open: (options: { tabId?: number }) => Promise<void>;
}

// Access sidePanel via type assertion since it's a Chrome-specific API
const sidePanel = (browser as unknown as { sidePanel?: SidePanelAPI }).sidePanel;
import { initializeStorage } from './storage';
import { initializePermissions } from './permissions';
import { initializeUsageTracker } from './usage-tracker';
import { initializeTabManager, updateTabState, cleanupStaleTabs } from './tab-manager';
import { initializeShadowTabManager } from './shadow-tab-manager';
import { initializeHistoryCleanup, runHistoryCleanup } from '@/lib/history';
import { initializeScheduler, handleScheduledAlarm } from '@/lib/workflows';
import { initializeAnalytics } from '@/lib/analytics';
import { initializePermissionManager } from '@/lib/permissions';
import { initializeMemorySystems } from '@/lib/memory';

// Initialize on extension install/update
browser.runtime.onInstalled.addListener(async (details) => {
  console.log('[MirmirOps] Extension installed/updated:', details.reason);
  
  // Initialize storage with defaults
  await initializeStorage();
  
  // Set up side panel behavior
  if (sidePanel) {
    await sidePanel.setOptions({
      enabled: true,
    });
  }

  // Create context menus
  browser.contextMenus.create({
    id: 'mirmir-execute',
    title: 'Ask MirmirOps',
    contexts: ['selection'],
  });

  browser.contextMenus.create({
    id: 'mirmir-extract',
    title: 'Extract with MirmirOps',
    contexts: ['page', 'link', 'image'],
  });
});

// Handle extension icon click - open side panel
browser.action.onClicked.addListener(async (tab) => {
  if (tab.id && sidePanel) {
    await sidePanel.open({ tabId: tab.id });
  }
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case 'mirmir-execute':
      if (info.selectionText) {
        // Send selected text to side panel for processing
        await browser.runtime.sendMessage({
          type: 'CONTEXT_MENU_EXECUTE',
          payload: { text: info.selectionText },
          tabId: tab.id,
          timestamp: Date.now(),
        });
      }
      break;
    case 'mirmir-extract':
      // Trigger extraction on current page
      await browser.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_DATA',
        payload: { url: info.pageUrl, linkUrl: info.linkUrl, srcUrl: info.srcUrl },
        timestamp: Date.now(),
      });
      break;
  }
});

// Handle keyboard shortcuts
browser.commands.onCommand.addListener(async (command) => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  
  switch (command) {
    case '_execute_action':
      if (tab?.id && sidePanel) {
        await sidePanel.open({ tabId: tab.id });
      }
      break;
    case 'toggle-voice':
      // Send toggle voice command to side panel
      await browser.runtime.sendMessage({
        type: 'TOGGLE_VOICE',
        payload: {},
        timestamp: Date.now(),
      });
      break;
  }
});

// Main message handler
browser.runtime.onMessage.addListener(
  (
    message: Message<unknown>,
    sender: browser.Runtime.MessageSender
  ): Promise<MessageResponse<unknown>> | true => {
    // Handle async messages
    return handleMessage(message, sender);
  }
);

// Handle tab updates for context tracking
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Update tab state on URL or title change
  if (tab.url && (changeInfo.url || changeInfo.title)) {
    updateTabState(tabId, tab.url, tab.title || '');
  }
  
  if (changeInfo.status === 'complete' && tab.url) {
    // Notify content script that page is ready
    try {
      await browser.tabs.sendMessage(tabId, {
        type: 'PAGE_READY',
        payload: { url: tab.url, title: tab.title },
        timestamp: Date.now(),
      });
    } catch {
      // Content script not ready yet, ignore
    }
  }
});

// Initialize services
async function initialize() {
  console.log('[MirmirOps] Background service worker starting...');
  
  await initializeStorage();
  await initializePermissions();
  initializeUsageTracker();
  initializeTabManager();
  initializeShadowTabManager();
  await initializeHistoryCleanup();
  await initializeScheduler();
  initializeAnalytics();
  await initializePermissionManager();
  await initializeMemorySystems();
  
  // Set up periodic cleanup (every 30 minutes)
  browser.alarms.create('cleanup-stale-tabs', { periodInMinutes: 30 });
  
  console.log('[MirmirOps] Background service worker ready');
}

// Handle alarms
browser.alarms.onAlarm.addListener(async (alarm) => {
  // Check for workflow schedules first (they have prefix)
  if (alarm.name.startsWith('workflow-schedule-')) {
    await handleScheduledAlarm(alarm.name);
    return;
  }
  
  // Handle system alarms
  switch (alarm.name) {
    case 'cleanup-stale-tabs':
      await cleanupStaleTabs();
      break;
    case 'history-cleanup':
      await runHistoryCleanup();
      break;
  }
});

initialize().catch(console.error);

// Keep service worker alive (for MV3)
const keepAlive = () => setInterval(browser.runtime.getPlatformInfo, 20000);
keepAlive();
