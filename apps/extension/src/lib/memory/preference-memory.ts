// Preference Memory - Store and recall user preferences and patterns

import browser from 'webextension-polyfill';

/**
 * User preference types
 */
export type PreferenceCategory = 
  | 'form_data'      // Auto-fill data
  | 'site_settings'  // Per-site preferences
  | 'action_prefs'   // Action preferences
  | 'search_prefs'   // Search preferences
  | 'ui_prefs'       // UI preferences
  | 'custom';        // Custom user-defined

/**
 * Stored preference
 */
export interface StoredPreference {
  id: string;
  category: PreferenceCategory;
  key: string;
  value: unknown;
  domain?: string;  // Optional domain-specific preference
  confidence: number; // 0-1, how confident we are this is accurate
  usageCount: number;
  lastUsedAt: number;
  createdAt: number;
  updatedAt: number;
  source: 'explicit' | 'learned' | 'imported';
  encrypted?: boolean; // For sensitive data
}

/**
 * Form field preference (for auto-fill)
 */
export interface FormFieldPreference {
  fieldType: string;  // email, name, phone, address, etc.
  value: string;
  label?: string;     // Optional label for multiple values (work, home)
  priority: number;   // Higher = more preferred
}

/**
 * Site-specific preference
 */
export interface SitePreference {
  domain: string;
  settings: Record<string, unknown>;
  lastVisitedAt: number;
  visitCount: number;
}

/**
 * Action preference (learned patterns)
 */
export interface ActionPreference {
  actionType: string;
  defaultOptions: Record<string, unknown>;
  frequency: number;
  lastUsedAt: number;
}

// Storage key
const PREFERENCES_KEY = 'user_preferences';
const FORM_DATA_KEY = 'form_preferences';
const SITE_PREFS_KEY = 'site_preferences';

// Cache
let preferencesCache: Map<string, StoredPreference> | null = null;

/**
 * Initialize preference memory
 */
export async function initializePreferenceMemory(): Promise<void> {
  await loadPreferencesCache();
  console.log('[PreferenceMemory] Initialized');
}

/**
 * Load preferences into cache
 */
async function loadPreferencesCache(): Promise<void> {
  const result = await browser.storage.local.get(PREFERENCES_KEY);
  const prefs: StoredPreference[] = result[PREFERENCES_KEY] || [];
  
  preferencesCache = new Map();
  for (const pref of prefs) {
    preferencesCache.set(pref.id, pref);
  }
}

/**
 * Save preferences from cache
 */
async function savePreferencesCache(): Promise<void> {
  if (!preferencesCache) return;
  
  const prefs = Array.from(preferencesCache.values());
  await browser.storage.local.set({ [PREFERENCES_KEY]: prefs });
}

/**
 * Get a preference by key and optional category
 */
export async function getPreference(
  key: string,
  category?: PreferenceCategory,
  domain?: string
): Promise<StoredPreference | null> {
  if (!preferencesCache) await loadPreferencesCache();
  
  for (const pref of preferencesCache!.values()) {
    if (pref.key === key) {
      if (category && pref.category !== category) continue;
      if (domain && pref.domain && pref.domain !== domain) continue;
      return pref;
    }
  }
  
  return null;
}

/**
 * Get all preferences by category
 */
export async function getPreferencesByCategory(
  category: PreferenceCategory,
  domain?: string
): Promise<StoredPreference[]> {
  if (!preferencesCache) await loadPreferencesCache();
  
  const results: StoredPreference[] = [];
  
  for (const pref of preferencesCache!.values()) {
    if (pref.category === category) {
      if (domain && pref.domain && pref.domain !== domain) continue;
      results.push(pref);
    }
  }
  
  return results.sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Set a preference
 */
export async function setPreference(
  key: string,
  value: unknown,
  options: {
    category: PreferenceCategory;
    domain?: string;
    source?: 'explicit' | 'learned' | 'imported';
    confidence?: number;
    encrypted?: boolean;
  }
): Promise<StoredPreference> {
  if (!preferencesCache) await loadPreferencesCache();
  
  const now = Date.now();
  
  // Check for existing preference
  const existingId = findPreferenceId(key, options.category, options.domain);
  
  if (existingId) {
    const existing = preferencesCache!.get(existingId)!;
    const updated: StoredPreference = {
      ...existing,
      value,
      confidence: options.confidence ?? existing.confidence,
      usageCount: existing.usageCount + 1,
      updatedAt: now,
      lastUsedAt: now,
    };
    
    preferencesCache!.set(existingId, updated);
    await savePreferencesCache();
    return updated;
  }
  
  // Create new preference
  const pref: StoredPreference = {
    id: `pref_${now}_${Math.random().toString(36).slice(2, 8)}`,
    category: options.category,
    key,
    value,
    domain: options.domain,
    confidence: options.confidence ?? 1,
    usageCount: 1,
    lastUsedAt: now,
    createdAt: now,
    updatedAt: now,
    source: options.source ?? 'explicit',
    encrypted: options.encrypted,
  };
  
  preferencesCache!.set(pref.id, pref);
  await savePreferencesCache();
  
  return pref;
}

/**
 * Find preference ID by key/category/domain
 */
function findPreferenceId(
  key: string,
  category: PreferenceCategory,
  domain?: string
): string | null {
  if (!preferencesCache) return null;
  
  for (const [id, pref] of preferencesCache) {
    if (pref.key === key && pref.category === category) {
      if (domain && pref.domain !== domain) continue;
      if (!domain && pref.domain) continue;
      return id;
    }
  }
  
  return null;
}

/**
 * Delete a preference
 */
export async function deletePreference(id: string): Promise<void> {
  if (!preferencesCache) await loadPreferencesCache();
  
  preferencesCache!.delete(id);
  await savePreferencesCache();
}

/**
 * Record preference usage (increases confidence)
 */
export async function recordPreferenceUsage(id: string): Promise<void> {
  if (!preferencesCache) await loadPreferencesCache();
  
  const pref = preferencesCache!.get(id);
  if (pref) {
    pref.usageCount++;
    pref.lastUsedAt = Date.now();
    pref.confidence = Math.min(1, pref.confidence + 0.05);
    await savePreferencesCache();
  }
}

// ============================================
// Form Data Preferences
// ============================================

/**
 * Get form data preferences
 */
export async function getFormDataPreferences(): Promise<FormFieldPreference[]> {
  const result = await browser.storage.local.get(FORM_DATA_KEY);
  return result[FORM_DATA_KEY] || [];
}

/**
 * Set form data preference
 */
export async function setFormDataPreference(
  fieldType: string,
  value: string,
  label?: string
): Promise<void> {
  const prefs = await getFormDataPreferences();
  
  // Check for existing
  const existing = prefs.find(
    p => p.fieldType === fieldType && p.label === label
  );
  
  if (existing) {
    existing.value = value;
    existing.priority++;
  } else {
    prefs.push({
      fieldType,
      value,
      label,
      priority: 1,
    });
  }
  
  await browser.storage.local.set({ [FORM_DATA_KEY]: prefs });
}

/**
 * Get form data for a field type
 */
export async function getFormDataForField(
  fieldType: string
): Promise<FormFieldPreference[]> {
  const prefs = await getFormDataPreferences();
  return prefs
    .filter(p => p.fieldType === fieldType)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get all form data as a key-value map
 */
export async function getFormDataMap(): Promise<Record<string, string>> {
  const prefs = await getFormDataPreferences();
  const map: Record<string, string> = {};
  
  // Group by field type and pick highest priority
  const grouped = new Map<string, FormFieldPreference>();
  
  for (const pref of prefs) {
    const existing = grouped.get(pref.fieldType);
    if (!existing || pref.priority > existing.priority) {
      grouped.set(pref.fieldType, pref);
    }
  }
  
  for (const [fieldType, pref] of grouped) {
    map[fieldType] = pref.value;
  }
  
  return map;
}

// ============================================
// Site Preferences
// ============================================

/**
 * Get site preference
 */
export async function getSitePreference(domain: string): Promise<SitePreference | null> {
  const result = await browser.storage.local.get(SITE_PREFS_KEY);
  const prefs: SitePreference[] = result[SITE_PREFS_KEY] || [];
  
  return prefs.find(p => p.domain === domain) || null;
}

/**
 * Update site preference
 */
export async function updateSitePreference(
  domain: string,
  settings: Record<string, unknown>
): Promise<void> {
  const result = await browser.storage.local.get(SITE_PREFS_KEY);
  const prefs: SitePreference[] = result[SITE_PREFS_KEY] || [];
  
  const existing = prefs.find(p => p.domain === domain);
  
  if (existing) {
    existing.settings = { ...existing.settings, ...settings };
    existing.lastVisitedAt = Date.now();
    existing.visitCount++;
  } else {
    prefs.push({
      domain,
      settings,
      lastVisitedAt: Date.now(),
      visitCount: 1,
    });
  }
  
  await browser.storage.local.set({ [SITE_PREFS_KEY]: prefs });
}

/**
 * Record site visit
 */
export async function recordSiteVisit(domain: string): Promise<void> {
  const result = await browser.storage.local.get(SITE_PREFS_KEY);
  const prefs: SitePreference[] = result[SITE_PREFS_KEY] || [];
  
  const existing = prefs.find(p => p.domain === domain);
  
  if (existing) {
    existing.lastVisitedAt = Date.now();
    existing.visitCount++;
  } else {
    prefs.push({
      domain,
      settings: {},
      lastVisitedAt: Date.now(),
      visitCount: 1,
    });
  }
  
  await browser.storage.local.set({ [SITE_PREFS_KEY]: prefs });
}

/**
 * Get frequently visited sites
 */
export async function getFrequentSites(limit: number = 10): Promise<SitePreference[]> {
  const result = await browser.storage.local.get(SITE_PREFS_KEY);
  const prefs: SitePreference[] = result[SITE_PREFS_KEY] || [];
  
  return prefs
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, limit);
}

// ============================================
// Export/Import
// ============================================

/**
 * Export all preferences
 */
export async function exportPreferences(): Promise<{
  preferences: StoredPreference[];
  formData: FormFieldPreference[];
  sitePrefs: SitePreference[];
  exportedAt: number;
}> {
  if (!preferencesCache) await loadPreferencesCache();
  
  const formData = await getFormDataPreferences();
  const sitePrefsResult = await browser.storage.local.get(SITE_PREFS_KEY);
  
  return {
    preferences: Array.from(preferencesCache!.values()),
    formData,
    sitePrefs: sitePrefsResult[SITE_PREFS_KEY] || [],
    exportedAt: Date.now(),
  };
}

/**
 * Import preferences
 */
export async function importPreferences(data: {
  preferences?: StoredPreference[];
  formData?: FormFieldPreference[];
  sitePrefs?: SitePreference[];
}): Promise<void> {
  if (data.preferences) {
    preferencesCache = new Map();
    for (const pref of data.preferences) {
      pref.source = 'imported';
      preferencesCache.set(pref.id, pref);
    }
    await savePreferencesCache();
  }
  
  if (data.formData) {
    await browser.storage.local.set({ [FORM_DATA_KEY]: data.formData });
  }
  
  if (data.sitePrefs) {
    await browser.storage.local.set({ [SITE_PREFS_KEY]: data.sitePrefs });
  }
}

/**
 * Clear all preferences
 */
export async function clearAllPreferences(): Promise<void> {
  preferencesCache = new Map();
  await browser.storage.local.remove([
    PREFERENCES_KEY,
    FORM_DATA_KEY,
    SITE_PREFS_KEY,
  ]);
}
