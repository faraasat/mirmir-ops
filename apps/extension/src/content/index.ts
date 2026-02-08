import browser from 'webextension-polyfill';
import { DOMExtractor } from './extractor';
import { DOMController } from './controller';
import { DOMObserver } from './observer';
import type { Action, Message, MessageResponse } from '@/shared/types';

// Initialize modules
const extractor = new DOMExtractor();
const controller = new DOMController();
const observer = new DOMObserver();

// Message handler
browser.runtime.onMessage.addListener(
  (
    message: Message<unknown>,
    _sender: browser.Runtime.MessageSender
  ): Promise<MessageResponse<unknown>> | true => {
    // Must return true to indicate async response
    handleMessage(message);
    return true;
  }
);

async function handleMessage(message: Message<unknown>): Promise<MessageResponse<unknown>> {
  const { type, payload } = message;

  try {
    switch (type) {
      case 'EXECUTE_ACTION':
        return await handleExecuteAction(payload as Action);

      case 'EXTRACT_DATA':
        return await handleExtractData(payload as { selector?: string; type?: string });

      case 'GET_PAGE_CONTEXT':
        return handleGetPageContext();

      case 'PAGE_READY' as string:
        handlePageReady();
        return { success: true };

      default:
        return { success: false, error: `Unknown message type: ${type}` };
    }
  } catch (error) {
    console.error('[MirmirOps Content] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function handleExecuteAction(action: Action): Promise<MessageResponse<unknown>> {
  try {
    const result = await controller.executeAction(action);
    return { success: result.success, data: result.data, error: result.error };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Action execution failed',
    };
  }
}

async function handleExtractData(
  payload: { selector?: string; type?: string }
): Promise<MessageResponse<unknown>> {
  try {
    let data;
    
    if (payload.selector) {
      data = extractor.extractBySelector(payload.selector);
    } else if (payload.type === 'forms') {
      data = extractor.extractForms();
    } else if (payload.type === 'links') {
      data = extractor.extractLinks();
    } else if (payload.type === 'images') {
      data = extractor.extractImages();
    } else if (payload.type === 'tables') {
      data = extractor.extractTables();
    } else {
      // Extract page summary
      data = extractor.extractPageSummary();
    }
    
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Extraction failed',
    };
  }
}

function handleGetPageContext(): MessageResponse<unknown> {
  const context = extractor.getPageContext();
  return { success: true, data: context };
}

function handlePageReady(): void {
  // Start observing DOM changes
  observer.start();
  console.log('[MirmirOps Content] Page ready, observer started');
}

// Initialize on load
function initialize(): void {
  console.log('[MirmirOps Content] Content script loaded on:', window.location.href);
  
  // Start observer for dynamic content
  if (document.readyState === 'complete') {
    observer.start();
  } else {
    window.addEventListener('load', () => observer.start());
  }
}

initialize();
