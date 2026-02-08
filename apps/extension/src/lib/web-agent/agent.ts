// Web Agent - Main agent class that orchestrates context, tools, and LLM

import type { 
  AgentContext, 
  AgentResponse, 
  ActionRequest, 
  CapabilityTier, 
  PermissionRequest,
  ToolResult 
} from './types';
import { buildAgentContext, formatContextForPrompt, createMinimalContext } from './context';
import { executeTool, getAvailableTools, formatToolsForPrompt, parseToolCalls, requiresConfirmation, estimateImpact } from './executor';
import { getLLMRouter, type LLMMessage } from '../llm';
import { CAPABILITY_TIER_NAMES, CAPABILITY_TIER_DESCRIPTIONS } from './types';

export interface AgentConfig {
  maxIterations: number;
  autoApproveUpToTier: CapabilityTier;
  includePageContent: boolean;
}

const DEFAULT_CONFIG: AgentConfig = {
  maxIterations: 5,
  autoApproveUpToTier: 1, // Auto-approve read-only actions
  includePageContent: true,
};

export class WebAgent {
  private config: AgentConfig;
  private context: AgentContext | null = null;
  private conversationHistory: LLMMessage[] = [];
  private pendingPermission: PermissionRequest | null = null;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process a user message and generate a response
   */
  async processMessage(
    message: string,
    tabId: number,
    onAction?: (action: ActionRequest, result: ToolResult) => void,
    onPermissionRequired?: (request: PermissionRequest) => Promise<boolean>
  ): Promise<AgentResponse> {
    // Build context
    this.context = await buildAgentContext(tabId, {
      includePageContent: this.config.includePageContent,
      includeForms: true,
    });

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: message,
    });

    // Get available tools
    const tools = getAvailableTools(this.context);

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(this.context, tools);

    // Run agent loop
    let iterations = 0;
    const toolResults: ToolResult[] = [];
    let finalResponse = '';
    let requiresPermission: PermissionRequest | undefined;

    while (iterations < this.config.maxIterations) {
      iterations++;

      // Call LLM
      const router = getLLMRouter();
      if (!router) {
        return {
          message: 'LLM not initialized. Please configure an AI provider in settings.',
        };
      }

      const response = await router.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          ...this.conversationHistory,
        ],
      });

      const llmResponse = response.content;

      // Parse any tool calls from the response
      const actions = parseToolCalls(llmResponse);

      if (actions.length === 0) {
        // No tool calls, this is the final response
        finalResponse = llmResponse;
        break;
      }

      // Execute tool calls
      for (const action of actions) {
        // Estimate impact if not provided
        if (!action.estimatedImpact) {
          action.estimatedImpact = estimateImpact(action);
        }

        // Check if confirmation is required
        if (requiresConfirmation(action)) {
          if (onPermissionRequired) {
            const approved = await onPermissionRequired({
              tier: this.context.permissions.currentTier,
              tool: action.tool,
              domain: new URL(this.context.page.url).hostname,
              rationale: action.rationale || `Execute ${action.tool}`,
            });
            
            if (!approved) {
              toolResults.push({
                success: false,
                error: 'Action cancelled by user',
              });
              continue;
            }
          } else {
            // No permission handler, require external confirmation
            requiresPermission = {
              tier: 3 as CapabilityTier,
              tool: action.tool,
              domain: new URL(this.context.page.url).hostname,
              rationale: action.rationale || `This action requires your confirmation`,
            };
            finalResponse = llmResponse;
            break;
          }
        }

        // Execute the tool
        const result = await executeTool(action, this.context, tabId);

        if (result.permissionRequired) {
          requiresPermission = result.permissionRequired;
          finalResponse = llmResponse;
          break;
        }

        if (result.result) {
          toolResults.push(result.result);
          onAction?.(action, result.result);

          // Add result to conversation
          this.conversationHistory.push({
            role: 'assistant',
            content: `[Tool: ${action.tool}]\n${JSON.stringify(result.result.data, null, 2)}`,
          });
        }
      }

      if (requiresPermission) {
        break;
      }
    }

    // Add final response to history
    if (finalResponse) {
      this.conversationHistory.push({
        role: 'assistant',
        content: finalResponse,
      });
    }

    return {
      message: finalResponse,
      toolResults,
      requiresPermission,
    };
  }

  /**
   * Process a simple message without context (for quick responses)
   */
  async processSimpleMessage(message: string, pageUrl: string, pageTitle: string): Promise<string> {
    createMinimalContext(pageUrl, pageTitle);
    
    const router = getLLMRouter();
    if (!router) {
      return 'LLM not initialized. Please configure an AI provider in settings.';
    }

    const systemPrompt = `You are MirmirOps, a helpful browser assistant. You're currently on a page titled "${pageTitle}" at ${pageUrl}. Help the user with their request concisely.`;

    const response = await router.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    });

    return response.content;
  }

  /**
   * Grant a permission for the current session
   */
  grantPermission(tier: CapabilityTier, domain: string, tools: string[]): void {
    if (this.context) {
      this.context.permissions.currentTier = Math.max(
        this.context.permissions.currentTier,
        tier
      ) as CapabilityTier;
      
      if (!this.context.permissions.grantedDomains.includes(domain)) {
        this.context.permissions.grantedDomains.push(domain);
      }
      
      this.context.permissions.grantedActions.push(...tools);
    }
    this.pendingPermission = null;
  }

  /**
   * Build the system prompt for the agent
   */
  private buildSystemPrompt(context: AgentContext, tools: ReturnType<typeof getAvailableTools>): string {
    const parts: string[] = [];

    parts.push(`# MirmirOps - Browser Agent

You are MirmirOps, an AI browser assistant that helps users navigate websites, fill forms, extract data, and automate tasks.

## Your Current Permission Level

You have **${CAPABILITY_TIER_NAMES[context.permissions.currentTier]}** (Tier ${context.permissions.currentTier}) permissions.
${CAPABILITY_TIER_DESCRIPTIONS[context.permissions.currentTier]}

## Guidelines

1. **Always explain before acting**: Tell the user what you're about to do
2. **Use tools when needed**: If you need to interact with the page, use the appropriate tool
3. **Ask for clarification**: If the request is unclear, ask questions
4. **Respect permissions**: Don't attempt actions above your permission level
5. **Be concise**: Keep responses focused and actionable

## Tool Usage Format

When you need to use a tool, include it in your response like this:

\`\`\`tool
{
  "tool": "tool_name",
  "parameters": {
    "param1": "value1"
  },
  "rationale": "Why this action is needed"
}
\`\`\`

You can use multiple tools in one response. After tool execution, you'll see the results.

`);

    // Add context
    parts.push(formatContextForPrompt(context));
    parts.push('');

    // Add available tools
    parts.push(formatToolsForPrompt(tools));

    return parts.join('\n');
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get current context
   */
  getContext(): AgentContext | null {
    return this.context;
  }

  /**
   * Get pending permission request
   */
  getPendingPermission(): PermissionRequest | null {
    return this.pendingPermission;
  }
}

// Singleton instance
let agentInstance: WebAgent | null = null;

export function getWebAgent(config?: Partial<AgentConfig>): WebAgent {
  if (!agentInstance) {
    agentInstance = new WebAgent(config);
  }
  return agentInstance;
}

export function resetWebAgent(): void {
  agentInstance = null;
}
