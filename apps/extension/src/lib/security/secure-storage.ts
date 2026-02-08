// Secure Storage - Encrypted storage for sensitive data

import browser from 'webextension-polyfill';
import {
  encryptObject,
  decryptObject,
  isEncrypted,
  type EncryptedData,
} from './crypto-manager';

/**
 * Sensitive data categories
 */
export type SensitiveDataCategory =
  | 'api_keys'
  | 'credentials'
  | 'personal_info'
  | 'payment_info'
  | 'custom';

/**
 * Secure storage item
 */
export interface SecureStorageItem {
  id: string;
  category: SensitiveDataCategory;
  label: string;
  data: EncryptedData;
  createdAt: number;
  updatedAt: number;
  accessedAt: number;
  accessCount: number;
  expiresAt?: number;
}

/**
 * Decrypted item (for UI display)
 */
export interface DecryptedItem<T = unknown> {
  id: string;
  category: SensitiveDataCategory;
  label: string;
  data: T;
  createdAt: number;
  updatedAt: number;
  accessedAt: number;
  accessCount: number;
  expiresAt?: number;
}

// Storage key
const SECURE_STORAGE_KEY = 'secure_storage';

// Cache for frequently accessed items
const decryptionCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Store sensitive data securely
 */
export async function storeSecure<T>(
  id: string,
  data: T,
  options: {
    category: SensitiveDataCategory;
    label: string;
    expiresAt?: number;
  }
): Promise<SecureStorageItem> {
  const result = await browser.storage.local.get(SECURE_STORAGE_KEY);
  const storage: Record<string, SecureStorageItem> = result[SECURE_STORAGE_KEY] || {};
  
  const now = Date.now();
  const encrypted = await encryptObject(data);
  
  const existing = storage[id];
  
  const item: SecureStorageItem = {
    id,
    category: options.category,
    label: options.label,
    data: encrypted,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    accessedAt: now,
    accessCount: existing?.accessCount || 0,
    expiresAt: options.expiresAt,
  };
  
  storage[id] = item;
  await browser.storage.local.set({ [SECURE_STORAGE_KEY]: storage });
  
  // Invalidate cache
  decryptionCache.delete(id);
  
  return item;
}

/**
 * Retrieve and decrypt secure data
 */
export async function retrieveSecure<T>(id: string): Promise<T | null> {
  // Check cache first
  const cached = decryptionCache.get(id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  
  const result = await browser.storage.local.get(SECURE_STORAGE_KEY);
  const storage: Record<string, SecureStorageItem> = result[SECURE_STORAGE_KEY] || {};
  
  const item = storage[id];
  if (!item) return null;
  
  // Check expiration
  if (item.expiresAt && Date.now() > item.expiresAt) {
    await deleteSecure(id);
    return null;
  }
  
  // Decrypt
  const decrypted = await decryptObject<T>(item.data);
  
  // Update access stats
  item.accessedAt = Date.now();
  item.accessCount++;
  await browser.storage.local.set({ [SECURE_STORAGE_KEY]: storage });
  
  // Cache decrypted data
  decryptionCache.set(id, { data: decrypted, timestamp: Date.now() });
  
  return decrypted;
}

/**
 * Get item metadata (without decrypting)
 */
export async function getSecureItemMeta(id: string): Promise<Omit<SecureStorageItem, 'data'> | null> {
  const result = await browser.storage.local.get(SECURE_STORAGE_KEY);
  const storage: Record<string, SecureStorageItem> = result[SECURE_STORAGE_KEY] || {};
  
  const item = storage[id];
  if (!item) return null;
  
  const { data, ...meta } = item;
  return meta;
}

/**
 * List all secure items (metadata only)
 */
export async function listSecureItems(
  category?: SensitiveDataCategory
): Promise<Array<Omit<SecureStorageItem, 'data'>>> {
  const result = await browser.storage.local.get(SECURE_STORAGE_KEY);
  const storage: Record<string, SecureStorageItem> = result[SECURE_STORAGE_KEY] || {};
  
  let items = Object.values(storage);
  
  // Filter by category
  if (category) {
    items = items.filter(item => item.category === category);
  }
  
  // Remove expired items
  const now = Date.now();
  items = items.filter(item => !item.expiresAt || item.expiresAt > now);
  
  // Return metadata only
  return items.map(({ data, ...meta }) => meta);
}

/**
 * Delete secure item
 */
export async function deleteSecure(id: string): Promise<boolean> {
  const result = await browser.storage.local.get(SECURE_STORAGE_KEY);
  const storage: Record<string, SecureStorageItem> = result[SECURE_STORAGE_KEY] || {};
  
  if (!storage[id]) return false;
  
  delete storage[id];
  await browser.storage.local.set({ [SECURE_STORAGE_KEY]: storage });
  
  // Clear from cache
  decryptionCache.delete(id);
  
  return true;
}

/**
 * Delete all items in a category
 */
export async function deleteSecureCategory(category: SensitiveDataCategory): Promise<number> {
  const result = await browser.storage.local.get(SECURE_STORAGE_KEY);
  const storage: Record<string, SecureStorageItem> = result[SECURE_STORAGE_KEY] || {};
  
  let deleted = 0;
  
  for (const [id, item] of Object.entries(storage)) {
    if (item.category === category) {
      delete storage[id];
      decryptionCache.delete(id);
      deleted++;
    }
  }
  
  await browser.storage.local.set({ [SECURE_STORAGE_KEY]: storage });
  return deleted;
}

/**
 * Check if secure item exists
 */
export async function hasSecureItem(id: string): Promise<boolean> {
  const result = await browser.storage.local.get(SECURE_STORAGE_KEY);
  const storage: Record<string, SecureStorageItem> = result[SECURE_STORAGE_KEY] || {};
  
  const item = storage[id];
  if (!item) return false;
  
  // Check expiration
  if (item.expiresAt && Date.now() > item.expiresAt) {
    await deleteSecure(id);
    return false;
  }
  
  return true;
}

/**
 * Update secure item label
 */
export async function updateSecureLabel(id: string, label: string): Promise<boolean> {
  const result = await browser.storage.local.get(SECURE_STORAGE_KEY);
  const storage: Record<string, SecureStorageItem> = result[SECURE_STORAGE_KEY] || {};
  
  const item = storage[id];
  if (!item) return false;
  
  item.label = label;
  item.updatedAt = Date.now();
  
  await browser.storage.local.set({ [SECURE_STORAGE_KEY]: storage });
  return true;
}

/**
 * Update secure item expiration
 */
export async function updateSecureExpiration(id: string, expiresAt: number | undefined): Promise<boolean> {
  const result = await browser.storage.local.get(SECURE_STORAGE_KEY);
  const storage: Record<string, SecureStorageItem> = result[SECURE_STORAGE_KEY] || {};
  
  const item = storage[id];
  if (!item) return false;
  
  item.expiresAt = expiresAt;
  item.updatedAt = Date.now();
  
  await browser.storage.local.set({ [SECURE_STORAGE_KEY]: storage });
  return true;
}

/**
 * Clean up expired items
 */
export async function cleanupExpiredItems(): Promise<number> {
  const result = await browser.storage.local.get(SECURE_STORAGE_KEY);
  const storage: Record<string, SecureStorageItem> = result[SECURE_STORAGE_KEY] || {};
  
  const now = Date.now();
  let cleaned = 0;
  
  for (const [id, item] of Object.entries(storage)) {
    if (item.expiresAt && now > item.expiresAt) {
      delete storage[id];
      decryptionCache.delete(id);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    await browser.storage.local.set({ [SECURE_STORAGE_KEY]: storage });
  }
  
  return cleaned;
}

/**
 * Get storage statistics
 */
export async function getSecureStorageStats(): Promise<{
  totalItems: number;
  byCategory: Record<SensitiveDataCategory, number>;
  oldestItem: number | null;
  newestItem: number | null;
  expiringSoon: number;
}> {
  const result = await browser.storage.local.get(SECURE_STORAGE_KEY);
  const storage: Record<string, SecureStorageItem> = result[SECURE_STORAGE_KEY] || {};
  
  const items = Object.values(storage);
  const now = Date.now();
  const soonThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  const byCategory: Record<string, number> = {};
  let oldest = Infinity;
  let newest = 0;
  let expiringSoon = 0;
  
  for (const item of items) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    
    if (item.createdAt < oldest) oldest = item.createdAt;
    if (item.createdAt > newest) newest = item.createdAt;
    
    if (item.expiresAt && item.expiresAt - now < soonThreshold) {
      expiringSoon++;
    }
  }
  
  return {
    totalItems: items.length,
    byCategory: byCategory as Record<SensitiveDataCategory, number>,
    oldestItem: oldest === Infinity ? null : oldest,
    newestItem: newest === 0 ? null : newest,
    expiringSoon,
  };
}

/**
 * Clear all secure storage
 */
export async function clearSecureStorage(): Promise<void> {
  await browser.storage.local.remove(SECURE_STORAGE_KEY);
  decryptionCache.clear();
}

/**
 * Export secure storage (encrypted)
 */
export async function exportSecureStorage(): Promise<string> {
  const result = await browser.storage.local.get(SECURE_STORAGE_KEY);
  const storage = result[SECURE_STORAGE_KEY] || {};
  
  return JSON.stringify({
    version: 1,
    exportedAt: Date.now(),
    data: storage,
  });
}

/**
 * Import secure storage
 */
export async function importSecureStorage(exportData: string): Promise<number> {
  const parsed = JSON.parse(exportData);
  
  if (!parsed.data || typeof parsed.data !== 'object') {
    throw new Error('Invalid export data format');
  }
  
  const result = await browser.storage.local.get(SECURE_STORAGE_KEY);
  const storage: Record<string, SecureStorageItem> = result[SECURE_STORAGE_KEY] || {};
  
  let imported = 0;
  
  for (const [id, item] of Object.entries(parsed.data)) {
    if (isValidSecureItem(item)) {
      storage[id] = item as SecureStorageItem;
      imported++;
    }
  }
  
  await browser.storage.local.set({ [SECURE_STORAGE_KEY]: storage });
  decryptionCache.clear();
  
  return imported;
}

/**
 * Validate secure item structure
 */
function isValidSecureItem(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  
  const obj = item as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.label === 'string' &&
    isEncrypted(obj.data) &&
    typeof obj.createdAt === 'number' &&
    typeof obj.updatedAt === 'number'
  );
}
