// Context Injection - Builds the agent context from various sources

import browser from 'webextension-polyfill';
import type { AgentContext, CapabilityTier, FormInfo, LinkInfo, ImageInfo } from './types';

/**
 * Build agent context from current page and user state
 */
export async function buildAgentContext(
  tabId: number,
  options: {
    includePageContent?: boolean;
    includeForms?: boolean;
    includeLinks?: boolean;
    includeImages?: boolean;
  } = {}
): Promise<AgentContext> {
  const {
    includePageContent = true,
    includeForms = true,
    includeLinks = false,
    includeImages = false,
  } = options;

  // Get tab info
  const tab = await browser.tabs.get(tabId);
  
  // Get page context from content script
  let pageData: {
    content?: string;
    forms?: FormInfo[];
    links?: LinkInfo[];
    images?: ImageInfo[];
    description?: string;
  } = {};

  try {
    const response = await browser.tabs.sendMessage(tabId, {
      type: 'GET_PAGE_CONTEXT',
      payload: {
        includeContent: includePageContent,
        includeForms,
        includeLinks,
        includeImages,
        contentLimit: 10000,
      },
      timestamp: Date.now(),
    });
    
    if (response?.success) {
      pageData = response.data;
    }
  } catch (error) {
    console.warn('[WebAgent] Failed to get page context:', error);
  }

  // Get user preferences and permissions from storage
  const storage = await browser.storage.local.get(['permissions', 'settings', 'recentActions']);
  const permissions = storage.permissions || [];
  const settings = storage.settings || {};
  const recentActions = storage.recentActions || [];

  // Determine current permission tier for this domain
  const domain = new URL(tab.url || '').hostname;
  const currentTier = getCurrentTierForDomain(domain, permissions);

  // Get granted domains and actions
  const grantedDomains = permissions
    .filter((p: { tier: CapabilityTier }) => p.tier > 0)
    .map((p: { domain: string }) => p.domain);
    
  const grantedActions = permissions
    .filter((p: { domain: string }) => p.domain === domain)
    .flatMap((p: { tools?: string[] }) => p.tools || []);

  return {
    page: {
      url: tab.url || '',
      title: tab.title || '',
      description: pageData.description,
      content: pageData.content,
      forms: pageData.forms,
      links: pageData.links,
      images: pageData.images,
    },
    user: {
      preferences: settings.preferences || {},
      recentActions: recentActions.slice(-10),
      currentSession: `session_${Date.now()}`,
    },
    permissions: {
      currentTier,
      grantedDomains,
      grantedActions,
    },
    environment: {
      browser: getBrowserName(),
      platform: navigator.platform,
      timestamp: Date.now(),
    },
  };
}

/**
 * Get the current permission tier for a domain
 */
function getCurrentTierForDomain(
  domain: string,
  permissions: Array<{ domain: string; tier: CapabilityTier; expiresAt?: number }>
): CapabilityTier {
  const now = Date.now();
  
  // Find the highest tier granted for this domain
  const domainPermissions = permissions.filter(
    p => (p.domain === domain || p.domain === '*') && 
         (!p.expiresAt || p.expiresAt > now)
  );

  if (domainPermissions.length === 0) {
    return 0; // No permissions, passive only
  }

  return Math.max(...domainPermissions.map(p => p.tier)) as CapabilityTier;
}

/**
 * Get browser name
 */
function getBrowserName(): string {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Firefox')) return 'firefox';
  if (userAgent.includes('Chrome')) return 'chrome';
  if (userAgent.includes('Safari')) return 'safari';
  if (userAgent.includes('Edge')) return 'edge';
  
  return 'unknown';
}

/**
 * Create a minimal context for passive operations
 */
export function createMinimalContext(url: string, title: string): AgentContext {
  return {
    page: {
      url,
      title,
    },
    user: {
      preferences: {},
      recentActions: [],
      currentSession: `session_${Date.now()}`,
    },
    permissions: {
      currentTier: 0,
      grantedDomains: [],
      grantedActions: [],
    },
    environment: {
      browser: getBrowserName(),
      platform: navigator.platform,
      timestamp: Date.now(),
    },
  };
}

/**
 * Format context for LLM prompt
 */
export function formatContextForPrompt(context: AgentContext): string {
  const parts: string[] = [];

  // Page info
  parts.push(`## Current Page`);
  parts.push(`- URL: ${context.page.url}`);
  parts.push(`- Title: ${context.page.title}`);
  if (context.page.description) {
    parts.push(`- Description: ${context.page.description}`);
  }

  // Page content (truncated)
  if (context.page.content) {
    parts.push(`\n### Page Content`);
    parts.push(context.page.content.slice(0, 5000));
  }

  // Forms
  if (context.page.forms && context.page.forms.length > 0) {
    parts.push(`\n### Forms on Page`);
    context.page.forms.forEach((form, i) => {
      parts.push(`\nForm ${i + 1}: ${form.selector}`);
      form.fields.forEach(field => {
        const required = field.required ? ' (required)' : '';
        parts.push(`  - ${field.label || field.name || field.type}: ${field.type}${required}`);
      });
    });
  }

  // Permissions
  parts.push(`\n## Your Capabilities`);
  parts.push(`- Permission Tier: ${context.permissions.currentTier}`);
  if (context.permissions.grantedActions.length > 0) {
    parts.push(`- Allowed Actions: ${context.permissions.grantedActions.join(', ')}`);
  }

  // Recent actions
  if (context.user.recentActions.length > 0) {
    parts.push(`\n## Recent Actions`);
    context.user.recentActions.forEach(action => {
      parts.push(`- ${action}`);
    });
  }

  return parts.join('\n');
}
