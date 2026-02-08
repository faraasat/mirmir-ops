// Semantic Memory - Vector-based memory for semantic search and recall

import browser from 'webextension-polyfill';
import { checkLimit } from '@/background/usage-tracker';

/**
 * Memory entry with embedding
 */
export interface MemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    type: 'fact' | 'interaction' | 'preference' | 'context' | 'command';
    domain?: string;
    url?: string;
    timestamp: number;
    importance: number; // 0-1
    accessCount: number;
    lastAccessedAt: number;
    tags?: string[];
  };
}

/**
 * Search result with similarity score
 */
export interface MemorySearchResult {
  entry: MemoryEntry;
  similarity: number;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalEntries: number;
  entriesByType: Record<string, number>;
  oldestEntry: number | null;
  newestEntry: number | null;
  avgImportance: number;
}

// Storage key
const MEMORY_STORAGE_KEY = 'semantic_memory';
const EMBEDDING_CACHE_KEY = 'embedding_cache';

// In-memory index for fast search
let memoryIndex: Map<string, MemoryEntry> | null = null;

// Simple embedding dimension (for local embeddings)
const EMBEDDING_DIM = 384;

/**
 * Initialize semantic memory
 */
export async function initializeSemanticMemory(): Promise<void> {
  await loadMemoryIndex();
  console.log('[SemanticMemory] Initialized with', memoryIndex?.size || 0, 'entries');
}

/**
 * Load memory index from storage
 */
async function loadMemoryIndex(): Promise<void> {
  const result = await browser.storage.local.get(MEMORY_STORAGE_KEY);
  const entries: MemoryEntry[] = result[MEMORY_STORAGE_KEY] || [];
  
  memoryIndex = new Map();
  for (const entry of entries) {
    memoryIndex.set(entry.id, entry);
  }
}

/**
 * Save memory index to storage
 */
async function saveMemoryIndex(): Promise<void> {
  if (!memoryIndex) return;
  
  const entries = Array.from(memoryIndex.values());
  await browser.storage.local.set({ [MEMORY_STORAGE_KEY]: entries });
}

/**
 * Add a memory entry
 */
export async function addMemory(
  content: string,
  options: {
    type: MemoryEntry['metadata']['type'];
    domain?: string;
    url?: string;
    importance?: number;
    tags?: string[];
    generateEmbedding?: boolean;
  }
): Promise<MemoryEntry> {
  if (!memoryIndex) await loadMemoryIndex();
  
  // Check usage limit
  const withinLimits = await checkLimit('memory');
  if (!withinLimits) {
    throw new Error('Memory limit reached. Please upgrade your plan.');
  }
  
  const now = Date.now();
  
  // Check for duplicate content
  const existingId = findSimilarMemory(content);
  if (existingId) {
    const existing = memoryIndex!.get(existingId)!;
    existing.metadata.accessCount++;
    existing.metadata.lastAccessedAt = now;
    existing.metadata.importance = Math.min(1, existing.metadata.importance + 0.1);
    await saveMemoryIndex();
    return existing;
  }
  
  // Generate embedding if requested
  let embedding: number[] | undefined;
  if (options.generateEmbedding !== false) {
    embedding = await generateEmbedding(content);
  }
  
  const entry: MemoryEntry = {
    id: `mem_${now}_${Math.random().toString(36).slice(2, 8)}`,
    content,
    embedding,
    metadata: {
      type: options.type,
      domain: options.domain,
      url: options.url,
      timestamp: now,
      importance: options.importance ?? 0.5,
      accessCount: 1,
      lastAccessedAt: now,
      tags: options.tags,
    },
  };
  
  memoryIndex!.set(entry.id, entry);
  await saveMemoryIndex();
  
  return entry;
}

/**
 * Find similar memory by content hash
 */
function findSimilarMemory(content: string): string | null {
  if (!memoryIndex) return null;
  
  const normalizedContent = normalizeText(content);
  
  for (const [id, entry] of memoryIndex) {
    if (normalizeText(entry.content) === normalizedContent) {
      return id;
    }
  }
  
  return null;
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Search memories by semantic similarity
 */
export async function searchMemories(
  query: string,
  options: {
    limit?: number;
    type?: MemoryEntry['metadata']['type'];
    domain?: string;
    minImportance?: number;
    tags?: string[];
  } = {}
): Promise<MemorySearchResult[]> {
  if (!memoryIndex) await loadMemoryIndex();
  
  const {
    limit = 10,
    type,
    domain,
    minImportance = 0,
    tags,
  } = options;
  
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  const results: MemorySearchResult[] = [];
  
  for (const entry of memoryIndex!.values()) {
    // Apply filters
    if (type && entry.metadata.type !== type) continue;
    if (domain && entry.metadata.domain !== domain) continue;
    if (entry.metadata.importance < minImportance) continue;
    if (tags && !tags.some(t => entry.metadata.tags?.includes(t))) continue;
    
    // Calculate similarity
    let similarity: number;
    
    if (entry.embedding && queryEmbedding) {
      similarity = cosineSimilarity(queryEmbedding, entry.embedding);
    } else {
      // Fallback to text similarity
      similarity = textSimilarity(query, entry.content);
    }
    
    results.push({ entry, similarity });
  }
  
  // Sort by similarity and return top results
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Get memory by ID
 */
export async function getMemory(id: string): Promise<MemoryEntry | null> {
  if (!memoryIndex) await loadMemoryIndex();
  
  const entry = memoryIndex!.get(id);
  
  if (entry) {
    // Update access stats
    entry.metadata.accessCount++;
    entry.metadata.lastAccessedAt = Date.now();
    await saveMemoryIndex();
  }
  
  return entry || null;
}

/**
 * Update memory entry
 */
export async function updateMemory(
  id: string,
  updates: {
    content?: string;
    importance?: number;
    tags?: string[];
  }
): Promise<MemoryEntry | null> {
  if (!memoryIndex) await loadMemoryIndex();
  
  const entry = memoryIndex!.get(id);
  if (!entry) return null;
  
  if (updates.content) {
    entry.content = updates.content;
    entry.embedding = await generateEmbedding(updates.content);
  }
  
  if (updates.importance !== undefined) {
    entry.metadata.importance = Math.max(0, Math.min(1, updates.importance));
  }
  
  if (updates.tags) {
    entry.metadata.tags = updates.tags;
  }
  
  await saveMemoryIndex();
  return entry;
}

/**
 * Delete memory entry
 */
export async function deleteMemory(id: string): Promise<boolean> {
  if (!memoryIndex) await loadMemoryIndex();
  
  const deleted = memoryIndex!.delete(id);
  if (deleted) {
    await saveMemoryIndex();
  }
  
  return deleted;
}

/**
 * Get recent memories
 */
export async function getRecentMemories(
  limit: number = 20,
  type?: MemoryEntry['metadata']['type']
): Promise<MemoryEntry[]> {
  if (!memoryIndex) await loadMemoryIndex();
  
  let entries = Array.from(memoryIndex!.values());
  
  if (type) {
    entries = entries.filter(e => e.metadata.type === type);
  }
  
  return entries
    .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp)
    .slice(0, limit);
}

/**
 * Get important memories
 */
export async function getImportantMemories(
  limit: number = 20,
  minImportance: number = 0.7
): Promise<MemoryEntry[]> {
  if (!memoryIndex) await loadMemoryIndex();
  
  return Array.from(memoryIndex!.values())
    .filter(e => e.metadata.importance >= minImportance)
    .sort((a, b) => b.metadata.importance - a.metadata.importance)
    .slice(0, limit);
}

/**
 * Get memory statistics
 */
export async function getMemoryStats(): Promise<MemoryStats> {
  if (!memoryIndex) await loadMemoryIndex();
  
  const entries = Array.from(memoryIndex!.values());
  
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      entriesByType: {},
      oldestEntry: null,
      newestEntry: null,
      avgImportance: 0,
    };
  }
  
  const entriesByType: Record<string, number> = {};
  let totalImportance = 0;
  let oldest = Infinity;
  let newest = 0;
  
  for (const entry of entries) {
    entriesByType[entry.metadata.type] = (entriesByType[entry.metadata.type] || 0) + 1;
    totalImportance += entry.metadata.importance;
    
    if (entry.metadata.timestamp < oldest) oldest = entry.metadata.timestamp;
    if (entry.metadata.timestamp > newest) newest = entry.metadata.timestamp;
  }
  
  return {
    totalEntries: entries.length,
    entriesByType,
    oldestEntry: oldest === Infinity ? null : oldest,
    newestEntry: newest === 0 ? null : newest,
    avgImportance: totalImportance / entries.length,
  };
}

/**
 * Decay memory importance over time
 */
export async function decayMemories(
  decayRate: number = 0.01,
  minImportance: number = 0.1
): Promise<number> {
  if (!memoryIndex) await loadMemoryIndex();
  
  let decayedCount = 0;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  for (const entry of memoryIndex!.values()) {
    const daysSinceAccess = (now - entry.metadata.lastAccessedAt) / dayMs;
    
    if (daysSinceAccess > 1) {
      const decay = decayRate * Math.floor(daysSinceAccess);
      entry.metadata.importance = Math.max(
        minImportance,
        entry.metadata.importance - decay
      );
      decayedCount++;
    }
  }
  
  if (decayedCount > 0) {
    await saveMemoryIndex();
  }
  
  return decayedCount;
}

/**
 * Prune low-importance and old memories
 */
export async function pruneMemories(
  maxEntries: number = 10000,
  minImportance: number = 0.1
): Promise<number> {
  if (!memoryIndex) await loadMemoryIndex();
  
  const entries = Array.from(memoryIndex!.values());
  
  if (entries.length <= maxEntries) {
    // Only prune very low importance entries
    let pruned = 0;
    for (const entry of entries) {
      if (entry.metadata.importance < minImportance) {
        memoryIndex!.delete(entry.id);
        pruned++;
      }
    }
    
    if (pruned > 0) await saveMemoryIndex();
    return pruned;
  }
  
  // Sort by importance * recency score
  const now = Date.now();
  const scored = entries.map(e => ({
    entry: e,
    score: e.metadata.importance * (1 / (1 + (now - e.metadata.lastAccessedAt) / (30 * 24 * 60 * 60 * 1000))),
  }));
  
  scored.sort((a, b) => b.score - a.score);
  
  // Keep top entries
  memoryIndex = new Map();
  for (let i = 0; i < maxEntries; i++) {
    const { entry } = scored[i];
    memoryIndex.set(entry.id, entry);
  }
  
  await saveMemoryIndex();
  return entries.length - maxEntries;
}

// ============================================
// Embedding Functions
// ============================================

/**
 * Generate embedding for text
 * Uses a simple bag-of-words approach as fallback
 * In production, this would call an embedding API or local model
 */
async function generateEmbedding(text: string): Promise<number[]> {
  // Check cache first
  const cacheKey = hashString(text);
  const cached = await getCachedEmbedding(cacheKey);
  if (cached) return cached;
  
  // Generate simple embedding using TF-IDF-like approach
  const embedding = generateLocalEmbedding(text);
  
  // Cache the embedding
  await cacheEmbedding(cacheKey, embedding);
  
  return embedding;
}

/**
 * Generate a simple local embedding
 * This is a basic implementation - in production, use a proper embedding model
 */
function generateLocalEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const embedding = new Array(EMBEDDING_DIM).fill(0);
  
  for (const word of words) {
    const hash = hashString(word);
    const index = Math.abs(hash) % EMBEDDING_DIM;
    embedding[index] += 1;
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}

/**
 * Simple hash function for strings
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Calculate text similarity using Jaccard index
 */
function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// ============================================
// Embedding Cache
// ============================================

async function getCachedEmbedding(key: number): Promise<number[] | null> {
  const result = await browser.storage.local.get(EMBEDDING_CACHE_KEY);
  const cache: Record<string, number[]> = result[EMBEDDING_CACHE_KEY] || {};
  return cache[key.toString()] || null;
}

async function cacheEmbedding(key: number, embedding: number[]): Promise<void> {
  const result = await browser.storage.local.get(EMBEDDING_CACHE_KEY);
  const cache: Record<string, number[]> = result[EMBEDDING_CACHE_KEY] || {};
  
  // Limit cache size
  const keys = Object.keys(cache);
  if (keys.length > 1000) {
    // Remove oldest entries
    const toRemove = keys.slice(0, 200);
    for (const k of toRemove) {
      delete cache[k];
    }
  }
  
  cache[key.toString()] = embedding;
  await browser.storage.local.set({ [EMBEDDING_CACHE_KEY]: cache });
}

/**
 * Clear embedding cache
 */
export async function clearEmbeddingCache(): Promise<void> {
  await browser.storage.local.remove(EMBEDDING_CACHE_KEY);
}

/**
 * Clear all semantic memory
 */
export async function clearSemanticMemory(): Promise<void> {
  memoryIndex = new Map();
  await browser.storage.local.remove([MEMORY_STORAGE_KEY, EMBEDDING_CACHE_KEY]);
}
