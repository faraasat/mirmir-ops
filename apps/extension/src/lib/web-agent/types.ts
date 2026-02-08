// Web Agent API Types - Based on Mozilla's Web Agent API concepts

/**
 * Capability Tiers for graduated permissions
 * 
 * Tier 0 (Passive): Receive context, generate text only
 * Tier 1 (Read-Only): Read DOM, extract data
 * Tier 2 (Mutable Safe): Safe mutations (fill forms, scroll)
 * Tier 3 (Mutable Critical): Critical mutations (submit, purchase, delete)
 */
export type CapabilityTier = 0 | 1 | 2 | 3;

export const CAPABILITY_TIER_NAMES: Record<CapabilityTier, string> = {
  0: 'Passive',
  1: 'Read-Only',
  2: 'Mutable Safe',
  3: 'Mutable Critical',
};

export const CAPABILITY_TIER_DESCRIPTIONS: Record<CapabilityTier, string> = {
  0: 'Can only receive context and generate text responses',
  1: 'Can read page content and extract data',
  2: 'Can fill forms, scroll, and click non-critical elements',
  3: 'Can submit forms, make purchases, delete data',
};

/**
 * Tool Definition for the agent
 */
export interface Tool {
  name: string;
  description: string;
  requiredTier: CapabilityTier;
  parameters: ToolParameter[];
  execute: (params: Record<string, unknown>, context: AgentContext) => Promise<ToolResult>;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    duration?: number;
    tier?: CapabilityTier;
  };
}

/**
 * Agent Context - Injected information available to the agent
 */
export interface AgentContext {
  // Page context
  page: {
    url: string;
    title: string;
    description?: string;
    content?: string;
    forms?: FormInfo[];
    links?: LinkInfo[];
    images?: ImageInfo[];
  };

  // User context
  user: {
    preferences: Record<string, unknown>;
    recentActions: string[];
    currentSession: string;
  };

  // Permissions
  permissions: {
    currentTier: CapabilityTier;
    grantedDomains: string[];
    grantedActions: string[];
  };

  // Environment
  environment: {
    browser: string;
    platform: string;
    timestamp: number;
  };
}

export interface FormInfo {
  selector: string;
  id?: string;
  name?: string;
  action?: string;
  method?: string;
  fields: FormFieldInfo[];
}

export interface FormFieldInfo {
  selector: string;
  type: string;
  name?: string;
  label?: string;
  placeholder?: string;
  required: boolean;
  value?: string;
}

export interface LinkInfo {
  href: string;
  text: string;
  selector: string;
}

export interface ImageInfo {
  src: string;
  alt?: string;
  selector: string;
}

/**
 * Action Request from agent
 */
export interface ActionRequest {
  tool: string;
  parameters: Record<string, unknown>;
  rationale?: string;
  estimatedImpact?: 'low' | 'medium' | 'high';
}

/**
 * Permission Request for elevated capabilities
 */
export interface PermissionRequest {
  tier: CapabilityTier;
  tool: string;
  domain: string;
  rationale: string;
  duration?: 'once' | 'session' | 'permanent';
}

/**
 * Permission Grant
 */
export interface PermissionGrant {
  tier: CapabilityTier;
  domain: string;
  tools: string[];
  grantedAt: number;
  expiresAt?: number;
  scope: 'once' | 'session' | 'permanent';
}

/**
 * Agent Response
 */
export interface AgentResponse {
  message: string;
  actions?: ActionRequest[];
  requiresPermission?: PermissionRequest;
  toolResults?: ToolResult[];
}
