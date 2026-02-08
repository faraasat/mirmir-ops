// Crypto Manager - Encryption/decryption for sensitive data

import browser from 'webextension-polyfill';

/**
 * Encrypted data wrapper
 */
export interface EncryptedData {
  iv: string;      // Initialization vector (base64)
  data: string;    // Encrypted data (base64)
  tag: string;     // Authentication tag (base64)
  version: number; // Encryption version for future upgrades
}

/**
 * Encryption key info
 */
export interface KeyInfo {
  id: string;
  createdAt: number;
  algorithm: string;
}

// Storage keys
const MASTER_KEY_INFO = 'master_key_info';
const ENCRYPTED_KEYS = 'encrypted_keys';

// Current encryption version
const ENCRYPTION_VERSION = 1;

// Cached key
let cachedKey: CryptoKey | null = null;
let cachedKeyId: string | null = null;

/**
 * Initialize crypto manager
 */
export async function initializeCryptoManager(): Promise<void> {
  // Ensure we have a master key
  await getOrCreateMasterKey();
  console.log('[CryptoManager] Initialized');
}

/**
 * Get or create the master encryption key
 */
async function getOrCreateMasterKey(): Promise<CryptoKey> {
  if (cachedKey && cachedKeyId) {
    return cachedKey;
  }
  
  // Check for existing key info
  const result = await browser.storage.local.get([MASTER_KEY_INFO, ENCRYPTED_KEYS]);
  const keyInfo: KeyInfo | undefined = result[MASTER_KEY_INFO];
  
  if (keyInfo) {
    // Load existing key from encrypted storage
    const encryptedKeys: Record<string, string> = result[ENCRYPTED_KEYS] || {};
    const keyData = encryptedKeys[keyInfo.id];
    
    if (keyData) {
      try {
        // Derive key from extension ID (deterministic for same extension)
        const derivedKey = await deriveKeyFromExtensionId();
        cachedKey = await unwrapKey(keyData, derivedKey);
        cachedKeyId = keyInfo.id;
        return cachedKey;
      } catch (error) {
        console.error('[CryptoManager] Failed to unwrap existing key:', error);
        // Key corrupted, create new one
      }
    }
  }
  
  // Create new master key
  const newKey = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable for backup
    ['encrypt', 'decrypt']
  );
  
  const keyId = `key_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  
  // Wrap and store the key
  const derivedKey = await deriveKeyFromExtensionId();
  const wrappedKey = await wrapKey(newKey, derivedKey);
  
  const newKeyInfo: KeyInfo = {
    id: keyId,
    createdAt: Date.now(),
    algorithm: 'AES-GCM-256',
  };
  
  await browser.storage.local.set({
    [MASTER_KEY_INFO]: newKeyInfo,
    [ENCRYPTED_KEYS]: { [keyId]: wrappedKey },
  });
  
  cachedKey = newKey;
  cachedKeyId = keyId;
  
  return newKey;
}

/**
 * Derive a key from extension ID (for wrapping master key)
 */
async function deriveKeyFromExtensionId(): Promise<CryptoKey> {
  const extensionId = browser.runtime.id;
  const encoder = new TextEncoder();
  
  // Use extension ID as base material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(extensionId + '_mirmir_ops_v1'),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive AES key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('mirmir_ops_salt_v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
}

/**
 * Wrap a key for storage
 */
async function wrapKey(keyToWrap: CryptoKey, wrappingKey: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const wrappedKey = await crypto.subtle.wrapKey(
    'raw',
    keyToWrap,
    wrappingKey,
    {
      name: 'AES-GCM',
      iv,
    }
  );
  
  // Combine IV and wrapped key
  const combined = new Uint8Array(iv.length + wrappedKey.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(wrappedKey), iv.length);
  
  return bufferToBase64(combined);
}

/**
 * Unwrap a key from storage
 */
async function unwrapKey(wrappedData: string, unwrappingKey: CryptoKey): Promise<CryptoKey> {
  const combined = base64ToBuffer(wrappedData);
  const iv = combined.slice(0, 12);
  const wrappedKey = combined.slice(12);
  
  return crypto.subtle.unwrapKey(
    'raw',
    wrappedKey,
    unwrappingKey,
    {
      name: 'AES-GCM',
      iv,
    },
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data
 */
export async function encrypt(data: string): Promise<EncryptedData> {
  const key = await getOrCreateMasterKey();
  const encoder = new TextEncoder();
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128,
    },
    key,
    encoder.encode(data)
  );
  
  // AES-GCM appends the auth tag to the ciphertext
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const ciphertext = encryptedArray.slice(0, -16);
  const tag = encryptedArray.slice(-16);
  
  return {
    iv: bufferToBase64(iv),
    data: bufferToBase64(ciphertext),
    tag: bufferToBase64(tag),
    version: ENCRYPTION_VERSION,
  };
}

/**
 * Decrypt data
 */
export async function decrypt(encrypted: EncryptedData): Promise<string> {
  const key = await getOrCreateMasterKey();
  const decoder = new TextDecoder();
  
  const iv = base64ToBuffer(encrypted.iv);
  const ciphertext = base64ToBuffer(encrypted.data);
  const tag = base64ToBuffer(encrypted.tag);
  
  // Combine ciphertext and tag (AES-GCM expects them together)
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
      tagLength: 128,
    },
    key,
    combined.buffer as ArrayBuffer
  );
  
  return decoder.decode(decryptedBuffer);
}

/**
 * Encrypt an object (JSON serializable)
 */
export async function encryptObject<T>(obj: T): Promise<EncryptedData> {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt an object
 */
export async function decryptObject<T>(encrypted: EncryptedData): Promise<T> {
  const json = await decrypt(encrypted);
  return JSON.parse(json);
}

/**
 * Check if data is encrypted
 */
export function isEncrypted(data: unknown): data is EncryptedData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.iv === 'string' &&
    typeof obj.data === 'string' &&
    typeof obj.tag === 'string' &&
    typeof obj.version === 'number'
  );
}

/**
 * Hash data (for non-reversible storage, e.g., checking passwords)
 */
export async function hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return bufferToBase64(new Uint8Array(hashBuffer));
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return bufferToBase64(array);
}

/**
 * Generate a secure random ID
 */
export function generateSecureId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

// Utility functions
function bufferToBase64(buffer: Uint8Array): string {
  const binary = String.fromCharCode(...buffer);
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}

/**
 * Clear all encryption keys (use with caution!)
 */
export async function clearEncryptionKeys(): Promise<void> {
  cachedKey = null;
  cachedKeyId = null;
  await browser.storage.local.remove([MASTER_KEY_INFO, ENCRYPTED_KEYS]);
}

/**
 * Export master key (for backup)
 */
export async function exportMasterKey(): Promise<string> {
  const key = await getOrCreateMasterKey();
  const exported = await crypto.subtle.exportKey('raw', key);
  return bufferToBase64(new Uint8Array(exported));
}

/**
 * Import master key (restore from backup)
 */
export async function importMasterKey(keyData: string): Promise<void> {
  const keyBuffer = base64ToBuffer(keyData);
  
  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const keyId = `key_imported_${Date.now()}`;
  const derivedKey = await deriveKeyFromExtensionId();
  const wrappedKey = await wrapKey(importedKey, derivedKey);
  
  const keyInfo: KeyInfo = {
    id: keyId,
    createdAt: Date.now(),
    algorithm: 'AES-GCM-256',
  };
  
  await browser.storage.local.set({
    [MASTER_KEY_INFO]: keyInfo,
    [ENCRYPTED_KEYS]: { [keyId]: wrappedKey },
  });
  
  cachedKey = importedKey;
  cachedKeyId = keyId;
}
