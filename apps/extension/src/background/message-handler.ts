import browser from 'webextension-polyfill';
import type { Message, MessageResponse, MessageType, Action, ActionResult } from '@/shared/types';
import { checkPermission, requestPermission } from './permissions';
import { trackUsage, getUsageStats, checkLimit } from './usage-tracker';
import { saveHistoryEntry, getHistory } from './history-manager';
import { executeAction } from './action-executor';
import { processVoiceCommand, type VoiceCommandResult } from './voice-handler';
import { 
  createShadowTab, 
  closeShadowTab, 
  getAllShadowTabs, 
  getActiveShadowTabCount,
  type ShadowTabOptions,
} from './shadow-tab-manager';
import { 
  CrossSiteExecutor, 
  comparePrices, 
  scrapeMultipleSites,
  type CrossSiteTask,
  type TaskResult,
} from '@/lib/orchestration';

export async function handleMessage(
  message: Message<unknown>,
  sender: browser.Runtime.MessageSender
): Promise<MessageResponse<unknown>> {
  const { type, payload, tabId } = message;
  const senderTabId = sender.tab?.id || tabId;

  console.log('[MirmirOps] Handling message:', type, payload);

  try {
    switch (type as MessageType) {
      case 'EXECUTE_ACTION':
        return await handleExecuteAction(payload as Action, senderTabId);

      case 'EXTRACT_DATA':
        return await handleExtractData(payload as { selector?: string }, senderTabId);

      case 'GET_PAGE_CONTEXT':
        return await handleGetPageContext(senderTabId);

      case 'LLM_REQUEST':
        return await handleLLMRequest(payload as { messages: unknown[]; config: unknown });

      case 'VOICE_COMMAND':
        return await handleVoiceCommand(payload as { transcript: string }, senderTabId);

      case 'SAVE_HISTORY':
        return await handleSaveHistory(payload);

      case 'GET_HISTORY':
        return await handleGetHistory(payload as { limit?: number; offset?: number });

      case 'CHECK_PERMISSION':
        return await handleCheckPermission(payload as { action: string; domain: string });

      case 'REQUEST_PERMISSION':
        return await handleRequestPermission(payload as { action: string; domain: string; tier: string });

      case 'SYNC_USAGE':
        return await handleSyncUsage();

      case 'GET_LIMITS':
        return await handleGetLimits();

      // Cross-site orchestration messages
      case 'CREATE_SHADOW_TAB':
        return await handleCreateShadowTab(payload as ShadowTabOptions);

      case 'CLOSE_SHADOW_TAB':
        return await handleCloseShadowTab(payload as { tabId: number });

      case 'GET_SHADOW_TABS':
        return handleGetShadowTabs();

      case 'EXECUTE_CROSS_SITE_TASK':
        return await handleExecuteCrossSiteTask(payload as CrossSiteTask);

      case 'COMPARE_PRICES':
        return await handleComparePrices(payload as { productName: string; urls: string[] });

      case 'SCRAPE_SITES':
        return await handleScrapeSites(payload as { urls: string[]; selector?: string });

      default:
        return { success: false, error: `Unknown message type: ${type}` };
    }
  } catch (error) {
    console.error('[MirmirOps] Message handler error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function handleExecuteAction(
  action: Action,
  tabId?: number
): Promise<MessageResponse<ActionResult>> {
  if (!tabId) {
    return { success: false, error: 'No tab ID provided' };
  }

  // Check permission - auto-grant for extension-initiated actions
  const tab = await browser.tabs.get(tabId);
  const domain = tab.url ? new URL(tab.url).hostname : '';
  
  // Extension-initiated actions (from sidepanel/popup) are trusted
  // Only enforce permissions for content-script or external triggers
  const hasPermission = await checkPermission(action.type, domain, action.permissionTier);
  if (!hasPermission) {
    // Auto-grant permission for extension-initiated actions (mutable-safe tier)
    try {
      await requestPermission(action.type, domain, 'mutable-safe');
      console.log(`[MirmirOps] Auto-granted permission for ${action.type} on ${domain}`);
    } catch {
      console.warn(`[MirmirOps] Could not auto-grant permission, proceeding anyway`);
    }
  }

  // Check usage limits
  const withinLimits = await checkLimit('action');
  if (!withinLimits) {
    return { success: false, error: 'Action limit reached. Please upgrade your plan.' };
  }

  // Execute the action
  const result = await executeAction(action, tabId);
  
  // Track usage
  await trackUsage('action', action.type);

  // Save to history
  await saveHistoryEntry({
    type: 'action',
    data: { action, result },
    url: tab.url,
    tabId,
  });

  return { success: result.success, data: result, error: result.error };
}

async function handleExtractData(
  payload: { selector?: string },
  tabId?: number
): Promise<MessageResponse<unknown>> {
  if (!tabId) {
    return { success: false, error: 'No tab ID provided' };
  }

  try {
    const result = await browser.tabs.sendMessage(tabId, {
      type: 'EXTRACT_DATA',
      payload,
      timestamp: Date.now(),
    });
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Extraction failed' 
    };
  }
}

async function handleGetPageContext(tabId?: number): Promise<MessageResponse<unknown>> {
  if (!tabId) {
    return { success: false, error: 'No tab ID provided' };
  }

  try {
    const result = await browser.tabs.sendMessage(tabId, {
      type: 'GET_PAGE_CONTEXT',
      payload: {},
      timestamp: Date.now(),
    });
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get page context' 
    };
  }
}

async function handleLLMRequest(
  _payload: { messages: unknown[]; config: unknown }
): Promise<MessageResponse<unknown>> {
  // Check usage limits for LLM
  const withinLimits = await checkLimit('llm');
  if (!withinLimits) {
    return { success: false, error: 'LLM request limit reached. Please upgrade or use WebLLM.' };
  }

  // Track usage
  await trackUsage('llm', 'request');

  // LLM handling will be implemented in the LLM layer
  // For now, return a placeholder
  return { 
    success: false, 
    error: 'LLM layer not yet initialized. Use WebLLM in the UI.' 
  };
}

async function handleVoiceCommand(
  payload: { transcript: string; autoExecute?: boolean; speakResponse?: boolean },
  tabId?: number
): Promise<MessageResponse<VoiceCommandResult>> {
  // Process voice command with NLP and optional agent routing
  const result = await processVoiceCommand(payload.transcript, tabId, {
    autoExecute: payload.autoExecute,
    speakResponse: payload.speakResponse,
  });
  
  return { 
    success: result.success, 
    data: result,
    error: result.error,
  };
}

async function handleSaveHistory(payload: unknown): Promise<MessageResponse<void>> {
  await saveHistoryEntry(payload as Parameters<typeof saveHistoryEntry>[0]);
  return { success: true };
}

async function handleGetHistory(
  payload: { limit?: number; offset?: number }
): Promise<MessageResponse<unknown>> {
  const history = await getHistory(payload.limit, payload.offset);
  return { success: true, data: history };
}

async function handleCheckPermission(
  payload: { action: string; domain: string }
): Promise<MessageResponse<boolean>> {
  const hasPermission = await checkPermission(payload.action, payload.domain);
  return { success: true, data: hasPermission };
}

async function handleRequestPermission(
  payload: { action: string; domain: string; tier: string }
): Promise<MessageResponse<boolean>> {
  const granted = await requestPermission(
    payload.action, 
    payload.domain, 
    payload.tier as 'passive' | 'read-only' | 'mutable-safe' | 'mutable-critical'
  );
  return { success: true, data: granted };
}

async function handleSyncUsage(): Promise<MessageResponse<void>> {
  // Sync usage with backend (if logged in)
  // For now, just get local stats
  const stats = await getUsageStats();
  console.log('[MirmirOps] Usage stats:', stats);
  return { success: true };
}

async function handleGetLimits(): Promise<MessageResponse<unknown>> {
  const stats = await getUsageStats();
  return { success: true, data: stats };
}

// Cross-site orchestration handlers

async function handleCreateShadowTab(
  options: ShadowTabOptions
): Promise<MessageResponse<unknown>> {
  try {
    const shadowTab = await createShadowTab(options);
    return { success: true, data: shadowTab };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create shadow tab' 
    };
  }
}

async function handleCloseShadowTab(
  payload: { tabId: number }
): Promise<MessageResponse<void>> {
  try {
    await closeShadowTab(payload.tabId);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to close shadow tab' 
    };
  }
}

function handleGetShadowTabs(): MessageResponse<unknown> {
  return { 
    success: true, 
    data: {
      tabs: getAllShadowTabs(),
      count: getActiveShadowTabCount(),
    }
  };
}

async function handleExecuteCrossSiteTask(
  task: CrossSiteTask
): Promise<MessageResponse<TaskResult>> {
  try {
    // Check shadow tab limit before starting
    const withinLimits = await checkLimit('shadowTab');
    if (!withinLimits) {
      return { 
        success: false, 
        error: 'Shadow tab limit reached. Please upgrade your plan.' 
      };
    }

    const executor = new CrossSiteExecutor(task.id);
    const result = await executor.execute(task);
    
    return { success: result.success, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Cross-site task failed' 
    };
  }
}

async function handleComparePrices(
  payload: { productName: string; urls: string[] }
): Promise<MessageResponse<TaskResult>> {
  try {
    const withinLimits = await checkLimit('shadowTab');
    if (!withinLimits) {
      return { 
        success: false, 
        error: 'Shadow tab limit reached. Please upgrade your plan.' 
      };
    }

    const result = await comparePrices(payload.productName, payload.urls);
    return { success: result.success, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Price comparison failed' 
    };
  }
}

async function handleScrapeSites(
  payload: { urls: string[]; selector?: string }
): Promise<MessageResponse<TaskResult>> {
  try {
    const withinLimits = await checkLimit('shadowTab');
    if (!withinLimits) {
      return { 
        success: false, 
        error: 'Shadow tab limit reached. Please upgrade your plan.' 
      };
    }

    const result = await scrapeMultipleSites(payload.urls, payload.selector);
    return { success: result.success, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Site scraping failed' 
    };
  }
}
