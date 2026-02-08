import browser from 'webextension-polyfill';
import type { StorageData, UserSettings, UsageStats, Permission } from '@/shared/types';
import { DEFAULT_SETTINGS, PLAN_LIMITS } from '@/shared/types';
import { STORAGE_KEYS } from '@/shared/constants';

const DEFAULT_USAGE: UsageStats = {
  cloudLlmRequests: 0,
  byokRequests: 0,
  voiceCommands: 0,
  activeShadowTabs: 0,
  savedWorkflows: 0,
  activeScheduledWorkflows: 0,
  semanticMemoryUsed: 0,
  lastSyncedAt: Date.now(),
};

export async function initializeStorage(): Promise<void> {
  const existing = await browser.storage.local.get([
    STORAGE_KEYS.SETTINGS,
    STORAGE_KEYS.USAGE,
    STORAGE_KEYS.PERMISSIONS,
  ]);

  // Initialize settings if not present
  if (!existing[STORAGE_KEYS.SETTINGS]) {
    await browser.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
    });
  }

  // Initialize usage if not present
  if (!existing[STORAGE_KEYS.USAGE]) {
    await browser.storage.local.set({
      [STORAGE_KEYS.USAGE]: DEFAULT_USAGE,
    });
  }

  // Initialize permissions if not present
  if (!existing[STORAGE_KEYS.PERMISSIONS]) {
    await browser.storage.local.set({
      [STORAGE_KEYS.PERMISSIONS]: [],
    });
  }

  console.log('[MirmirOps] Storage initialized');
}

export async function getSettings(): Promise<UserSettings> {
  const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
  return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
}

export async function updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  await browser.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
  return updated;
}

export async function getUsage(): Promise<UsageStats> {
  const result = await browser.storage.local.get(STORAGE_KEYS.USAGE);
  return result[STORAGE_KEYS.USAGE] || DEFAULT_USAGE;
}

export async function updateUsage(updates: Partial<UsageStats>): Promise<UsageStats> {
  const current = await getUsage();
  const updated = { ...current, ...updates };
  await browser.storage.local.set({ [STORAGE_KEYS.USAGE]: updated });
  return updated;
}

export async function incrementUsage(key: keyof UsageStats): Promise<void> {
  const current = await getUsage();
  if (typeof current[key] === 'number') {
    await updateUsage({ [key]: (current[key] as number) + 1 });
  }
}

export async function getPermissions(): Promise<Permission[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.PERMISSIONS);
  return result[STORAGE_KEYS.PERMISSIONS] || [];
}

export async function addPermission(permission: Permission): Promise<void> {
  const permissions = await getPermissions();
  
  // Remove existing permission for same action/domain
  const filtered = permissions.filter(
    p => !(p.action === permission.action && p.domain === permission.domain)
  );
  
  filtered.push(permission);
  await browser.storage.local.set({ [STORAGE_KEYS.PERMISSIONS]: filtered });
}

export async function removePermission(action: string, domain: string): Promise<void> {
  const permissions = await getPermissions();
  const filtered = permissions.filter(
    p => !(p.action === action && p.domain === domain)
  );
  await browser.storage.local.set({ [STORAGE_KEYS.PERMISSIONS]: filtered });
}

export async function clearExpiredPermissions(): Promise<void> {
  const permissions = await getPermissions();
  const now = Date.now();
  const valid = permissions.filter(p => !p.expiresAt || p.expiresAt > now);
  await browser.storage.local.set({ [STORAGE_KEYS.PERMISSIONS]: valid });
}

export async function getUser(): Promise<StorageData['user'] | null> {
  const result = await browser.storage.local.get(STORAGE_KEYS.USER);
  return result[STORAGE_KEYS.USER] || null;
}

export async function setUser(user: StorageData['user'] | null): Promise<void> {
  if (user) {
    await browser.storage.local.set({ [STORAGE_KEYS.USER]: user });
  } else {
    await browser.storage.local.remove(STORAGE_KEYS.USER);
  }
}

export async function getCurrentPlanLimits() {
  const user = await getUser();
  const planType = user?.plan || 'free';
  return PLAN_LIMITS[planType];
}

// Reset daily/monthly counters
export async function resetDailyCounters(): Promise<void> {
  await updateUsage({
    voiceCommands: 0,
  });
}

export async function resetMonthlyCounters(): Promise<void> {
  await updateUsage({
    cloudLlmRequests: 0,
    byokRequests: 0,
  });
}
