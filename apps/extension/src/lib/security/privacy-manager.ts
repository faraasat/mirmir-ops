// Privacy Manager - User privacy controls and data management

import browser from 'webextension-polyfill';

/**
 * Privacy settings
 */
export interface PrivacySettings {
  // Data collection
  collectAnalytics: boolean;
  collectUsageData: boolean;
  collectErrorReports: boolean;
  
  // Data sharing
  shareAnonymizedData: boolean;
  allowThirdPartyIntegrations: boolean;
  
  // Data retention
  retentionPeriod: 'week' | 'month' | 'quarter' | 'year' | 'forever';
  autoDeleteHistory: boolean;
  autoDeleteInterval: number; // days
  
  // Content settings
  rememberFormData: boolean;
  rememberSearchHistory: boolean;
  rememberBrowsingHistory: boolean;
  
  // Privacy features
  incognitoMode: boolean;
  blockTrackers: boolean;
  stripQueryParams: boolean;
  
  // LLM privacy
  sendPageContentToLLM: boolean;
  localLLMPreferred: boolean;
  anonymizePrompts: boolean;
  
  // Export/Delete
  exportFormat: 'json' | 'csv';
}

/**
 * Data category for privacy operations
 */
export type PrivacyDataCategory =
  | 'browsing_history'
  | 'search_history'
  | 'form_data'
  | 'credentials'
  | 'analytics'
  | 'preferences'
  | 'memory'
  | 'workflows'
  | 'all';

/**
 * Data export result
 */
export interface DataExport {
  exportedAt: number;
  categories: PrivacyDataCategory[];
  data: Record<string, unknown>;
  version: number;
}

// Storage keys
const PRIVACY_SETTINGS_KEY = 'privacy_settings';
const TRACKING_CONSENT_KEY = 'tracking_consent';
const DATA_REQUESTS_KEY = 'data_requests';

// Default settings
const DEFAULT_SETTINGS: PrivacySettings = {
  collectAnalytics: true,
  collectUsageData: true,
  collectErrorReports: true,
  shareAnonymizedData: false,
  allowThirdPartyIntegrations: true,
  retentionPeriod: 'month',
  autoDeleteHistory: true,
  autoDeleteInterval: 30,
  rememberFormData: true,
  rememberSearchHistory: true,
  rememberBrowsingHistory: true,
  incognitoMode: false,
  blockTrackers: false,
  stripQueryParams: false,
  sendPageContentToLLM: true,
  localLLMPreferred: false,
  anonymizePrompts: false,
  exportFormat: 'json',
};

/**
 * Get privacy settings
 */
export async function getPrivacySettings(): Promise<PrivacySettings> {
  const result = await browser.storage.local.get(PRIVACY_SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...result[PRIVACY_SETTINGS_KEY] };
}

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(
  updates: Partial<PrivacySettings>
): Promise<PrivacySettings> {
  const current = await getPrivacySettings();
  const updated = { ...current, ...updates };
  
  await browser.storage.local.set({ [PRIVACY_SETTINGS_KEY]: updated });
  
  // Apply settings that need immediate action
  if (updates.incognitoMode !== undefined) {
    await applyIncognitoMode(updates.incognitoMode);
  }
  
  return updated;
}

/**
 * Apply incognito mode settings
 */
async function applyIncognitoMode(enabled: boolean): Promise<void> {
  if (enabled) {
    // Disable all data collection
    await updatePrivacySettings({
      collectAnalytics: false,
      collectUsageData: false,
      rememberFormData: false,
      rememberSearchHistory: false,
      rememberBrowsingHistory: false,
    });
  }
  
  console.log(`[PrivacyManager] Incognito mode ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Get tracking consent status
 */
export async function getTrackingConsent(): Promise<{
  consented: boolean;
  consentedAt: number | null;
  version: string;
}> {
  const result = await browser.storage.local.get(TRACKING_CONSENT_KEY);
  return result[TRACKING_CONSENT_KEY] || {
    consented: false,
    consentedAt: null,
    version: '1.0',
  };
}

/**
 * Set tracking consent
 */
export async function setTrackingConsent(consented: boolean): Promise<void> {
  await browser.storage.local.set({
    [TRACKING_CONSENT_KEY]: {
      consented,
      consentedAt: Date.now(),
      version: '1.0',
    },
  });
  
  // Update privacy settings based on consent
  if (!consented) {
    await updatePrivacySettings({
      collectAnalytics: false,
      collectUsageData: false,
      shareAnonymizedData: false,
    });
  }
}

/**
 * Export user data
 */
export async function exportUserData(
  categories: PrivacyDataCategory[]
): Promise<DataExport> {
  const data: Record<string, unknown> = {};
  
  const exportAll = categories.includes('all');
  
  // Browsing history
  if (exportAll || categories.includes('browsing_history')) {
    const historyResult = await browser.storage.local.get('action_history');
    data.browsing_history = historyResult.action_history || [];
  }
  
  // Search history
  if (exportAll || categories.includes('search_history')) {
    const searchResult = await browser.storage.local.get('short_term_context');
    const context = searchResult.short_term_context || {};
    data.search_history = context.recentSearches || [];
  }
  
  // Form data
  if (exportAll || categories.includes('form_data')) {
    const formResult = await browser.storage.local.get('form_preferences');
    data.form_data = formResult.form_preferences || [];
  }
  
  // Preferences
  if (exportAll || categories.includes('preferences')) {
    const prefsResult = await browser.storage.local.get([
      'user_preferences',
      'site_preferences',
      'privacy_settings',
      'theme_settings',
    ]);
    data.preferences = prefsResult;
  }
  
  // Memory
  if (exportAll || categories.includes('memory')) {
    const memoryResult = await browser.storage.local.get([
      'semantic_memory',
      'learned_patterns',
    ]);
    data.memory = memoryResult;
  }
  
  // Workflows
  if (exportAll || categories.includes('workflows')) {
    const workflowResult = await browser.storage.local.get('saved_workflows');
    data.workflows = workflowResult.saved_workflows || [];
  }
  
  // Analytics
  if (exportAll || categories.includes('analytics')) {
    const analyticsResult = await browser.storage.local.get([
      'analytics_events',
      'daily_analytics',
    ]);
    data.analytics = analyticsResult;
  }
  
  const exportData: DataExport = {
    exportedAt: Date.now(),
    categories: exportAll ? ['all'] : categories,
    data,
    version: 1,
  };
  
  // Track export request
  await trackDataRequest('export', categories);
  
  return exportData;
}

/**
 * Delete user data
 */
export async function deleteUserData(
  categories: PrivacyDataCategory[]
): Promise<{ deleted: string[]; errors: string[] }> {
  const deleted: string[] = [];
  const errors: string[] = [];
  const deleteAll = categories.includes('all');
  
  try {
    // Browsing history
    if (deleteAll || categories.includes('browsing_history')) {
      await browser.storage.local.remove('action_history');
      deleted.push('browsing_history');
    }
    
    // Search history
    if (deleteAll || categories.includes('search_history')) {
      const result = await browser.storage.local.get('short_term_context');
      const context = result.short_term_context || {};
      context.recentSearches = [];
      context.recentPages = [];
      await browser.storage.local.set({ short_term_context: context });
      deleted.push('search_history');
    }
    
    // Form data
    if (deleteAll || categories.includes('form_data')) {
      await browser.storage.local.remove('form_preferences');
      deleted.push('form_data');
    }
    
    // Credentials (secure storage)
    if (deleteAll || categories.includes('credentials')) {
      await browser.storage.local.remove('secure_storage');
      deleted.push('credentials');
    }
    
    // Preferences
    if (deleteAll || categories.includes('preferences')) {
      await browser.storage.local.remove([
        'user_preferences',
        'site_preferences',
      ]);
      deleted.push('preferences');
    }
    
    // Memory
    if (deleteAll || categories.includes('memory')) {
      await browser.storage.local.remove([
        'semantic_memory',
        'embedding_cache',
        'learned_patterns',
        'user_feedback',
        'conversation_sessions',
      ]);
      deleted.push('memory');
    }
    
    // Workflows
    if (deleteAll || categories.includes('workflows')) {
      await browser.storage.local.remove('saved_workflows');
      deleted.push('workflows');
    }
    
    // Analytics
    if (deleteAll || categories.includes('analytics')) {
      await browser.storage.local.remove([
        'analytics_events',
        'daily_analytics',
      ]);
      deleted.push('analytics');
    }
  } catch (error) {
    errors.push(String(error));
  }
  
  // Track deletion request
  await trackDataRequest('delete', categories);
  
  return { deleted, errors };
}

/**
 * Track data request (for audit trail)
 */
async function trackDataRequest(
  type: 'export' | 'delete',
  categories: PrivacyDataCategory[]
): Promise<void> {
  const result = await browser.storage.local.get(DATA_REQUESTS_KEY);
  const requests: Array<{
    type: string;
    categories: string[];
    timestamp: number;
  }> = result[DATA_REQUESTS_KEY] || [];
  
  requests.push({
    type,
    categories,
    timestamp: Date.now(),
  });
  
  // Keep last 100 requests
  const trimmed = requests.slice(-100);
  await browser.storage.local.set({ [DATA_REQUESTS_KEY]: trimmed });
}

/**
 * Get data request history
 */
export async function getDataRequestHistory(): Promise<Array<{
  type: string;
  categories: string[];
  timestamp: number;
}>> {
  const result = await browser.storage.local.get(DATA_REQUESTS_KEY);
  return result[DATA_REQUESTS_KEY] || [];
}

/**
 * Check if data collection is allowed
 */
export async function isDataCollectionAllowed(type: 'analytics' | 'usage' | 'errors'): Promise<boolean> {
  const settings = await getPrivacySettings();
  const consent = await getTrackingConsent();
  
  if (settings.incognitoMode) return false;
  if (!consent.consented) return false;
  
  switch (type) {
    case 'analytics':
      return settings.collectAnalytics;
    case 'usage':
      return settings.collectUsageData;
    case 'errors':
      return settings.collectErrorReports;
    default:
      return false;
  }
}

/**
 * Anonymize data before sending to LLM
 */
export function anonymizeForLLM(text: string): string {
  // Email addresses
  let anonymized = text.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL]'
  );
  
  // Phone numbers
  anonymized = anonymized.replace(
    /(\+?\d{1,4}[\s-]?)?\(?\d{1,4}\)?[\s-]?\d{1,4}[\s-]?\d{1,9}/g,
    '[PHONE]'
  );
  
  // Credit card numbers
  anonymized = anonymized.replace(
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    '[CARD]'
  );
  
  // Social Security Numbers
  anonymized = anonymized.replace(
    /\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g,
    '[SSN]'
  );
  
  // IP addresses
  anonymized = anonymized.replace(
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    '[IP]'
  );
  
  // URLs with sensitive paths
  anonymized = anonymized.replace(
    /https?:\/\/[^\s]+\/(?:admin|login|dashboard|account|settings|profile)[^\s]*/gi,
    '[SENSITIVE_URL]'
  );
  
  return anonymized;
}

/**
 * Strip tracking parameters from URLs
 */
export function stripTrackingParams(url: string): string {
  const trackingParams = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'gclsrc', 'dclid',
    'msclkid', 'twclid', 'igshid',
    '_ga', '_gl', '_hsenc', '_hsmi',
    'mc_cid', 'mc_eid',
    'ref', 'ref_src', 'ref_url',
    'source', 'src',
  ];
  
  try {
    const urlObj = new URL(url);
    
    for (const param of trackingParams) {
      urlObj.searchParams.delete(param);
    }
    
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Calculate retention date based on settings
 */
export async function getRetentionDate(): Promise<Date> {
  const settings = await getPrivacySettings();
  const now = new Date();
  
  switch (settings.retentionPeriod) {
    case 'week':
      now.setDate(now.getDate() - 7);
      break;
    case 'month':
      now.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      now.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      now.setFullYear(now.getFullYear() - 1);
      break;
    case 'forever':
      return new Date(0); // Beginning of time
  }
  
  return now;
}

/**
 * Reset privacy settings to defaults
 */
export async function resetPrivacySettings(): Promise<void> {
  await browser.storage.local.set({ [PRIVACY_SETTINGS_KEY]: DEFAULT_SETTINGS });
}

/**
 * Get privacy summary for display
 */
export async function getPrivacySummary(): Promise<{
  dataCollectionEnabled: boolean;
  analyticsEnabled: boolean;
  incognitoMode: boolean;
  retentionPeriod: string;
  consentStatus: string;
  lastExport: number | null;
  lastDelete: number | null;
}> {
  const settings = await getPrivacySettings();
  const consent = await getTrackingConsent();
  const requests = await getDataRequestHistory();
  
  const lastExport = requests
    .filter(r => r.type === 'export')
    .sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp || null;
  
  const lastDelete = requests
    .filter(r => r.type === 'delete')
    .sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp || null;
  
  return {
    dataCollectionEnabled: settings.collectAnalytics || settings.collectUsageData,
    analyticsEnabled: settings.collectAnalytics,
    incognitoMode: settings.incognitoMode,
    retentionPeriod: settings.retentionPeriod,
    consentStatus: consent.consented ? 'consented' : 'not_consented',
    lastExport,
    lastDelete,
  };
}
