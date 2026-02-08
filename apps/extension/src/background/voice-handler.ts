// Voice Command Handler - Processes voice commands and routes to agent
import browser from 'webextension-polyfill';
import { logCommand, logAction } from '@/lib/history';
import { extractEntities, parseIntent, type ExtractedEntity } from '@/lib/nlp';
import { checkLimit, trackUsage } from './usage-tracker';

export interface VoiceCommandResult {
  success: boolean;
  transcript: string;
  intent?: {
    action: string;
    confidence: number;
    entities: Record<string, unknown>;
  };
  response?: string;
  actions?: Array<{
    type: string;
    success: boolean;
    result?: unknown;
    error?: string;
  }>;
  error?: string;
  shouldSpeak?: boolean; // Whether to speak the response
}

/**
 * Process a voice command through NLP and optionally route to agent
 */
export async function processVoiceCommand(
  transcript: string,
  tabId?: number,
  options: {
    autoExecute?: boolean; // Whether to auto-execute recognized actions
    speakResponse?: boolean; // Whether to request TTS for response
  } = {}
): Promise<VoiceCommandResult> {
  const { autoExecute = false, speakResponse = true } = options;
  
  // Check voice command limits
  const withinLimits = await checkLimit('voice');
  if (!withinLimits) {
    return {
      success: false,
      transcript,
      error: 'Voice command limit reached for today.',
      shouldSpeak: speakResponse,
    };
  }
  
  // Track usage
  await trackUsage('voice', 'command');
  
  // Get current tab context
  let tabUrl = '';
  let tabTitle = '';
  
  if (tabId) {
    try {
      const tab = await browser.tabs.get(tabId);
      tabUrl = tab.url || '';
      tabTitle = tab.title || '';
    } catch {
      // Tab might not exist
    }
  } else {
    // Get active tab
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      tabId = activeTab.id;
      tabUrl = activeTab.url || '';
      tabTitle = activeTab.title || '';
    }
  }
  
  // Extract entities from transcript
  const entities = extractEntities(transcript);
  
  // Parse intent using NLP
  const intent = parseIntent(transcript);
  
  // Log the command
  await logCommand(
    transcript,
    { url: tabUrl, title: tabTitle, tabId },
    { action: intent.action, confidence: intent.confidence }
  );
  
  // Group entities by type
  const groupedEntities = groupEntitiesByType(entities);
  
  const result: VoiceCommandResult = {
    success: true,
    transcript,
    intent: {
      action: intent.action,
      confidence: intent.confidence,
      entities: groupedEntities,
    },
    shouldSpeak: speakResponse,
    actions: [],
  };
  
  // Handle quick commands that don't need LLM
  const quickResponse = handleQuickCommand(transcript, intent, entities);
  if (quickResponse) {
    result.response = quickResponse;
    return result;
  }
  
  // If auto-execute is enabled and we have high-confidence intent, execute
  if (autoExecute && intent.confidence > 0.8 && tabId) {
    const actionResult = await executeIntentAction(intent, entities, tabId);
    if (actionResult) {
      result.actions?.push(actionResult);
      result.response = actionResult.success 
        ? `Done! ${actionResult.type} completed.`
        : `Failed to ${actionResult.type}: ${actionResult.error}`;
    }
  }
  
  // For complex commands, we need to route to the LLM/Agent
  // This will be handled by the sidepanel's useLLM hook
  if (!result.response) {
    result.response = generateIntentResponse(intent, entities);
  }
  
  return result;
}

/**
 * Group entities by type
 */
function groupEntitiesByType(entities: ExtractedEntity[]): Record<string, unknown> {
  const grouped: Record<string, ExtractedEntity[]> = {};
  
  for (const entity of entities) {
    const key = entity.type + 's'; // pluralize
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(entity);
  }
  
  return grouped;
}

/**
 * Get entities of a specific type
 */
function getEntitiesOfType(entities: ExtractedEntity[], type: string): ExtractedEntity[] {
  return entities.filter(e => e.type === type);
}

/**
 * Handle quick commands that don't need LLM processing
 */
function handleQuickCommand(
  transcript: string,
  _intent: ReturnType<typeof parseIntent>,
  entities: ExtractedEntity[]
): string | null {
  const lower = transcript.toLowerCase();
  
  // Navigation commands
  const urls = getEntitiesOfType(entities, 'url');
  if (lower.startsWith('go to ') || lower.startsWith('open ')) {
    if (urls.length > 0) {
      return `Navigating to ${urls[0].text}...`;
    }
  }
  
  // Scroll commands
  if (lower.includes('scroll down')) {
    return 'Scrolling down...';
  }
  if (lower.includes('scroll up')) {
    return 'Scrolling up...';
  }
  if (lower.includes('scroll to top')) {
    return 'Scrolling to top...';
  }
  if (lower.includes('scroll to bottom')) {
    return 'Scrolling to bottom...';
  }
  
  // Back/forward
  if (lower === 'go back' || lower === 'back') {
    return 'Going back...';
  }
  if (lower === 'go forward' || lower === 'forward') {
    return 'Going forward...';
  }
  
  // Refresh
  if (lower === 'refresh' || lower === 'reload') {
    return 'Refreshing page...';
  }
  
  // Help
  if (lower === 'help' || lower === 'what can you do') {
    return 'I can help you navigate websites, fill forms, extract data, and automate tasks. Try saying "scroll down", "go to google.com", or "find the search box".';
  }
  
  return null;
}

/**
 * Generate a response based on intent and entities
 */
function generateIntentResponse(
  intent: ReturnType<typeof parseIntent>,
  entities: ExtractedEntity[]
): string {
  const { action, confidence } = intent;
  
  if (confidence < 0.3) {
    return "I'm not sure what you want to do. Could you please rephrase?";
  }
  
  const urls = getEntitiesOfType(entities, 'url');
  const dates = getEntitiesOfType(entities, 'date');
  
  switch (action) {
    case 'search':
      return `I'll help you search. What would you like to find?`;
    case 'navigate':
      if (urls.length > 0) {
        return `Opening ${urls[0].text}...`;
      }
      return "Where would you like to go?";
    case 'click':
      return "What would you like me to click on?";
    case 'fill':
      return "What would you like me to type?";
    case 'extract':
      return "I'll extract the data from this page.";
    case 'summarize':
      return "I'll summarize this page for you.";
    case 'book':
      if (dates.length > 0) {
        return `Looking for availability on ${dates[0].text}...`;
      }
      return "When would you like to make the booking?";
    case 'buy':
      return "I'll help you with the purchase. Please review the details first.";
    case 'compare':
      return "I'll compare the options for you.";
    default:
      return "I understand. Let me help you with that.";
  }
}

/**
 * Execute an action based on recognized intent
 */
async function executeIntentAction(
  intent: ReturnType<typeof parseIntent>,
  entities: ExtractedEntity[],
  tabId: number
): Promise<{
  type: string;
  success: boolean;
  result?: unknown;
  error?: string;
} | null> {
  const { action } = intent;
  const urls = getEntitiesOfType(entities, 'url');
  
  try {
    switch (action) {
      case 'navigate':
        if (urls.length > 0) {
          let url = urls[0].text;
          if (!url.startsWith('http')) {
            url = 'https://' + url;
          }
          await browser.tabs.update(tabId, { url });
          
          // Log the action
          await logAction(
            { type: 'navigate', target: url },
            { success: true, data: { url } },
            { url, title: '', tabId }
          );
          
          return { type: 'navigate', success: true, result: { url } };
        }
        break;
        
      case 'scroll':
        // Send scroll command to content script
        await browser.tabs.sendMessage(tabId, {
          type: 'EXECUTE_ACTION',
          payload: { action: 'scroll', direction: 'down', amount: 500 },
          timestamp: Date.now(),
        });
        return { type: 'scroll', success: true };
        
      // Add more action handlers as needed
    }
  } catch (error) {
    return {
      type: action,
      success: false,
      error: error instanceof Error ? error.message : 'Action failed',
    };
  }
  
  return null;
}

/**
 * Handle voice command message from sidepanel
 */
/**
 * Handle voice command message from sidepanel
 */
export async function handleVoiceCommandMessage(
  payload: { 
    transcript: string;
    autoExecute?: boolean;
    speakResponse?: boolean;
  },
  tabId?: number
): Promise<VoiceCommandResult> {
  return processVoiceCommand(payload.transcript, tabId, {
    autoExecute: payload.autoExecute,
    speakResponse: payload.speakResponse,
  });
}
