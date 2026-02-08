// Web Agent Tools - Available actions the agent can take

import type { Tool, ToolResult, CapabilityTier } from '../types';

/**
 * Tier 0 - Passive Tools (No page interaction)
 */

export const respondTool: Tool = {
  name: 'respond',
  description: 'Generate a text response to the user',
  requiredTier: 0,
  parameters: [
    {
      name: 'message',
      type: 'string',
      description: 'The message to display to the user',
      required: true,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    return {
      success: true,
      data: { message: params.message },
      metadata: { tier: 0 },
    };
  },
};

export const thinkTool: Tool = {
  name: 'think',
  description: 'Process and reason about the current context',
  requiredTier: 0,
  parameters: [
    {
      name: 'thought',
      type: 'string',
      description: 'Internal reasoning (not shown to user)',
      required: true,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    return {
      success: true,
      data: { thought: params.thought },
      metadata: { tier: 0 },
    };
  },
};

/**
 * Tier 1 - Read-Only Tools (Can read page content)
 */

export const extractTextTool: Tool = {
  name: 'extract_text',
  description: 'Extract text content from the current page',
  requiredTier: 1,
  parameters: [
    {
      name: 'selector',
      type: 'string',
      description: 'CSS selector for the element to extract text from (optional, defaults to body)',
      required: false,
      default: 'body',
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Maximum number of characters to extract',
      required: false,
      default: 5000,
    },
  ],
  execute: async (params, context): Promise<ToolResult> => {
    // This will be executed via content script
    return {
      success: true,
      data: {
        selector: params.selector || 'body',
        limit: params.limit || 5000,
        contextUrl: context.page.url,
      },
      metadata: { tier: 1 },
    };
  },
};

export const extractTableTool: Tool = {
  name: 'extract_table',
  description: 'Extract tabular data from the page',
  requiredTier: 1,
  parameters: [
    {
      name: 'selector',
      type: 'string',
      description: 'CSS selector for the table element',
      required: true,
    },
    {
      name: 'format',
      type: 'string',
      description: 'Output format: json, csv, or markdown',
      required: false,
      default: 'json',
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    return {
      success: true,
      data: {
        selector: params.selector,
        format: params.format || 'json',
      },
      metadata: { tier: 1 },
    };
  },
};

export const findElementsTool: Tool = {
  name: 'find_elements',
  description: 'Find elements matching a selector or description',
  requiredTier: 1,
  parameters: [
    {
      name: 'selector',
      type: 'string',
      description: 'CSS selector or natural language description',
      required: true,
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Maximum number of elements to return',
      required: false,
      default: 10,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    return {
      success: true,
      data: {
        selector: params.selector,
        limit: params.limit || 10,
      },
      metadata: { tier: 1 },
    };
  },
};

export const getPageInfoTool: Tool = {
  name: 'get_page_info',
  description: 'Get detailed information about the current page',
  requiredTier: 1,
  parameters: [
    {
      name: 'include',
      type: 'array',
      description: 'What to include: meta, forms, links, images, headings',
      required: false,
      default: ['meta', 'forms'],
    },
  ],
  execute: async (params, context): Promise<ToolResult> => {
    return {
      success: true,
      data: {
        url: context.page.url,
        title: context.page.title,
        description: context.page.description,
        include: params.include || ['meta', 'forms'],
      },
      metadata: { tier: 1 },
    };
  },
};

/**
 * Tier 2 - Mutable Safe Tools (Can make safe changes)
 */

export const clickTool: Tool = {
  name: 'click',
  description: 'Click on an element (non-critical actions only)',
  requiredTier: 2,
  parameters: [
    {
      name: 'selector',
      type: 'string',
      description: 'CSS selector for the element to click',
      required: true,
    },
    {
      name: 'wait_for',
      type: 'string',
      description: 'Optional selector to wait for after clicking',
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    return {
      success: true,
      data: {
        action: 'click',
        selector: params.selector,
        waitFor: params.wait_for,
      },
      metadata: { tier: 2 },
    };
  },
};

export const fillFieldTool: Tool = {
  name: 'fill_field',
  description: 'Fill a form field with a value',
  requiredTier: 2,
  parameters: [
    {
      name: 'selector',
      type: 'string',
      description: 'CSS selector for the input field',
      required: true,
    },
    {
      name: 'value',
      type: 'string',
      description: 'Value to fill in',
      required: true,
    },
    {
      name: 'clear_first',
      type: 'boolean',
      description: 'Whether to clear the field before filling',
      required: false,
      default: true,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    return {
      success: true,
      data: {
        action: 'fill',
        selector: params.selector,
        value: params.value,
        clearFirst: params.clear_first !== false,
      },
      metadata: { tier: 2 },
    };
  },
};

export const scrollTool: Tool = {
  name: 'scroll',
  description: 'Scroll the page or an element',
  requiredTier: 2,
  parameters: [
    {
      name: 'direction',
      type: 'string',
      description: 'Scroll direction: up, down, left, right, or to-element',
      required: true,
    },
    {
      name: 'amount',
      type: 'number',
      description: 'Pixels to scroll (ignored for to-element)',
      required: false,
      default: 500,
    },
    {
      name: 'selector',
      type: 'string',
      description: 'Element to scroll to (for to-element direction)',
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    return {
      success: true,
      data: {
        action: 'scroll',
        direction: params.direction,
        amount: params.amount || 500,
        selector: params.selector,
      },
      metadata: { tier: 2 },
    };
  },
};

export const selectOptionTool: Tool = {
  name: 'select_option',
  description: 'Select an option from a dropdown',
  requiredTier: 2,
  parameters: [
    {
      name: 'selector',
      type: 'string',
      description: 'CSS selector for the select element',
      required: true,
    },
    {
      name: 'value',
      type: 'string',
      description: 'Option value or text to select',
      required: true,
    },
    {
      name: 'by',
      type: 'string',
      description: 'Select by: value, text, or index',
      required: false,
      default: 'value',
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    return {
      success: true,
      data: {
        action: 'select',
        selector: params.selector,
        value: params.value,
        by: params.by || 'value',
      },
      metadata: { tier: 2 },
    };
  },
};

export const navigateTool: Tool = {
  name: 'navigate',
  description: 'Navigate to a URL',
  requiredTier: 2,
  parameters: [
    {
      name: 'url',
      type: 'string',
      description: 'URL to navigate to',
      required: true,
    },
    {
      name: 'new_tab',
      type: 'boolean',
      description: 'Whether to open in a new tab',
      required: false,
      default: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    return {
      success: true,
      data: {
        action: 'navigate',
        url: params.url,
        newTab: params.new_tab || false,
      },
      metadata: { tier: 2 },
    };
  },
};

/**
 * Tier 3 - Mutable Critical Tools (Requires explicit permission)
 */

export const submitFormTool: Tool = {
  name: 'submit_form',
  description: 'Submit a form (critical action - requires permission)',
  requiredTier: 3,
  parameters: [
    {
      name: 'selector',
      type: 'string',
      description: 'CSS selector for the form element',
      required: true,
    },
    {
      name: 'confirm',
      type: 'boolean',
      description: 'Whether user has confirmed this action',
      required: true,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    if (!params.confirm) {
      return {
        success: false,
        error: 'Form submission requires explicit user confirmation',
        metadata: { tier: 3 },
      };
    }
    return {
      success: true,
      data: {
        action: 'submit',
        selector: params.selector,
      },
      metadata: { tier: 3 },
    };
  },
};

export const deleteDataTool: Tool = {
  name: 'delete_data',
  description: 'Delete or remove data (critical action - requires permission)',
  requiredTier: 3,
  parameters: [
    {
      name: 'selector',
      type: 'string',
      description: 'CSS selector for the delete button/action',
      required: true,
    },
    {
      name: 'description',
      type: 'string',
      description: 'Description of what will be deleted',
      required: true,
    },
    {
      name: 'confirm',
      type: 'boolean',
      description: 'Whether user has confirmed this action',
      required: true,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    if (!params.confirm) {
      return {
        success: false,
        error: 'Data deletion requires explicit user confirmation',
        metadata: { tier: 3 },
      };
    }
    return {
      success: true,
      data: {
        action: 'delete',
        selector: params.selector,
        description: params.description,
      },
      metadata: { tier: 3 },
    };
  },
};

export const purchaseTool: Tool = {
  name: 'purchase',
  description: 'Complete a purchase or payment (critical action - requires permission)',
  requiredTier: 3,
  parameters: [
    {
      name: 'selector',
      type: 'string',
      description: 'CSS selector for the purchase button',
      required: true,
    },
    {
      name: 'amount',
      type: 'string',
      description: 'Purchase amount',
      required: true,
    },
    {
      name: 'confirm',
      type: 'boolean',
      description: 'Whether user has confirmed this action',
      required: true,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    if (!params.confirm) {
      return {
        success: false,
        error: 'Purchase requires explicit user confirmation',
        metadata: { tier: 3 },
      };
    }
    return {
      success: true,
      data: {
        action: 'purchase',
        selector: params.selector,
        amount: params.amount,
      },
      metadata: { tier: 3 },
    };
  },
};

/**
 * Get all tools organized by tier
 */
export function getAllTools(): Map<CapabilityTier, Tool[]> {
  const tools = new Map<CapabilityTier, Tool[]>();
  
  tools.set(0, [respondTool, thinkTool]);
  tools.set(1, [extractTextTool, extractTableTool, findElementsTool, getPageInfoTool]);
  tools.set(2, [clickTool, fillFieldTool, scrollTool, selectOptionTool, navigateTool]);
  tools.set(3, [submitFormTool, deleteDataTool, purchaseTool]);
  
  return tools;
}

/**
 * Get all tools available at or below a given tier
 */
export function getToolsForTier(maxTier: CapabilityTier): Tool[] {
  const allTools = getAllTools();
  const availableTools: Tool[] = [];
  
  for (let tier = 0; tier <= maxTier; tier++) {
    const tierTools = allTools.get(tier as CapabilityTier);
    if (tierTools) {
      availableTools.push(...tierTools);
    }
  }
  
  return availableTools;
}

/**
 * Get a tool by name
 */
export function getToolByName(name: string): Tool | undefined {
  const allTools = getAllTools();
  
  for (const [, tools] of allTools) {
    const tool = tools.find(t => t.name === name);
    if (tool) return tool;
  }
  
  return undefined;
}
