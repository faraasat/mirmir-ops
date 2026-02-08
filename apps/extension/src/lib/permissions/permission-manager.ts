// Permission Manager - Advanced permission system with domain rules

import browser from 'webextension-polyfill';
import type { Permission, PermissionTier } from '@/shared/types';
import { STORAGE_KEYS } from '@/shared/constants';

/**
 * Domain permission rule
 */
export interface DomainRule {
  id: string;
  domain: string; // Can be wildcard: *.example.com or exact
  tier: PermissionTier;
  actions: string[]; // Allowed actions, or ['*'] for all
  createdAt: number;
  expiresAt?: number;
  autoGrant: boolean; // Auto-grant without prompt
  notes?: string;
}

/**
 * Permission request for user confirmation
 */
export interface PermissionRequest {
  id: string;
  action: string;
  domain: string;
  tier: PermissionTier;
  timestamp: number;
  context?: {
    url?: string;
    element?: string;
    description?: string;
  };
  status: 'pending' | 'granted' | 'denied' | 'expired';
}

/**
 * Permission audit log entry
 */
export interface PermissionAuditEntry {
  id: string;
  timestamp: number;
  action: string;
  domain: string;
  tier: PermissionTier;
  granted: boolean;
  source: 'rule' | 'prompt' | 'auto';
  requestId?: string;
}

// Storage keys
const DOMAIN_RULES_KEY = 'permission_domain_rules';
const PENDING_REQUESTS_KEY = 'permission_pending_requests';
const AUDIT_LOG_KEY = 'permission_audit_log';

// Permission tier hierarchy
const TIER_HIERARCHY: PermissionTier[] = ['passive', 'read-only', 'mutable-safe', 'mutable-critical'];

// Callbacks for pending requests
const pendingRequestCallbacks = new Map<string, {
  resolve: (granted: boolean) => void;
  reject: (error: Error) => void;
}>();

/**
 * Initialize permission manager
 */
export async function initializePermissionManager(): Promise<void> {
  // Clean up expired rules and permissions
  await cleanupExpiredRules();
  await cleanupExpiredRequests();
  
  console.log('[PermissionManager] Initialized');
}

/**
 * Check if an action is permitted for a domain
 */
export async function isPermitted(
  action: string,
  domain: string,
  requiredTier: PermissionTier = 'passive'
): Promise<{ permitted: boolean; source?: 'rule' | 'permission' | 'passive' }> {
  // Passive actions are always allowed
  if (requiredTier === 'passive' || isPassiveAction(action)) {
    return { permitted: true, source: 'passive' };
  }
  
  // Check domain rules first
  const rule = await findMatchingRule(domain, action);
  if (rule) {
    const tierIndex = TIER_HIERARCHY.indexOf(rule.tier);
    const requiredIndex = TIER_HIERARCHY.indexOf(requiredTier);
    
    if (tierIndex >= requiredIndex) {
      // Log the permission check
      await logAuditEntry({
        action,
        domain,
        tier: requiredTier,
        granted: true,
        source: 'rule',
      });
      
      return { permitted: true, source: 'rule' };
    }
  }
  
  // Check stored permissions
  const permissions = await getStoredPermissions();
  const permission = permissions.find(p => {
    const domainMatches = matchDomain(p.domain, domain);
    const actionMatches = p.action === '*' || p.action === action;
    const notExpired = !p.expiresAt || p.expiresAt > Date.now();
    const tierSufficient = TIER_HIERARCHY.indexOf(p.tier) >= TIER_HIERARCHY.indexOf(requiredTier);
    
    return domainMatches && actionMatches && notExpired && tierSufficient;
  });
  
  if (permission) {
    await logAuditEntry({
      action,
      domain,
      tier: requiredTier,
      granted: true,
      source: 'auto',
    });
    
    return { permitted: true, source: 'permission' };
  }
  
  return { permitted: false };
}

/**
 * Request permission with optional user prompt
 */
export async function requestPermission(
  action: string,
  domain: string,
  tier: PermissionTier,
  context?: PermissionRequest['context']
): Promise<boolean> {
  // Check if already permitted
  const { permitted } = await isPermitted(action, domain, tier);
  if (permitted) {
    return true;
  }
  
  // Check if there's a matching auto-grant rule
  const rule = await findMatchingRule(domain, action);
  if (rule?.autoGrant) {
    // Grant permission based on rule
    await grantPermission(action, domain, tier);
    
    await logAuditEntry({
      action,
      domain,
      tier,
      granted: true,
      source: 'rule',
    });
    
    return true;
  }
  
  // Create pending request
  const request: PermissionRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action,
    domain,
    tier,
    timestamp: Date.now(),
    context,
    status: 'pending',
  };
  
  // Store pending request
  await addPendingRequest(request);
  
  // Send message to UI for user confirmation
  browser.runtime.sendMessage({
    type: 'PERMISSION_REQUEST',
    payload: request,
    timestamp: Date.now(),
  }).catch(() => {
    // UI might not be open
  });
  
  // Wait for response with timeout
  return new Promise((resolve, reject) => {
    const timeoutMs = 60000; // 1 minute timeout
    
    const timeout = setTimeout(() => {
      pendingRequestCallbacks.delete(request.id);
      updateRequestStatus(request.id, 'expired');
      resolve(false);
    }, timeoutMs);
    
    pendingRequestCallbacks.set(request.id, {
      resolve: (granted) => {
        clearTimeout(timeout);
        pendingRequestCallbacks.delete(request.id);
        resolve(granted);
      },
      reject: (error) => {
        clearTimeout(timeout);
        pendingRequestCallbacks.delete(request.id);
        reject(error);
      },
    });
  });
}

/**
 * Handle user response to permission request
 */
export async function handlePermissionResponse(
  requestId: string,
  granted: boolean,
  remember: boolean = false,
  duration?: number // Duration in ms to remember, undefined = session only
): Promise<void> {
  const requests = await getPendingRequests();
  const request = requests.find(r => r.id === requestId);
  
  if (!request) {
    console.error('[PermissionManager] Request not found:', requestId);
    return;
  }
  
  // Update request status
  await updateRequestStatus(requestId, granted ? 'granted' : 'denied');
  
  // If granted and remember, store the permission
  if (granted && remember) {
    await grantPermission(
      request.action,
      request.domain,
      request.tier,
      duration ? Date.now() + duration : undefined
    );
  }
  
  // Log audit entry
  await logAuditEntry({
    action: request.action,
    domain: request.domain,
    tier: request.tier,
    granted,
    source: 'prompt',
    requestId,
  });
  
  // Resolve pending callback
  const callback = pendingRequestCallbacks.get(requestId);
  if (callback) {
    callback.resolve(granted);
  }
}

/**
 * Grant a permission
 */
export async function grantPermission(
  action: string,
  domain: string,
  tier: PermissionTier,
  expiresAt?: number
): Promise<void> {
  const permissions = await getStoredPermissions();
  
  // Remove existing permission for same action/domain
  const filtered = permissions.filter(
    p => !(p.action === action && p.domain === domain)
  );
  
  filtered.push({
    tier,
    action,
    domain,
    grantedAt: Date.now(),
    expiresAt,
  });
  
  await browser.storage.local.set({ [STORAGE_KEYS.PERMISSIONS]: filtered });
}

/**
 * Revoke a permission
 */
export async function revokePermission(action: string, domain: string): Promise<void> {
  const permissions = await getStoredPermissions();
  const filtered = permissions.filter(
    p => !(p.action === action && p.domain === domain)
  );
  
  await browser.storage.local.set({ [STORAGE_KEYS.PERMISSIONS]: filtered });
  
  await logAuditEntry({
    action,
    domain,
    tier: 'passive',
    granted: false,
    source: 'prompt',
  });
}

/**
 * Add a domain rule
 */
export async function addDomainRule(rule: Omit<DomainRule, 'id' | 'createdAt'>): Promise<DomainRule> {
  const rules = await getDomainRules();
  
  const newRule: DomainRule = {
    ...rule,
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  
  // Remove existing rule for same domain
  const filtered = rules.filter(r => r.domain !== rule.domain);
  filtered.push(newRule);
  
  await browser.storage.local.set({ [DOMAIN_RULES_KEY]: filtered });
  
  return newRule;
}

/**
 * Remove a domain rule
 */
export async function removeDomainRule(ruleId: string): Promise<void> {
  const rules = await getDomainRules();
  const filtered = rules.filter(r => r.id !== ruleId);
  
  await browser.storage.local.set({ [DOMAIN_RULES_KEY]: filtered });
}

/**
 * Update a domain rule
 */
export async function updateDomainRule(
  ruleId: string,
  updates: Partial<Omit<DomainRule, 'id' | 'createdAt'>>
): Promise<void> {
  const rules = await getDomainRules();
  const index = rules.findIndex(r => r.id === ruleId);
  
  if (index !== -1) {
    rules[index] = { ...rules[index], ...updates };
    await browser.storage.local.set({ [DOMAIN_RULES_KEY]: rules });
  }
}

/**
 * Get all domain rules
 */
export async function getDomainRules(): Promise<DomainRule[]> {
  const result = await browser.storage.local.get(DOMAIN_RULES_KEY);
  return result[DOMAIN_RULES_KEY] || [];
}

/**
 * Get stored permissions
 */
export async function getStoredPermissions(): Promise<Permission[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.PERMISSIONS);
  return result[STORAGE_KEYS.PERMISSIONS] || [];
}

/**
 * Get pending permission requests
 */
export async function getPendingRequests(): Promise<PermissionRequest[]> {
  const result = await browser.storage.local.get(PENDING_REQUESTS_KEY);
  return (result[PENDING_REQUESTS_KEY] || []).filter(
    (r: PermissionRequest) => r.status === 'pending'
  );
}

/**
 * Get permission audit log
 */
export async function getAuditLog(limit: number = 100): Promise<PermissionAuditEntry[]> {
  const result = await browser.storage.local.get(AUDIT_LOG_KEY);
  const log: PermissionAuditEntry[] = result[AUDIT_LOG_KEY] || [];
  
  return log.slice(-limit).reverse();
}

/**
 * Clear audit log
 */
export async function clearAuditLog(): Promise<void> {
  await browser.storage.local.set({ [AUDIT_LOG_KEY]: [] });
}

// Helper functions

async function findMatchingRule(domain: string, action: string): Promise<DomainRule | null> {
  const rules = await getDomainRules();
  
  return rules.find(rule => {
    const domainMatches = matchDomain(rule.domain, domain);
    const actionMatches = rule.actions.includes('*') || rule.actions.includes(action);
    const notExpired = !rule.expiresAt || rule.expiresAt > Date.now();
    
    return domainMatches && actionMatches && notExpired;
  }) || null;
}

function matchDomain(pattern: string, domain: string): boolean {
  if (pattern === '*') return true;
  if (pattern === domain) return true;
  
  // Wildcard subdomain match: *.example.com
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // .example.com
    return domain.endsWith(suffix) || domain === pattern.slice(2);
  }
  
  return false;
}

function isPassiveAction(action: string): boolean {
  const passiveActions = ['extract', 'get-context', 'observe', 'wait'];
  return passiveActions.includes(action);
}

async function addPendingRequest(request: PermissionRequest): Promise<void> {
  const result = await browser.storage.local.get(PENDING_REQUESTS_KEY);
  const requests: PermissionRequest[] = result[PENDING_REQUESTS_KEY] || [];
  
  requests.push(request);
  
  await browser.storage.local.set({ [PENDING_REQUESTS_KEY]: requests });
}

async function updateRequestStatus(
  requestId: string,
  status: PermissionRequest['status']
): Promise<void> {
  const result = await browser.storage.local.get(PENDING_REQUESTS_KEY);
  const requests: PermissionRequest[] = result[PENDING_REQUESTS_KEY] || [];
  
  const index = requests.findIndex(r => r.id === requestId);
  if (index !== -1) {
    requests[index].status = status;
    await browser.storage.local.set({ [PENDING_REQUESTS_KEY]: requests });
  }
}

async function logAuditEntry(
  entry: Omit<PermissionAuditEntry, 'id' | 'timestamp'>
): Promise<void> {
  const result = await browser.storage.local.get(AUDIT_LOG_KEY);
  const log: PermissionAuditEntry[] = result[AUDIT_LOG_KEY] || [];
  
  log.push({
    ...entry,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  });
  
  // Keep only last 1000 entries
  const trimmed = log.slice(-1000);
  
  await browser.storage.local.set({ [AUDIT_LOG_KEY]: trimmed });
}

async function cleanupExpiredRules(): Promise<void> {
  const rules = await getDomainRules();
  const now = Date.now();
  const valid = rules.filter(r => !r.expiresAt || r.expiresAt > now);
  
  if (valid.length !== rules.length) {
    await browser.storage.local.set({ [DOMAIN_RULES_KEY]: valid });
  }
}

async function cleanupExpiredRequests(): Promise<void> {
  const result = await browser.storage.local.get(PENDING_REQUESTS_KEY);
  const requests: PermissionRequest[] = result[PENDING_REQUESTS_KEY] || [];
  const now = Date.now();
  const timeout = 60000; // 1 minute
  
  const valid = requests.filter(r => {
    if (r.status !== 'pending') return true;
    return now - r.timestamp < timeout;
  });
  
  // Mark expired requests
  const updated = valid.map(r => {
    if (r.status === 'pending' && now - r.timestamp >= timeout) {
      return { ...r, status: 'expired' as const };
    }
    return r;
  });
  
  if (updated.length !== requests.length) {
    await browser.storage.local.set({ [PENDING_REQUESTS_KEY]: updated });
  }
}

/**
 * Get permissions summary for a domain
 */
export async function getDomainPermissionsSummary(domain: string): Promise<{
  rules: DomainRule[];
  permissions: Permission[];
  highestTier: PermissionTier | null;
}> {
  const rules = (await getDomainRules()).filter(r => matchDomain(r.domain, domain));
  const permissions = (await getStoredPermissions()).filter(p => matchDomain(p.domain, domain));
  
  let highestTier: PermissionTier | null = null;
  
  for (const rule of rules) {
    const index = TIER_HIERARCHY.indexOf(rule.tier);
    const currentIndex = highestTier ? TIER_HIERARCHY.indexOf(highestTier) : -1;
    if (index > currentIndex) {
      highestTier = rule.tier;
    }
  }
  
  for (const perm of permissions) {
    const index = TIER_HIERARCHY.indexOf(perm.tier);
    const currentIndex = highestTier ? TIER_HIERARCHY.indexOf(highestTier) : -1;
    if (index > currentIndex) {
      highestTier = perm.tier;
    }
  }
  
  return { rules, permissions, highestTier };
}
