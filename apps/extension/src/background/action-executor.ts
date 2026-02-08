import browser from 'webextension-polyfill';
import type { Action, ActionResult } from '@/shared/types';

export async function executeAction(action: Action, tabId: number): Promise<ActionResult> {
  const startTime = Date.now();
  
  try {
    // Send action to content script for execution
    const response = await browser.tabs.sendMessage(tabId, {
      type: 'EXECUTE_ACTION',
      payload: action,
      timestamp: startTime,
    });

    return {
      actionId: action.id,
      success: response?.success ?? false,
      data: response?.data,
      error: response?.error,
      duration: Date.now() - startTime,
      timestamp: startTime,
    };
  } catch (error) {
    return {
      actionId: action.id,
      success: false,
      error: error instanceof Error ? error.message : 'Action execution failed',
      duration: Date.now() - startTime,
      timestamp: startTime,
    };
  }
}

export async function executeActionWithRetry(
  action: Action,
  tabId: number,
  maxRetries: number = 3
): Promise<ActionResult> {
  let lastResult: ActionResult | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    lastResult = await executeAction(action, tabId);
    
    if (lastResult.success) {
      return lastResult;
    }
    
    // Wait before retry (exponential backoff)
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
    }
  }
  
  return lastResult!;
}

export async function executeActionSequence(
  actions: Action[],
  tabId: number
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  
  for (const action of actions) {
    const result = await executeAction(action, tabId);
    results.push(result);
    
    // Stop sequence on failure (unless action specifies continue)
    if (!result.success && !action.options?.continueOnError) {
      break;
    }
    
    // Wait between actions if specified
    const delay = action.options?.delay as number | undefined;
    if (delay && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}
