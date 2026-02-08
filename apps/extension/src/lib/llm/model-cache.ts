// Model cache management for WebLLM
// Tracks downloaded models and checks cache status

import Dexie, { type Table } from 'dexie';

export interface CachedModel {
  id: string;
  modelId: string;
  downloadedAt: number;
  size: string;
  lastUsedAt: number;
}

class ModelCacheDatabase extends Dexie {
  models!: Table<CachedModel, string>;

  constructor() {
    super('MirmirOpsModelCache');
    
    this.version(1).stores({
      models: 'id, modelId, downloadedAt, lastUsedAt',
    });
  }
}

// Singleton database instance
let db: ModelCacheDatabase | null = null;

function getDatabase(): ModelCacheDatabase {
  if (!db) {
    db = new ModelCacheDatabase();
  }
  return db;
}

/**
 * Record a model as downloaded
 */
export async function recordModelDownload(modelId: string, size: string): Promise<void> {
  const database = getDatabase();
  const now = Date.now();
  
  await database.models.put({
    id: modelId,
    modelId,
    downloadedAt: now,
    size,
    lastUsedAt: now,
  });
}

/**
 * Update last used timestamp for a model
 */
export async function updateModelLastUsed(modelId: string): Promise<void> {
  const database = getDatabase();
  await database.models.update(modelId, { lastUsedAt: Date.now() });
}

/**
 * Get list of downloaded models
 */
export async function getDownloadedModels(): Promise<CachedModel[]> {
  const database = getDatabase();
  return database.models.toArray();
}

/**
 * Check if a model is recorded as downloaded
 */
export async function isModelDownloaded(modelId: string): Promise<boolean> {
  const database = getDatabase();
  const model = await database.models.get(modelId);
  return !!model;
}

/**
 * Remove a model record (when cache is cleared)
 */
export async function removeModelRecord(modelId: string): Promise<void> {
  const database = getDatabase();
  await database.models.delete(modelId);
}

/**
 * Clear all model records
 */
export async function clearModelRecords(): Promise<void> {
  const database = getDatabase();
  await database.models.clear();
}

/**
 * Check if WebLLM cache exists for a model using WebLLM's own API
 * This is the most reliable way to check cache status
 */
export async function checkWebLLMCache(modelId: string): Promise<boolean> {
  try {
    // Use WebLLM's built-in cache checking
    const { hasModelInCache } = await import('@mlc-ai/web-llm');
    return await hasModelInCache(modelId);
  } catch (error) {
    console.log('[ModelCache] Error checking WebLLM cache:', error);
    // Fallback: check Cache API directly
    return checkWebLLMCacheFallback(modelId);
  }
}

/**
 * Fallback cache check using Cache API directly
 * WebLLM stores in caches named 'webllm/model', 'webllm/wasm', 'webllm/config'
 */
async function checkWebLLMCacheFallback(modelId: string): Promise<boolean> {
  try {
    const cacheNames = await caches.keys();
    
    // WebLLM uses these cache names
    const webllmCacheNames = ['webllm/model', 'webllm/wasm', 'webllm/config'];
    
    // Check if any WebLLM cache exists
    const hasWebLLMCache = cacheNames.some(name => 
      webllmCacheNames.some(webllmName => name.includes(webllmName))
    );
    
    if (!hasWebLLMCache) {
      return false;
    }
    
    // Try to open the model cache and check for entries containing the modelId
    // Model URLs typically contain the model name
    const modelCache = await caches.open('webllm/model');
    const keys = await modelCache.keys();
    
    // Check if any cached URL contains the model identifier
    // WebLLM model URLs look like: https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC/...
    const hasModelEntries = keys.some(request => {
      const url = request.url.toLowerCase();
      const normalizedModelId = modelId.toLowerCase().replace(/-/g, '');
      const normalizedUrl = url.replace(/-/g, '');
      return normalizedUrl.includes(normalizedModelId) || 
             normalizedUrl.includes(modelId.toLowerCase());
    });
    
    return hasModelEntries;
  } catch {
    return false;
  }
}

/**
 * Get cache storage estimate
 */
export async function getCacheStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
