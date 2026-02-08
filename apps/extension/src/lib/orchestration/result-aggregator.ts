// Result Aggregator - Aggregate and deduplicate data from multiple sources

import type { ProductData, EventData, ArticleData, PriceData } from '../data-extraction';

/**
 * Result from a single tab/source
 */
export interface TabResult<T = unknown> {
  tabId: number;
  url: string;
  source: string;
  timestamp: number;
  success: boolean;
  data: T;
  error?: string;
  duration: number;
}

/**
 * Aggregated result from multiple sources
 */
export interface AggregatedResult<T = unknown> {
  results: TabResult<T>[];
  merged: T[];
  deduplicated: T[];
  sources: string[];
  totalDuration: number;
  successCount: number;
  failureCount: number;
  timestamp: number;
}

/**
 * Ranking criteria for sorting results
 */
export interface RankingCriteria {
  field: string;
  direction: 'asc' | 'desc';
  weight?: number;
}

/**
 * Merge strategy for combining data
 */
export type MergeStrategy = 'union' | 'intersection' | 'priority' | 'first' | 'last';

/**
 * Deduplication options
 */
export interface DeduplicationOptions {
  keys?: string[];             // Fields to use for comparison
  similarity?: number;         // 0-1, threshold for fuzzy matching
  preferSource?: string;       // Preferred source when duplicates found
  mergeFields?: boolean;       // Merge non-key fields from duplicates
}

/**
 * Aggregate results from multiple tabs
 */
export function aggregateResults<T>(
  results: TabResult<T>[],
  options?: {
    deduplication?: DeduplicationOptions;
    ranking?: RankingCriteria[];
    mergeStrategy?: MergeStrategy;
  }
): AggregatedResult<T> {
  const startTime = Date.now();
  
  // Collect all data
  let allData: T[] = [];
  const sources: string[] = [];
  let successCount = 0;
  let failureCount = 0;
  
  for (const result of results) {
    if (result.success && result.data) {
      const data = Array.isArray(result.data) ? result.data : [result.data];
      allData.push(...data);
      if (!sources.includes(result.source)) {
        sources.push(result.source);
      }
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  // Merge data based on strategy
  const merged = mergeData(allData, options?.mergeStrategy || 'union');
  
  // Deduplicate
  const deduplicated = options?.deduplication 
    ? deduplicateResults(merged, options.deduplication)
    : merged;
  
  // Rank results
  const ranked = options?.ranking 
    ? rankResults(deduplicated, options.ranking)
    : deduplicated;
  
  return {
    results,
    merged,
    deduplicated: ranked,
    sources,
    totalDuration: Date.now() - startTime,
    successCount,
    failureCount,
    timestamp: Date.now(),
  };
}

/**
 * Merge data from multiple sources
 */
export function mergeData<T>(data: T[], strategy: MergeStrategy): T[] {
  switch (strategy) {
    case 'union':
      return [...data]; // All items
    
    case 'intersection':
      // Only items that appear in multiple sources (simplified)
      return data;
    
    case 'priority':
      // Keep first occurrence of each item
      return data;
    
    case 'first':
      return data.slice(0, 1);
    
    case 'last':
      return data.slice(-1);
    
    default:
      return data;
  }
}

/**
 * Deduplicate results based on specified keys
 */
export function deduplicateResults<T>(
  results: T[],
  options: DeduplicationOptions = {}
): T[] {
  const {
    keys = ['name', 'url', 'id'],
    similarity = 0.9,
    preferSource,
    mergeFields = false,
  } = options;
  
  const seen = new Map<string, T>();
  const deduplicated: T[] = [];
  
  for (const item of results) {
    const fingerprint = createFingerprint(item as Record<string, unknown>, keys);
    
    // Check exact match first
    if (seen.has(fingerprint)) {
      if (mergeFields) {
        const existing = seen.get(fingerprint)!;
        seen.set(fingerprint, mergeObjects(existing, item));
      } else if (preferSource && hasSource(item as Record<string, unknown>, preferSource)) {
        seen.set(fingerprint, item);
      }
      continue;
    }
    
    // Check fuzzy match if similarity threshold is set
    let foundSimilar = false;
    if (similarity < 1) {
      for (const [existingFingerprint, existing] of seen) {
        if (calculateSimilarity(fingerprint, existingFingerprint) >= similarity) {
          foundSimilar = true;
          if (mergeFields) {
            seen.set(existingFingerprint, mergeObjects(existing, item));
          }
          break;
        }
      }
    }
    
    if (!foundSimilar) {
      seen.set(fingerprint, item);
      deduplicated.push(item);
    }
  }
  
  return deduplicated;
}

/**
 * Rank results by specified criteria
 */
export function rankResults<T>(
  results: T[],
  criteria: RankingCriteria[]
): T[] {
  if (criteria.length === 0) return results;
  
  return [...results].sort((a, b) => {
    for (const criterion of criteria) {
      const aValue = getNestedValue(a as Record<string, unknown>, criterion.field);
      const bValue = getNestedValue(b as Record<string, unknown>, criterion.field);
      
      let comparison = compareValues(aValue, bValue);
      
      if (criterion.direction === 'desc') {
        comparison = -comparison;
      }
      
      if (criterion.weight) {
        comparison *= criterion.weight;
      }
      
      if (comparison !== 0) {
        return comparison;
      }
    }
    return 0;
  });
}

/**
 * Aggregate product data with price comparison
 */
export function aggregateProducts(
  results: TabResult<ProductData | ProductData[]>[]
): AggregatedResult<ProductData> & {
  priceComparison: {
    lowest: ProductData | null;
    highest: ProductData | null;
    average: number;
  };
} {
  const aggregated = aggregateResults<ProductData>(results as TabResult<ProductData>[], {
    deduplication: {
      keys: ['name', 'sku'],
      similarity: 0.85,
      mergeFields: true,
    },
    ranking: [
      { field: 'price.amount', direction: 'asc' },
      { field: 'rating', direction: 'desc' },
    ],
  });
  
  // Calculate price comparison
  const productsWithPrice = aggregated.deduplicated.filter(
    (p): p is ProductData => p != null && typeof p === 'object' && 'price' in p && p.price?.amount != null && p.price.amount > 0
  );
  
  let lowest: ProductData | null = null;
  let highest: ProductData | null = null;
  let total = 0;
  
  for (const product of productsWithPrice) {
    const amount = product.price!.amount;
    total += amount;
    
    if (!lowest || amount < lowest.price!.amount) {
      lowest = product;
    }
    if (!highest || amount > highest.price!.amount) {
      highest = product;
    }
  }
  
  const average = productsWithPrice.length > 0 
    ? total / productsWithPrice.length 
    : 0;
  
  return {
    ...aggregated,
    priceComparison: {
      lowest,
      highest,
      average,
    },
  };
}

/**
 * Aggregate event data
 */
export function aggregateEvents(
  results: TabResult<EventData | EventData[]>[]
): AggregatedResult<EventData> {
  return aggregateResults<EventData>(results as TabResult<EventData>[], {
    deduplication: {
      keys: ['name', 'startDate.iso'],
      similarity: 0.8,
      mergeFields: true,
    },
    ranking: [
      { field: 'startDate.timestamp', direction: 'asc' },
    ],
  });
}

/**
 * Aggregate article/news data
 */
export function aggregateArticles(
  results: TabResult<ArticleData | ArticleData[]>[]
): AggregatedResult<ArticleData> {
  return aggregateResults<ArticleData>(results as TabResult<ArticleData>[], {
    deduplication: {
      keys: ['title', 'url'],
      similarity: 0.9,
    },
    ranking: [
      { field: 'publishedDate.timestamp', direction: 'desc' },
    ],
  });
}

/**
 * Group results by a specific field
 */
export function groupResultsBy<T>(
  results: T[],
  field: string
): Map<unknown, T[]> {
  const groups = new Map<unknown, T[]>();
  
  for (const item of results) {
    const value = getNestedValue(item as Record<string, unknown>, field);
    const key = value ?? '__undefined__';
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }
  
  return groups;
}

/**
 * Summarize aggregated results
 */
export function summarizeResults<T>(aggregated: AggregatedResult<T>): {
  totalItems: number;
  uniqueItems: number;
  duplicatesRemoved: number;
  sourceCounts: Record<string, number>;
  successRate: number;
} {
  const sourceCounts: Record<string, number> = {};
  
  for (const result of aggregated.results) {
    const count = Array.isArray(result.data) ? result.data.length : 1;
    sourceCounts[result.source] = (sourceCounts[result.source] || 0) + count;
  }
  
  return {
    totalItems: aggregated.merged.length,
    uniqueItems: aggregated.deduplicated.length,
    duplicatesRemoved: aggregated.merged.length - aggregated.deduplicated.length,
    sourceCounts,
    successRate: aggregated.results.length > 0 
      ? aggregated.successCount / aggregated.results.length 
      : 0,
  };
}

// Helper functions

/**
 * Create a fingerprint string for comparison
 */
function createFingerprint(obj: Record<string, unknown>, keys: string[]): string {
  const values = keys.map(key => {
    const value = getNestedValue(obj, key);
    return normalizeForComparison(value);
  });
  return values.join('|');
}

/**
 * Normalize a value for comparison
 */
function normalizeForComparison(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
  }
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object') {
    if ('amount' in (value as Record<string, unknown>)) {
      return String((value as PriceData).amount);
    }
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  
  return current;
}

/**
 * Calculate string similarity (Sørensen–Dice coefficient)
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  
  const aBigrams = getBigrams(a);
  const bBigrams = getBigrams(b);
  
  let intersectionSize = 0;
  
  for (const bigram of aBigrams) {
    if (bBigrams.has(bigram)) {
      intersectionSize++;
      bBigrams.delete(bigram);
    }
  }
  
  return (2 * intersectionSize) / (a.length - 1 + b.length - 1);
}

/**
 * Get bigrams (pairs of consecutive characters) from a string
 */
function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.substring(i, i + 2));
  }
  return bigrams;
}

/**
 * Compare two values for sorting
 */
function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }
  
  return String(a).localeCompare(String(b));
}

/**
 * Merge two objects, preferring non-null values
 */
function mergeObjects<T>(existing: T, incoming: T): T {
  if (typeof existing !== 'object' || existing === null) {
    return incoming;
  }
  
  const result = { ...existing } as Record<string, unknown>;
  const incomingObj = incoming as Record<string, unknown>;
  
  for (const key of Object.keys(incomingObj)) {
    const existingValue = result[key];
    const incomingValue = incomingObj[key];
    
    if (existingValue === null || existingValue === undefined || existingValue === '') {
      result[key] = incomingValue;
    } else if (Array.isArray(existingValue) && Array.isArray(incomingValue)) {
      // Merge arrays
      result[key] = [...new Set([...existingValue, ...incomingValue])];
    } else if (typeof existingValue === 'object' && typeof incomingValue === 'object') {
      // Recursively merge objects
      result[key] = mergeObjects(existingValue, incomingValue);
    }
  }
  
  return result as T;
}

/**
 * Check if an object has a specific source
 */
function hasSource(obj: Record<string, unknown>, source: string): boolean {
  return obj.source === source || (obj.url?.toString().includes(source) ?? false);
}
