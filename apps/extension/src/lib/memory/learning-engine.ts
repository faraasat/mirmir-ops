// Learning Engine - Learn from user feedback and behavior patterns

import browser from 'webextension-polyfill';
import { addMemory, searchMemories } from './semantic-memory';
import { setPreference } from './preference-memory';

/**
 * Feedback type
 */
export type FeedbackType = 
  | 'positive'   // User confirmed the action was correct
  | 'negative'   // User corrected the action
  | 'neutral';   // No explicit feedback

/**
 * Feedback entry
 */
export interface FeedbackEntry {
  id: string;
  timestamp: number;
  context: {
    userInput: string;
    intent?: string;
    domain?: string;
    url?: string;
  };
  action: {
    type: string;
    params?: Record<string, unknown>;
    result?: unknown;
  };
  feedback: FeedbackType;
  correction?: {
    expectedAction?: string;
    expectedParams?: Record<string, unknown>;
    userComment?: string;
  };
  learned: boolean;  // Whether this feedback has been processed
}

/**
 * Pattern - learned behavior pattern
 */
export interface LearnedPattern {
  id: string;
  patternType: 'intent_action' | 'context_preference' | 'sequence';
  trigger: {
    keywords?: string[];
    intent?: string;
    domain?: string;
    context?: string[];
  };
  response: {
    action?: string;
    params?: Record<string, unknown>;
    suggestion?: string;
  };
  confidence: number;
  usageCount: number;
  successRate: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Action suggestion
 */
export interface ActionSuggestion {
  action: string;
  params?: Record<string, unknown>;
  confidence: number;
  reason: string;
  patternId?: string;
}

// Storage keys
const FEEDBACK_KEY = 'user_feedback';
const PATTERNS_KEY = 'learned_patterns';

// Pattern cache
let patternsCache: Map<string, LearnedPattern> | null = null;

// Learning thresholds
const MIN_CONFIDENCE_THRESHOLD = 0.3;
const CONFIDENCE_INCREASE = 0.1;
const CONFIDENCE_DECREASE = 0.15;

/**
 * Initialize learning engine
 */
export async function initializeLearningEngine(): Promise<void> {
  await loadPatternsCache();
  console.log('[LearningEngine] Initialized with', patternsCache?.size || 0, 'patterns');
}

/**
 * Load patterns into cache
 */
async function loadPatternsCache(): Promise<void> {
  const result = await browser.storage.local.get(PATTERNS_KEY);
  const patterns: LearnedPattern[] = result[PATTERNS_KEY] || [];
  
  patternsCache = new Map();
  for (const pattern of patterns) {
    patternsCache.set(pattern.id, pattern);
  }
}

/**
 * Save patterns from cache
 */
async function savePatternsCache(): Promise<void> {
  if (!patternsCache) return;
  
  const patterns = Array.from(patternsCache.values());
  await browser.storage.local.set({ [PATTERNS_KEY]: patterns });
}

/**
 * Record user feedback
 */
export async function recordFeedback(
  context: FeedbackEntry['context'],
  action: FeedbackEntry['action'],
  feedback: FeedbackType,
  correction?: FeedbackEntry['correction']
): Promise<FeedbackEntry> {
  const result = await browser.storage.local.get(FEEDBACK_KEY);
  const feedbackEntries: FeedbackEntry[] = result[FEEDBACK_KEY] || [];
  
  const entry: FeedbackEntry = {
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    context,
    action,
    feedback,
    correction,
    learned: false,
  };
  
  feedbackEntries.unshift(entry);
  
  // Limit stored feedback
  const trimmed = feedbackEntries.slice(0, 1000);
  
  await browser.storage.local.set({ [FEEDBACK_KEY]: trimmed });
  
  // Process feedback immediately
  await processFeedback(entry);
  
  return entry;
}

/**
 * Process feedback and update patterns
 */
async function processFeedback(entry: FeedbackEntry): Promise<void> {
  if (!patternsCache) await loadPatternsCache();
  
  const patternKey = generatePatternKey(entry.context, entry.action.type);
  let pattern = findMatchingPattern(patternKey, entry.context.intent);
  
  if (pattern) {
    // Update existing pattern
    pattern.usageCount++;
    
    if (entry.feedback === 'positive') {
      pattern.confidence = Math.min(1, pattern.confidence + CONFIDENCE_INCREASE);
      pattern.successRate = (
        (pattern.successRate * (pattern.usageCount - 1)) + 1
      ) / pattern.usageCount;
    } else if (entry.feedback === 'negative') {
      pattern.confidence = Math.max(0, pattern.confidence - CONFIDENCE_DECREASE);
      pattern.successRate = (
        (pattern.successRate * (pattern.usageCount - 1)) + 0
      ) / pattern.usageCount;
      
      // Learn correction if provided
      if (entry.correction?.expectedAction) {
        await learnCorrection(entry);
      }
    }
    
    pattern.updatedAt = Date.now();
    patternsCache!.set(pattern.id, pattern);
    await savePatternsCache();
  } else if (entry.feedback === 'positive') {
    // Create new pattern from positive feedback
    await createPatternFromFeedback(entry);
  } else if (entry.feedback === 'negative' && entry.correction) {
    // Learn from correction
    await learnCorrection(entry);
  }
  
  // Store in semantic memory for future recall
  if (entry.feedback !== 'neutral') {
    await addMemory(
      `User ${entry.feedback === 'positive' ? 'confirmed' : 'corrected'}: "${entry.context.userInput}" -> ${entry.action.type}`,
      {
        type: 'interaction',
        domain: entry.context.domain,
        importance: entry.feedback === 'negative' ? 0.8 : 0.6,
        tags: ['feedback', entry.feedback],
      }
    );
  }
}

/**
 * Generate pattern key from context and action
 */
function generatePatternKey(
  context: FeedbackEntry['context'],
  actionType: string
): string {
  const parts = [actionType];
  
  if (context.intent) parts.push(context.intent);
  if (context.domain) parts.push(context.domain);
  
  return parts.join('::');
}

/**
 * Find matching pattern
 */
function findMatchingPattern(
  key: string,
  intent?: string
): LearnedPattern | null {
  if (!patternsCache) return null;
  
  for (const pattern of patternsCache.values()) {
    if (pattern.trigger.intent === intent) {
      return pattern;
    }
    
    // Check keyword match
    if (pattern.trigger.keywords?.some(kw => key.includes(kw))) {
      return pattern;
    }
  }
  
  return null;
}

/**
 * Create pattern from feedback
 */
async function createPatternFromFeedback(entry: FeedbackEntry): Promise<void> {
  if (!patternsCache) await loadPatternsCache();
  
  const pattern: LearnedPattern = {
    id: `pat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    patternType: 'intent_action',
    trigger: {
      keywords: extractKeywords(entry.context.userInput),
      intent: entry.context.intent,
      domain: entry.context.domain,
    },
    response: {
      action: entry.action.type,
      params: entry.action.params,
    },
    confidence: 0.5,
    usageCount: 1,
    successRate: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  patternsCache!.set(pattern.id, pattern);
  await savePatternsCache();
}

/**
 * Learn from user correction
 */
async function learnCorrection(entry: FeedbackEntry): Promise<void> {
  if (!entry.correction) return;
  if (!patternsCache) await loadPatternsCache();
  
  // Store the correction as a preference
  if (entry.correction.expectedAction) {
    await setPreference(
      `correction_${entry.context.intent || entry.context.userInput.slice(0, 50)}`,
      {
        expectedAction: entry.correction.expectedAction,
        expectedParams: entry.correction.expectedParams,
        originalAction: entry.action.type,
        context: entry.context,
      },
      {
        category: 'action_prefs',
        domain: entry.context.domain,
        source: 'learned',
        confidence: 0.7,
      }
    );
    
    // Create a pattern for the correction
    const pattern: LearnedPattern = {
      id: `pat_cor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      patternType: 'intent_action',
      trigger: {
        keywords: extractKeywords(entry.context.userInput),
        intent: entry.context.intent,
        domain: entry.context.domain,
        context: [entry.action.type], // Original wrong action
      },
      response: {
        action: entry.correction.expectedAction,
        params: entry.correction.expectedParams,
        suggestion: entry.correction.userComment,
      },
      confidence: 0.7,
      usageCount: 1,
      successRate: 0, // Start low since this corrects a mistake
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    patternsCache!.set(pattern.id, pattern);
    await savePatternsCache();
  }
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall',
    'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'or', 'and', 'but', 'if', 'then', 'else',
    'when', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
    'further', 'once', 'here', 'there', 'where', 'why', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'i', 'me', 'my',
    'please', 'want', 'need', 'help', 'this', 'that', 'it',
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Get action suggestions based on learned patterns
 */
export async function getSuggestions(
  userInput: string,
  context: {
    intent?: string;
    domain?: string;
    url?: string;
  }
): Promise<ActionSuggestion[]> {
  if (!patternsCache) await loadPatternsCache();
  
  const suggestions: ActionSuggestion[] = [];
  const keywords = extractKeywords(userInput);
  
  // Search patterns
  for (const pattern of patternsCache!.values()) {
    if (pattern.confidence < MIN_CONFIDENCE_THRESHOLD) continue;
    
    let matchScore = 0;
    
    // Check intent match
    if (pattern.trigger.intent && context.intent === pattern.trigger.intent) {
      matchScore += 0.5;
    }
    
    // Check domain match
    if (pattern.trigger.domain && context.domain === pattern.trigger.domain) {
      matchScore += 0.2;
    }
    
    // Check keyword match
    if (pattern.trigger.keywords) {
      const matchedKeywords = keywords.filter(kw => 
        pattern.trigger.keywords!.includes(kw)
      );
      matchScore += (matchedKeywords.length / Math.max(keywords.length, 1)) * 0.3;
    }
    
    if (matchScore > 0.2 && pattern.response.action) {
      suggestions.push({
        action: pattern.response.action,
        params: pattern.response.params,
        confidence: pattern.confidence * matchScore,
        reason: pattern.response.suggestion || `Learned from previous interactions`,
        patternId: pattern.id,
      });
    }
  }
  
  // Also search semantic memory
  const memories = await searchMemories(userInput, {
    limit: 5,
    type: 'interaction',
    domain: context.domain,
  });
  
  for (const result of memories) {
    if (result.similarity > 0.5) {
      // Parse memory content for action
      const actionMatch = result.entry.content.match(/-> (\w+)/);
      if (actionMatch) {
        suggestions.push({
          action: actionMatch[1],
          confidence: result.similarity * 0.6,
          reason: `Similar to previous interaction`,
        });
      }
    }
  }
  
  // Sort by confidence and deduplicate
  const seen = new Set<string>();
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .filter(s => {
      if (seen.has(s.action)) return false;
      seen.add(s.action);
      return true;
    })
    .slice(0, 5);
}

/**
 * Record suggestion usage (when user accepts a suggestion)
 */
export async function recordSuggestionUsage(
  patternId: string,
  accepted: boolean
): Promise<void> {
  if (!patternsCache) await loadPatternsCache();
  
  const pattern = patternsCache!.get(patternId);
  if (!pattern) return;
  
  pattern.usageCount++;
  
  if (accepted) {
    pattern.confidence = Math.min(1, pattern.confidence + CONFIDENCE_INCREASE * 0.5);
    pattern.successRate = (
      (pattern.successRate * (pattern.usageCount - 1)) + 1
    ) / pattern.usageCount;
  } else {
    pattern.confidence = Math.max(0, pattern.confidence - CONFIDENCE_DECREASE * 0.5);
    pattern.successRate = (
      (pattern.successRate * (pattern.usageCount - 1)) + 0
    ) / pattern.usageCount;
  }
  
  pattern.updatedAt = Date.now();
  await savePatternsCache();
}

/**
 * Get all learned patterns
 */
export async function getLearnedPatterns(): Promise<LearnedPattern[]> {
  if (!patternsCache) await loadPatternsCache();
  
  return Array.from(patternsCache!.values())
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Delete a pattern
 */
export async function deletePattern(patternId: string): Promise<void> {
  if (!patternsCache) await loadPatternsCache();
  
  patternsCache!.delete(patternId);
  await savePatternsCache();
}

/**
 * Get feedback history
 */
export async function getFeedbackHistory(limit: number = 50): Promise<FeedbackEntry[]> {
  const result = await browser.storage.local.get(FEEDBACK_KEY);
  const entries: FeedbackEntry[] = result[FEEDBACK_KEY] || [];
  
  return entries.slice(0, limit);
}

/**
 * Get learning statistics
 */
export async function getLearningStats(): Promise<{
  totalPatterns: number;
  avgConfidence: number;
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  topPatterns: LearnedPattern[];
}> {
  if (!patternsCache) await loadPatternsCache();
  
  const patterns = Array.from(patternsCache!.values());
  const feedback = await getFeedbackHistory(1000);
  
  const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0);
  
  return {
    totalPatterns: patterns.length,
    avgConfidence: patterns.length > 0 ? totalConfidence / patterns.length : 0,
    totalFeedback: feedback.length,
    positiveFeedback: feedback.filter(f => f.feedback === 'positive').length,
    negativeFeedback: feedback.filter(f => f.feedback === 'negative').length,
    topPatterns: patterns
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10),
  };
}

/**
 * Prune low-confidence patterns
 */
export async function pruneLowConfidencePatterns(
  minConfidence: number = 0.2,
  minUsage: number = 2
): Promise<number> {
  if (!patternsCache) await loadPatternsCache();
  
  let pruned = 0;
  
  for (const [id, pattern] of patternsCache!) {
    if (pattern.confidence < minConfidence && pattern.usageCount >= minUsage) {
      patternsCache!.delete(id);
      pruned++;
    }
  }
  
  if (pruned > 0) {
    await savePatternsCache();
  }
  
  return pruned;
}

/**
 * Clear all learning data
 */
export async function clearLearningData(): Promise<void> {
  patternsCache = new Map();
  await browser.storage.local.remove([FEEDBACK_KEY, PATTERNS_KEY]);
}

/**
 * Export learning data
 */
export async function exportLearningData(): Promise<{
  patterns: LearnedPattern[];
  feedback: FeedbackEntry[];
  exportedAt: number;
}> {
  if (!patternsCache) await loadPatternsCache();
  
  const feedback = await getFeedbackHistory(1000);
  
  return {
    patterns: Array.from(patternsCache!.values()),
    feedback,
    exportedAt: Date.now(),
  };
}

/**
 * Import learning data
 */
export async function importLearningData(data: {
  patterns?: LearnedPattern[];
  feedback?: FeedbackEntry[];
}): Promise<void> {
  if (data.patterns) {
    patternsCache = new Map();
    for (const pattern of data.patterns) {
      patternsCache.set(pattern.id, pattern);
    }
    await savePatternsCache();
  }
  
  if (data.feedback) {
    await browser.storage.local.set({ [FEEDBACK_KEY]: data.feedback });
  }
}
