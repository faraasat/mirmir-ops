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
 * Check if WebLLM cache exists for a model
 * WebLLM stores models in the Cache API with a specific naming convention
 */
export async function checkWebLLMCache(modelId: string): Promise<boolean> {
  try {
    // WebLLM uses Cache API with names like 'webllm/model' or 'webllm-<modelId>'
    const cacheNames = await caches.keys();
    
    // Check various cache naming patterns WebLLM might use
    const hasCache = cacheNames.some(name => 
      name.includes('webllm') || 
      name.includes('mlc') ||
      name.includes(modelId) ||
      name.includes('model_lib') ||
      name.includes('wasm')
    );
    
    return hasCache;
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
