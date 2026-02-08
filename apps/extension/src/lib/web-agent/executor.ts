// Tool Executor - Executes tool calls with permission checks

import browser from 'webextension-polyfill';
import type { 
  Tool, 
  ToolResult, 
  AgentContext, 
  CapabilityTier, 
  ActionRequest, 
  PermissionRequest 
} from './types';
import { getToolByName, getToolsForTier } from './tools';
import { CAPABILITY_TIER_NAMES } from './types';

export interface ExecutionResult {
  success: boolean;
  result?: ToolResult;
  permissionRequired?: PermissionRequest;
  error?: string;
}

/**
 * Execute a tool with permission checks
 */
export async function executeTool(
  action: ActionRequest,
  context: AgentContext,
  tabId: number
): Promise<ExecutionResult> {
  const tool = getToolByName(action.tool);
  
  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${action.tool}`,
    };
  }

  // Check permission tier
  if (tool.requiredTier > context.permissions.currentTier) {
    return {
      success: false,
      permissionRequired: {
        tier: tool.requiredTier,
        tool: tool.name,
        domain: new URL(context.page.url).hostname,
        rationale: action.rationale || `This action requires ${CAPABILITY_TIER_NAMES[tool.requiredTier]} permissions`,
      },
    };
  }

  // Validate parameters
  const validationError = validateParameters(tool, action.parameters);
  if (validationError) {
    return {
      success: false,
      error: validationError,
    };
  }

  try {
    // Execute the tool
    const toolResult = await tool.execute(action.parameters, context);

    // If the tool returns action data, send it to content script for execution
    if (toolResult.success && toolResult.data && typeof toolResult.data === 'object') {
      const actionData = toolResult.data as { action?: string };
      if (actionData.action) {
        const contentResult = await executeInContentScript(tabId, toolResult.data);
        return {
          success: contentResult.success,
          result: {
            ...toolResult,
            data: contentResult.data,
            error: contentResult.error,
          },
        };
      }
    }

    return {
      success: toolResult.success,
      result: toolResult,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    };
  }
}

/**
 * Validate tool parameters
 */
function validateParameters(tool: Tool, params: Record<string, unknown>): string | null {
  for (const param of tool.parameters) {
    if (param.required && !(param.name in params)) {
      return `Missing required parameter: ${param.name}`;
    }

    if (param.name in params) {
      const value = params[param.name];
      const expectedType = param.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;

      if (actualType !== expectedType) {
        return `Parameter ${param.name} expected ${expectedType}, got ${actualType}`;
      }
    }
  }

  return null;
}

/**
 * Execute an action in the content script
 */
async function executeInContentScript(
  tabId: number,
  actionData: unknown
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const response = await browser.tabs.sendMessage(tabId, {
      type: 'EXECUTE_ACTION',
      payload: actionData,
      timestamp: Date.now(),
    });

    return {
      success: response?.success ?? false,
      data: response?.data,
      error: response?.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Content script execution failed',
    };
  }
}

/**
 * Get available tools for the current context
 */
export function getAvailableTools(context: AgentContext): Tool[] {
  return getToolsForTier(context.permissions.currentTier);
}

/**
 * Format available tools for LLM prompt
 */
export function formatToolsForPrompt(tools: Tool[]): string {
  const parts: string[] = ['## Available Tools\n'];

  tools.forEach(tool => {
    parts.push(`### ${tool.name}`);
    parts.push(`${tool.description}`);
    parts.push(`Required Tier: ${CAPABILITY_TIER_NAMES[tool.requiredTier]}`);
    parts.push('Parameters:');
    
    tool.parameters.forEach(param => {
      const required = param.required ? ' (required)' : ' (optional)';
      const defaultVal = param.default !== undefined ? ` [default: ${param.default}]` : '';
      parts.push(`  - ${param.name}: ${param.type}${required}${defaultVal}`);
      parts.push(`    ${param.description}`);
    });
    
    parts.push('');
  });

  return parts.join('\n');
}

/**
 * Parse tool calls from LLM response
 */
export function parseToolCalls(response: string): ActionRequest[] {
  const actions: ActionRequest[] = [];
  
  // Look for JSON tool calls in the response
  // Format: ```tool\n{...}\n```
  const toolCallRegex = /```(?:tool|json)?\n?(\{[\s\S]*?\})\n?```/g;
  
  let match;
  while ((match = toolCallRegex.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.tool && parsed.parameters) {
        actions.push({
          tool: parsed.tool,
          parameters: parsed.parameters,
          rationale: parsed.rationale,
          estimatedImpact: parsed.estimatedImpact,
        });
      }
    } catch {
      // Skip invalid JSON
    }
  }

  // Also look for inline tool format: [tool:name params:{...}]
  const inlineRegex = /\[tool:(\w+)\s+params:(\{[^}]+\})\]/g;
  
  while ((match = inlineRegex.exec(response)) !== null) {
    try {
      const params = JSON.parse(match[2]);
      actions.push({
        tool: match[1],
        parameters: params,
      });
    } catch {
      // Skip invalid JSON
    }
  }

  return actions;
}

/**
 * Check if an action requires user confirmation
 */
export function requiresConfirmation(action: ActionRequest): boolean {
  const tool = getToolByName(action.tool);
  if (!tool) return true;
  
  // Tier 3 (critical) actions always require confirmation
  if (tool.requiredTier === 3) return true;
  
  // Some tier 2 actions may require confirmation based on impact
  if (tool.requiredTier === 2 && action.estimatedImpact === 'high') return true;
  
  return false;
}

/**
 * Estimate the impact level of an action
 */
export function estimateImpact(action: ActionRequest): 'low' | 'medium' | 'high' {
  const tool = getToolByName(action.tool);
  if (!tool) return 'high';
  
  // Tier mapping
  switch (tool.requiredTier) {
    case 0:
      return 'low';
    case 1:
      return 'low';
    case 2:
      // Form filling is medium, navigation can be high
      if (tool.name === 'navigate') {
        const url = action.parameters.url as string;
        // External navigation is higher impact
        if (url && !url.startsWith('#') && !url.startsWith('/')) {
          return 'medium';
        }
      }
      return 'medium';
    case 3:
      return 'high';
    default:
      return 'medium';
  }
}
