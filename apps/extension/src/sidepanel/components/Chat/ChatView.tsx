import { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/app-store';
import { useLLM } from '../../hooks/useLLM';
import { useVoiceSynthesis } from '../../hooks/useVoiceSynthesis';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { VoiceButton } from './VoiceButton';
import { WebLLMStatus } from './WebLLMStatus';
import { createContextualPrompt } from '@/lib/llm/prompts';
import { logCommand, logAction, logLLMResponse } from '@/lib/history';
import browser from 'webextension-polyfill';

// ─── Multi-Step Command Decomposition Prompt ─────────────────────────────────
// The LLM decomposes a user message into an execution plan with steps that can
// run sequentially or in parallel groups.

const COMMAND_DECOMPOSITION_PROMPT = `You are a command planner for a browser automation assistant. Analyze the user's message and break it into an execution plan.

RULES:
1. If the message contains MULTIPLE independent tasks (connected by "and", "also", "then", "after that", etc.), break them into separate steps.
2. Steps that depend on a previous step must run AFTER it (sequential). Steps that are independent can run in PARALLEL.
3. Each step gets a "group" number. Steps with the SAME group number run in parallel. Groups run sequentially (group 1 first, then group 2, etc.).
4. If a step needs its own browser tab (because it navigates away from the current page while another task uses the current page), set "new_tab": true.
5. If the message is a simple single task or just conversation, return a single step.
6. IMPORTANT: For searching ON a specific site (e.g., "search astronomia on YouTube"), use "search" type with the search_query — the system will handle it via URL. Do NOT use "fill" for search boxes.
7. For "play X on YouTube" or "search X on YouTube", navigate to YouTube first, then use "search" to search on it — the system uses YouTube's search URL automatically.
8. "click" should specify a short text label of the element to click (e.g., the video title, link text, button label).

STEP TYPES:
- "search": Search for something. Provide "search_query". If already on a site (YouTube, Google, Amazon etc.), searches ON that site via URL.
- "navigate": Go to a URL/website. Provide "target" (the URL or site name like "youtube.com" or "YouTube").
- "click": Click an element on the page. Provide "target" (the visible text of the link/button/video to click).
- "fill": Type into a specific form field and submit. Provide "target" (field description) and "value" (text to type). Use only when "search" won't work.
- "extract": Extract/read data from the current page.
- "summarize": Summarize the current page.
- "compare": Compare items across sites. Provide "target".
- "wait": Wait for a page to load. Provide "duration_ms" (default 2000).
- "chat": Pure conversation, greeting, or general knowledge question.

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "steps": [
    {
      "id": 1,
      "group": 1,
      "type": "<step_type>",
      "description": "<short human-readable description>",
      "search_query": "<optional>",
      "target": "<optional>",
      "value": "<optional>",
      "new_tab": false,
      "depends_on": []
    }
  ]
}

EXAMPLES:

User: "Open youtube, play astronomia song. Then search the top ranking universities and open the times link"
{
  "steps": [
    {"id":1,"group":1,"type":"navigate","description":"Open YouTube","target":"youtube.com","new_tab":false,"depends_on":[]},
    {"id":2,"group":1,"type":"search","description":"Search top ranking universities on Google","search_query":"top ranking universities in the world","new_tab":true,"depends_on":[]},
    {"id":3,"group":2,"type":"search","description":"Search Astronomia on YouTube","search_query":"astronomia song","new_tab":false,"depends_on":[1]},
    {"id":4,"group":3,"type":"click","description":"Click first Astronomia video","target":"Astronomia","new_tab":false,"depends_on":[3]},
    {"id":5,"group":3,"type":"click","description":"Click Times Higher Education link","target":"timeshighereducation","new_tab":true,"depends_on":[2]}
  ]
}

User: "find me the best pizza places in NYC"
{
  "steps": [
    {"id":1,"group":1,"type":"search","description":"Search for best pizza places in NYC","search_query":"best pizza places in NYC","new_tab":false,"depends_on":[]}
  ]
}

User: "search for laptops on amazon"
{
  "steps": [
    {"id":1,"group":1,"type":"navigate","description":"Open Amazon","target":"amazon.com","new_tab":false,"depends_on":[]},
    {"id":2,"group":2,"type":"search","description":"Search for laptops on Amazon","search_query":"laptops","new_tab":false,"depends_on":[1]}
  ]
}

User: "hello, how are you?"
{
  "steps": [
    {"id":1,"group":1,"type":"chat","description":"Greeting / conversation","new_tab":false,"depends_on":[]}
  ]
}

User message: `;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExecutionStep {
  id: number;
  group: number;
  type: string;
  description: string;
  search_query?: string;
  target?: string;
  value?: string;
  new_tab?: boolean;
  depends_on?: number[];
  duration_ms?: number;
}

interface ExecutionPlan {
  steps: ExecutionStep[];
}

interface StepResult {
  stepId: number;
  success: boolean;
  result: string;
  tabId?: number; // which tab this step operated on
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatView() {
  const { messages, isLoading, settings, addMessage, updateMessage, setLoading } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const lastSpokenMessageRef = useRef<string | null>(null);
  
  // Voice synthesis for responses
  const { speak, stop: stopSpeaking, isSpeaking } = useVoiceSynthesis();

  const { stream, complete, webllmStatus, loadWebLLM, isStreaming } = useLLM({
    onStream: (content) => {
      if (streamingMessageIdRef.current) {
        updateMessage(streamingMessageIdRef.current, { content, isLoading: false });
      }
    },
    onComplete: (finalContent) => {
      if (settings.voiceFeedbackEnabled && finalContent && streamingMessageIdRef.current) {
        if (lastSpokenMessageRef.current !== streamingMessageIdRef.current) {
          lastSpokenMessageRef.current = streamingMessageIdRef.current;
          const textToSpeak = finalContent.length > 500 
            ? finalContent.substring(0, 500) + '...' 
            : finalContent;
          speak(textToSpeak);
        }
      }
    },
    onError: (error) => {
      if (streamingMessageIdRef.current) {
        const errorMessage = `Sorry, I encountered an error: ${error.message}`;
        updateMessage(streamingMessageIdRef.current, {
          content: errorMessage,
          isLoading: false,
        });
        if (settings.voiceFeedbackEnabled) {
          speak(errorMessage);
        }
      }
      streamingMessageIdRef.current = null;
    },
  });

  // Check if configuration is needed for the selected provider
  const needsConfiguration = (() => {
    const provider = settings.defaultLLMProvider;
    if (provider === 'webllm') return !webllmStatus || webllmStatus.status !== 'ready';
    if (provider === 'openai') return !settings.apiKeys?.openai;
    if (provider === 'anthropic') return !settings.apiKeys?.anthropic;
    if (provider === 'ollama') return !settings.apiKeys?.ollama;
    if (provider === 'byok') return !settings.apiKeys?.byokEndpoint || !settings.apiKeys?.byokModel;
    return false;
  })();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Helper: get current tab context for history ─────────────────────────

  const getTabContext = useCallback(async (): Promise<{ url: string; title: string; tabId?: number } | undefined> => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        return { url: tab.url || 'unknown', title: tab.title || 'Browser', tabId: tab.id };
      }
    } catch { /* ignore */ }
    return undefined;
  }, []);

  // ─── LLM-based Command Decomposition ────────────────────────────────────

  const decomposeCommand = useCallback(async (userMessage: string): Promise<ExecutionPlan> => {
    try {
      const response = await complete([
        { role: 'system', content: COMMAND_DECOMPOSITION_PROMPT + `"${userMessage}"` },
      ]);

      if (response?.content) {
        let jsonStr = response.content.trim();
        // Remove markdown code fences if present
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
        const parsed = JSON.parse(jsonStr) as ExecutionPlan;
        console.log('[ChatView] Decomposed plan:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('[ChatView] Command decomposition failed:', error);
    }
    // Fallback: treat as single chat step
    return { steps: [{ id: 1, group: 1, type: 'chat', description: 'Conversation' }] };
  }, [complete]);

  // ─── Step Executor ──────────────────────────────────────────────────────

  const executeStep = useCallback(async (
    step: ExecutionStep,
    tabId: number,
    _stepResults: Map<number, StepResult>,
  ): Promise<StepResult> => {
    console.log(`[ChatView] Executing step ${step.id}: ${step.description} (type: ${step.type})`);
    const startTime = Date.now();

    // If this step needs a new tab, create one
    let workingTabId = tabId;
    if (step.new_tab) {
      try {
        const newTab = await browser.tabs.create({ active: false });
        if (newTab.id) workingTabId = newTab.id;
      } catch (error) {
        console.error('[ChatView] Failed to create new tab:', error);
      }
    }

    // Build context for history
    let context: { url: string; title: string; tabId?: number } | undefined;
    try {
      const tab = await browser.tabs.get(workingTabId);
      context = { url: tab.url || 'unknown', title: tab.title || 'Browser', tabId: workingTabId };
    } catch { /* ignore */ }

    try {
      let actionResult: string;
      switch (step.type) {
        case 'navigate': {
          actionResult = await handleNavigateAction(step.target || '', workingTabId);
          break;
        }
        case 'search': {
          const query = step.search_query || step.target || step.description;
          actionResult = await handleSearchAction(query, workingTabId);
          break;
        }
        case 'click': {
          actionResult = await handleClickAction(step.target || '', workingTabId);
          break;
        }
        case 'fill': {
          actionResult = await handleFillAction(step.target || '', step.value || '', workingTabId);
          break;
        }
        case 'extract': {
          actionResult = await handleExtractAction('extract', workingTabId);
          break;
        }
        case 'summarize': {
          actionResult = await handleExtractAction('summarize', workingTabId);
          break;
        }
        case 'compare': {
          actionResult = await handleCompareAction(step.target || '', step.description);
          break;
        }
        case 'wait': {
          await new Promise(resolve => setTimeout(resolve, step.duration_ms || 2000));
          actionResult = 'Waited successfully';
          break;
        }
        default:
          actionResult = `Unsupported step type: ${step.type}`;
      }

      // Log the action to history
      const duration = Date.now() - startTime;
      try {
        await logAction(
          {
            type: step.type,
            target: step.target || step.search_query,
            parameters: {
              description: step.description,
              value: step.value,
              search_query: step.search_query,
              new_tab: step.new_tab,
            },
          },
          { success: true, data: actionResult.slice(0, 500), duration },
          context,
        );
      } catch (histErr) {
        console.warn('[ChatView] Failed to log action to history:', histErr);
      }

      return { stepId: step.id, success: true, result: actionResult, tabId: workingTabId };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime;

      // Log the failure to history
      try {
        await logAction(
          {
            type: step.type,
            target: step.target || step.search_query,
            parameters: { description: step.description },
          },
          { success: false, error: errMsg, duration },
          context,
        );
      } catch (histErr) {
        console.warn('[ChatView] Failed to log error to history:', histErr);
      }

      return { stepId: step.id, success: false, result: `Step failed: ${errMsg}`, tabId: workingTabId };
    }
  }, []);

  // ─── Multi-Step Orchestrator ────────────────────────────────────────────

  const executeMultiStepPlan = useCallback(async (
    plan: ExecutionPlan,
    userMessage: string,
    messageId: string,
  ) => {
    const steps = plan.steps;
    const stepResults = new Map<number, StepResult>();

    // Get the active tab for the primary operations
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    const primaryTabId = activeTab?.id;

    if (!primaryTabId) {
      updateMessage(messageId, {
        content: 'No active tab found. Please open a webpage first.',
        isLoading: false,
      });
      return;
    }

    // Find all unique groups and sort them
    const groups = [...new Set(steps.map(s => s.group))].sort((a, b) => a - b);

    // Build progress display
    const buildProgressMarkdown = (_currentGroup: number, completedSteps: Set<number>, activeSteps: Set<number>) => {
      let md = `**Executing multi-step plan** (${steps.length} steps)\n\n`;
      for (const step of steps) {
        const icon = completedSteps.has(step.id)
          ? '\u2705'
          : activeSteps.has(step.id)
            ? '\u23f3'
            : '\u2b1c';
        md += `${icon} **Step ${step.id}:** ${step.description}\n`;
      }
      return md;
    };

    const completedSteps = new Set<number>();
    const activeSteps = new Set<number>();

    // Execute groups sequentially; within each group, execute steps in parallel
    for (const groupNum of groups) {
      const groupSteps = steps.filter(s => s.group === groupNum);

      // Mark these steps as active
      groupSteps.forEach(s => activeSteps.add(s.id));
      updateMessage(messageId, {
        content: buildProgressMarkdown(groupNum, completedSteps, activeSteps),
        isLoading: false,
      });

      // For each step, figure out which tab to use.
      // If a step depends on a previous step that was in a new tab, reuse that tab.
      const resolveTabForStep = (step: ExecutionStep): number => {
        if (step.depends_on && step.depends_on.length > 0) {
          // Use the tab from the last dependency
          for (const depId of [...step.depends_on].reverse()) {
            const depResult = stepResults.get(depId);
            if (depResult?.tabId) return depResult.tabId;
          }
        }
        return primaryTabId;
      };

      // Execute all steps in this group in parallel
      const groupPromises = groupSteps.map(async (step) => {
        const tabForStep = resolveTabForStep(step);
        const result = await executeStep(step, tabForStep, stepResults);
        stepResults.set(step.id, result);
        
        // Mark completed, remove from active
        completedSteps.add(step.id);
        activeSteps.delete(step.id);
        
        // Update progress
        updateMessage(messageId, {
          content: buildProgressMarkdown(groupNum, completedSteps, activeSteps),
          isLoading: false,
        });
      });

      await Promise.all(groupPromises);
    }

    // All steps completed — now use the LLM to generate a final summary
    const allResults = [...stepResults.entries()]
      .sort(([a], [b]) => a - b)
      .map(([id, r]) => {
        const step = steps.find(s => s.id === id);
        return `Step ${id} (${step?.description || 'unknown'}): ${r.success ? 'SUCCESS' : 'FAILED'}\n${r.result}`;
      })
      .join('\n\n');

    const systemPrompt = createContextualPrompt({
      url: activeTab.url || 'Unknown',
      title: activeTab.title || 'Browser',
    });

    const resultMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages
        .filter(m => m.role !== 'system')
        .slice(-6)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: userMessage },
      {
        role: 'system' as const,
        content: `[Multi-Step Execution Completed]\n\nThe following browser actions were performed:\n\n${allResults}\n\nProvide a concise, well-formatted summary to the user describing what was accomplished. Use markdown. If any step failed, mention it. Don't just list the steps — describe the outcome naturally.`,
      },
    ];

    streamingMessageIdRef.current = messageId;
    await stream(resultMessages, settings.defaultLLMProvider);

    // Log the LLM summary response to history
    try {
      const context = activeTab
        ? { url: activeTab.url || 'unknown', title: activeTab.title || 'Browser', tabId: primaryTabId }
        : undefined;
      const finalMsg = useAppStore.getState().messages.find(m => m.id === messageId);
      if (finalMsg?.content) {
        await logLLMResponse(
          {
            provider: settings.defaultLLMProvider,
            model: settings.defaultModel || 'unknown',
            response: finalMsg.content.slice(0, 1000),
          },
          context,
        );
      }
    } catch (histErr) {
      console.warn('[ChatView] Failed to log LLM response to history:', histErr);
    }
  }, [messages, settings.defaultLLMProvider, settings.defaultModel, stream, updateMessage, executeStep]);

  // ─── Main Message Handler ───────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (userMessage: string) => {
      addMessage({ role: 'user', content: userMessage });
      
      const assistantMessageId = addMessage({
        role: 'assistant',
        content: '',
        isLoading: true,
      });
      
      streamingMessageIdRef.current = assistantMessageId || `msg_${Date.now()}_assistant`;
      const currentMessageId = streamingMessageIdRef.current;

      setLoading(true);

      // Log the user command to history
      const tabContext = await getTabContext();
      try {
        await logCommand(userMessage, tabContext);
      } catch (histErr) {
        console.warn('[ChatView] Failed to log command to history:', histErr);
      }
      
      try {
        // Decompose the command into an execution plan
        const plan = await decomposeCommand(userMessage);
        console.log('[ChatView] Execution plan:', plan);

        // Check if it's purely conversational (single chat step)
        const isPureChat = plan.steps.length === 1 && plan.steps[0].type === 'chat';

        if (!isPureChat) {
          // Multi-step or single browser-action execution
          await executeMultiStepPlan(plan, userMessage, currentMessageId);
        } else {
          // Standard LLM chat
          let pageContext = { url: 'Browser', title: 'Browser' as string, mainContent: undefined as string | undefined };
          try {
            const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (activeTab?.id) {
              pageContext = { url: activeTab.url || 'Browser', title: activeTab.title || 'Browser', mainContent: undefined };
              try {
                const contextResponse = await browser.runtime.sendMessage({
                  type: 'GET_PAGE_CONTEXT',
                  payload: {},
                  tabId: activeTab.id,
                  timestamp: Date.now(),
                });
                if (contextResponse?.success && contextResponse.data) {
                  const ctx = contextResponse.data as { mainContent?: string };
                  if (ctx.mainContent) {
                    pageContext.mainContent = String(ctx.mainContent).slice(0, 2000);
                  }
                }
              } catch { /* ignore */ }
            }
          } catch { /* ignore */ }

          const systemPrompt = createContextualPrompt(pageContext);
          const llmMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...messages
              .filter(m => m.role !== 'system')
              .slice(-10)
              .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            { role: 'user' as const, content: userMessage },
          ];

          await stream(llmMessages, settings.defaultLLMProvider);

          // Log the LLM chat response to history
          try {
            const finalMsg = useAppStore.getState().messages.find(m => m.id === currentMessageId);
            if (finalMsg?.content) {
              await logLLMResponse(
                {
                  provider: settings.defaultLLMProvider,
                  model: settings.defaultModel || 'unknown',
                  response: finalMsg.content.slice(0, 1000),
                },
                tabContext,
              );
            }
          } catch (histErr) {
            console.warn('[ChatView] Failed to log LLM response to history:', histErr);
          }
        }
      } catch (error) {
        console.error('[ChatView] Error sending message:', error);
        const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
        updateMessage(currentMessageId, {
          content: `Sorry, I couldn't process your request. ${errorMsg}`,
          isLoading: false,
        });
      } finally {
        setLoading(false);
        const lastMessages = useAppStore.getState().messages;
        const targetMsg = lastMessages.find(m => m.id === currentMessageId);
        if (targetMsg && targetMsg.isLoading) {
          updateMessage(currentMessageId, {
            content: targetMsg.content || 'Sorry, I couldn\'t process your request. Please try again.',
            isLoading: false,
          });
        }
        streamingMessageIdRef.current = null;
      }
    },
    [messages, settings.defaultLLMProvider, settings.defaultModel, addMessage, updateMessage, setLoading, stream, decomposeCommand, executeMultiStepPlan, getTabContext]
  );

  const handleLoadWebLLM = useCallback(async () => {
    try {
      await loadWebLLM(settings.defaultModel);
    } catch (error) {
      console.error('Failed to load WebLLM:', error);
    }
  }, [loadWebLLM, settings.defaultModel]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* WebLLM Status */}
      {settings.defaultLLMProvider === 'webllm' && webllmStatus && 
        webllmStatus.status !== 'idle' && webllmStatus.status !== 'ready' && (
        <WebLLMStatus status={webllmStatus} onLoad={handleLoadWebLLM} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {(isLoading || isStreaming) && !messages.some(m => m.isLoading) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">Thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border p-3 bg-card">
        <div className="flex items-center gap-2">
          <ChatInput onSendMessage={handleSendMessage} disabled={isLoading || isStreaming || needsConfiguration} />
          <VoiceButton 
            onVoiceCommand={handleSendMessage} 
            autoSubmit={settings.voiceAutoSubmit !== false} 
          />
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="btn-icon bg-orange-500 text-white hover:bg-orange-600 shrink-0"
              title="Stop speaking"
            >
              <StopIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Browser Action Handlers ────────────────────────────────────────────────

// Well-known site search URL patterns — much more reliable than DOM manipulation
const SITE_SEARCH_URLS: Record<string, (query: string) => string> = {
  'youtube.com': (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  'google.com': (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  'amazon.com': (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  'ebay.com': (q) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}`,
  'wikipedia.org': (q) => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
  'github.com': (q) => `https://github.com/search?q=${encodeURIComponent(q)}`,
  'reddit.com': (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
  'twitter.com': (q) => `https://twitter.com/search?q=${encodeURIComponent(q)}`,
  'x.com': (q) => `https://x.com/search?q=${encodeURIComponent(q)}`,
  'bing.com': (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  'stackoverflow.com': (q) => `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
};

/**
 * Detect if a tab is on a known site, returns the site key or null
 */
async function detectSite(tabId: number): Promise<string | null> {
  try {
    const tab = await browser.tabs.get(tabId);
    if (tab.url) {
      const hostname = new URL(tab.url).hostname.replace('www.', '');
      for (const site of Object.keys(SITE_SEARCH_URLS)) {
        if (hostname.includes(site.replace('www.', ''))) return site;
      }
    }
  } catch { /* ignore */ }
  return null;
}

async function handleNavigateAction(
  target: string,
  tabId: number,
): Promise<string> {
  let url = target || '';
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (url.includes('.') && !url.includes(' ')) {
      url = `https://${url}`;
    } else {
      // Could be a site name — try to resolve it
      const siteLower = url.toLowerCase().replace(/\s+/g, '');
      if (siteLower.includes('youtube')) url = 'https://www.youtube.com';
      else if (siteLower.includes('google')) url = 'https://www.google.com';
      else if (siteLower.includes('amazon')) url = 'https://www.amazon.com';
      else if (siteLower.includes('github')) url = 'https://github.com';
      else if (siteLower.includes('reddit')) url = 'https://www.reddit.com';
      else if (siteLower.includes('twitter') || siteLower === 'x') url = 'https://x.com';
      else if (siteLower.includes('facebook')) url = 'https://www.facebook.com';
      else if (siteLower.includes('instagram')) url = 'https://www.instagram.com';
      else if (siteLower.includes('linkedin')) url = 'https://www.linkedin.com';
      else if (siteLower.includes('wikipedia')) url = 'https://en.wikipedia.org';
      else url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }
  }

  try {
    await browser.tabs.update(tabId, { url });
    await new Promise(resolve => setTimeout(resolve, 2500));
    return `Navigated to: ${url}`;
  } catch (error) {
    return `Failed to navigate: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

async function handleSearchAction(
  searchQuery: string,
  tabId: number,
): Promise<string> {
  // Check if the tab is on a known site — use that site's search URL
  const currentSite = await detectSite(tabId);
  let searchUrl: string;
  
  if (currentSite && SITE_SEARCH_URLS[currentSite]) {
    searchUrl = SITE_SEARCH_URLS[currentSite](searchQuery);
  } else {
    searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
  }

  try {
    await browser.tabs.update(tabId, { url: searchUrl });
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const extractResult = await browser.runtime.sendMessage({
        type: 'EXTRACT_DATA',
        payload: { type: 'all' },
        tabId,
        timestamp: Date.now(),
      });

      if (extractResult?.success && extractResult.data) {
        return `Searched for: "${searchQuery}" on ${currentSite || 'Google'}\n\nExtracted data:\n${JSON.stringify(extractResult.data, null, 2).slice(0, 3000)}`;
      }
    } catch { /* extraction failed, that's ok */ }

    return `Searched for: "${searchQuery}" on ${currentSite || 'Google'}\nResults are now displayed in the browser tab.`;
  } catch (error) {
    return `Failed to search: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

async function handleExtractAction(
  intentAction: string,
  tabId: number,
): Promise<string> {
  try {
    const extractType = intentAction === 'summarize' ? 'article' : 'all';
    const result = await browser.runtime.sendMessage({
      type: 'EXTRACT_DATA',
      payload: { type: extractType },
      tabId,
      timestamp: Date.now(),
    });

    if (result?.success && result.data) {
      return `Extracted data:\n${JSON.stringify(result.data, null, 2).slice(0, 4000)}`;
    }
    return 'No data could be extracted from this page.';
  } catch (error) {
    return `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

async function handleClickAction(
  target: string,
  tabId: number,
): Promise<string> {
  // First, try content script click with smart element finding
  try {
    const result = await browser.runtime.sendMessage({
      type: 'EXECUTE_ACTION',
      payload: {
        id: `action_${Date.now()}`,
        type: 'click',
        target: target,
        value: target,
        permissionTier: 'mutable-safe' as const,
      },
      tabId,
      timestamp: Date.now(),
    });

    if (result?.success) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return `Clicked on "${target}" successfully. ${result.data?.text ? `Element text: "${result.data.text}"` : ''}`;
    }
    return `Could not click on "${target}": ${result?.error || 'Element not found'}`;
  } catch (error) {
    return `Click failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

async function handleFillAction(
  target: string,
  value: string,
  tabId: number,
): Promise<string> {
  // For known sites, prefer URL-based search which is much more reliable
  const site = await detectSite(tabId);
  if (site && SITE_SEARCH_URLS[site] && /search|query|find/i.test(target)) {
    const searchUrl = SITE_SEARCH_URLS[site](value);
    try {
      await browser.tabs.update(tabId, { url: searchUrl });
      await new Promise(resolve => setTimeout(resolve, 3000));
      return `Searched for "${value}" on ${site} using URL navigation.`;
    } catch { /* fall through to DOM approach */ }
  }

  // Fall back to DOM-based fill via content script
  try {
    const result = await browser.runtime.sendMessage({
      type: 'EXECUTE_ACTION',
      payload: {
        id: `action_${Date.now()}`,
        type: 'fill',
        target: target,
        value: value || target,
        options: { submit: true },
        permissionTier: 'mutable-safe' as const,
      },
      tabId,
      timestamp: Date.now(),
    });

    if (result?.success) {
      return `Filled "${target}" with "${value}" successfully.`;
    }
    
    // If fill failed, try URL-based search as last resort
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(value + ' ' + target)}`;
    await browser.tabs.update(tabId, { url: searchUrl });
    await new Promise(resolve => setTimeout(resolve, 2500));
    return `Could not fill the form directly, searched Google for "${value}" instead.`;
  } catch (error) {
    return `Form fill failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

async function handleCompareAction(
  target: string,
  userMessage: string,
): Promise<string> {
  try {
    const result = await browser.runtime.sendMessage({
      type: 'COMPARE_PRICES',
      payload: {
        productName: target || userMessage,
        urls: [],
      },
      timestamp: Date.now(),
    });

    if (result?.success && result.data) {
      return `Comparison results:\n${JSON.stringify(result.data, null, 2).slice(0, 4000)}`;
    }
    return 'Could not complete the comparison.';
  } catch (error) {
    return `Comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}
