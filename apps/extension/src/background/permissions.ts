import type { Permission, PermissionTier } from '@/shared/types';
import { PERMISSION_TIER_ACTIONS, TIMEOUTS } from '@/shared/constants';
import { getPermissions, addPermission, clearExpiredPermissions } from './storage';

// Permission tier hierarchy
const TIER_HIERARCHY: PermissionTier[] = ['passive', 'read-only', 'mutable-safe', 'mutable-critical'];

export async function initializePermissions(): Promise<void> {
  // Clear expired permissions on startup
  await clearExpiredPermissions();
  console.log('[MirmirOps] Permissions initialized');
}

export async function checkPermission(
  action: string,
  domain: string,
  requiredTier?: PermissionTier
): Promise<boolean> {
  // Passive actions are always allowed
  const passiveActions = PERMISSION_TIER_ACTIONS.passive as readonly string[];
  if (passiveActions.includes(action)) {
    return true;
  }

  // Get stored permissions
  const permissions = await getPermissions();
  
  // Find matching permission
  const permission = permissions.find(p => {
    // Check domain match (support wildcards)
    const domainMatches = 
      p.domain === '*' || 
      p.domain === domain || 
      (p.domain.startsWith('*.') && domain.endsWith(p.domain.slice(1)));
    
    // Check action match
    const actionMatches = p.action === '*' || p.action === action;
    
    // Check not expired
    const notExpired = !p.expiresAt || p.expiresAt > Date.now();
    
    return domainMatches && actionMatches && notExpired;
  });

  if (!permission) {
    return false;
  }

  // If a required tier is specified, check hierarchy
  if (requiredTier) {
    const permissionTierIndex = TIER_HIERARCHY.indexOf(permission.tier);
    const requiredTierIndex = TIER_HIERARCHY.indexOf(requiredTier);
    return permissionTierIndex >= requiredTierIndex;
  }

  return true;
}

export async function requestPermission(
  action: string,
  domain: string,
  tier: PermissionTier
): Promise<boolean> {
  // In a full implementation, this would show a UI prompt
  // For now, we auto-grant with expiration for safety
  
  const permission: Permission = {
    tier,
    action,
    domain,
    grantedAt: Date.now(),
    expiresAt: Date.now() + TIMEOUTS.PERMISSION_EXPIRY, // 1 hour default
  };

  await addPermission(permission);
  console.log(`[MirmirOps] Permission granted: ${action} on ${domain} (tier: ${tier})`);
  
  return true;
}

export function getRequiredTier(action: string): PermissionTier {
  for (const [tier, actions] of Object.entries(PERMISSION_TIER_ACTIONS)) {
    if ((actions as readonly string[]).includes(action)) {
      return tier as PermissionTier;
    }
  }
  return 'mutable-critical'; // Default to highest tier for unknown actions
}

export function getTierDescription(tier: PermissionTier): string {
  switch (tier) {
    case 'passive':
      return 'Read-only observation (no page interaction)';
    case 'read-only':
      return 'Navigate and view content (no modifications)';
    case 'mutable-safe':
      return 'Fill forms and click buttons (reversible actions)';
    case 'mutable-critical':
      return 'Submit forms and download files (irreversible actions)';
  }
}

export function getActionDescription(action: string): string {
  const descriptions: Record<string, string> = {
    navigate: 'Navigate to a URL',
    click: 'Click on an element',
    type: 'Type text into a field',
    scroll: 'Scroll the page',
    extract: 'Extract data from the page',
    wait: 'Wait for an element',
    screenshot: 'Take a screenshot',
    copy: 'Copy text to clipboard',
    paste: 'Paste from clipboard',
    select: 'Select text',
    hover: 'Hover over an element',
    'fill-form': 'Fill a form field',
    submit: 'Submit a form',
    download: 'Download a file',
  };
  return descriptions[action] || action;
}
