// Intent Classification for user commands

import nlp from 'compromise';
import type { ParsedIntent, IntentAction, ExtractedEntity } from './types';
import { INTENT_PATTERNS } from './types';
import { extractEntities, normalizeText } from './entities';

/**
 * Parse user input to extract intent and entities
 */
export function parseIntent(input: string): ParsedIntent {
  const normalized = normalizeText(input);
  const entities = extractEntities(input);
  const doc = nlp(normalized);
  
  // Get the primary verb
  const verbs = doc.verbs().out('array') as string[];
  const firstVerb = verbs[0]?.toLowerCase();
  
  // Determine action from patterns
  let action: IntentAction = 'unknown';
  let confidence = 0;
  
  // First, try to match patterns
  for (const pattern of INTENT_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(normalized)) {
        action = pattern.action;
        confidence = 0.9;
        break;
      }
    }
    if (confidence > 0) break;
  }
  
  // If no pattern match, try verb matching
  if (action === 'unknown' && firstVerb) {
    for (const pattern of INTENT_PATTERNS) {
      if (pattern.verbs.includes(firstVerb)) {
        action = pattern.action;
        confidence = 0.7;
        break;
      }
    }
  }
  
  // If still unknown, check for keywords
  if (action === 'unknown') {
    const normalizedLower = normalized.toLowerCase();
    for (const pattern of INTENT_PATTERNS) {
      for (const keyword of pattern.keywords) {
        if (normalizedLower.includes(keyword)) {
          action = pattern.action;
          confidence = 0.5;
          break;
        }
      }
      if (confidence > 0) break;
    }
  }
  
  // If it's a question, classify as question intent
  if (action === 'unknown' && isQuestion(input)) {
    action = 'question';
    confidence = 0.8;
  }
  
  // Extract target from the input
  const target = extractTarget(input, action, entities);
  
  // Build parameters from entities
  const parameters = buildParameters(action, entities);
  
  return {
    action,
    target,
    entities,
    parameters,
    confidence,
    raw: input,
    normalized,
  };
}

/**
 * Check if input is a question
 */
function isQuestion(input: string): boolean {
  const doc = nlp(input);
  const questions = doc.questions();
  return questions.length > 0 || input.trim().endsWith('?');
}

/**
 * Extract the target of the action
 */
function extractTarget(
  input: string,
  action: IntentAction,
  entities: ExtractedEntity[]
): string | undefined {
  // For navigation, look for URLs first
  const url = entities.find(e => e.type === 'url');
  if (url && (action === 'navigate' || action === 'open')) {
    return url.value;
  }
  
  // For click/fill actions, look for selectors
  const selector = entities.find(e => e.type === 'selector');
  if (selector && (action === 'click' || action === 'fill')) {
    return selector.value;
  }
  
  // Extract noun phrases as potential targets
  const doc = nlp(input);
  
  // Remove the action verb and get what follows
  let remaining = input;
  for (const pattern of INTENT_PATTERNS) {
    for (const regex of pattern.patterns) {
      remaining = remaining.replace(regex, '').trim();
    }
  }
  
  // Get the first noun phrase
  const nouns = doc.nouns().out('array') as string[];
  if (nouns.length > 0) {
    return nouns[0];
  }
  
  // Fallback to remaining text
  return remaining || undefined;
}

/**
 * Build action parameters from entities
 */
function buildParameters(
  action: IntentAction,
  entities: ExtractedEntity[]
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  
  // Add entities as parameters based on action
  switch (action) {
    case 'navigate':
    case 'search':
      const url = entities.find(e => e.type === 'url');
      if (url) params.url = url.value;
      break;
      
    case 'fill':
      const value = entities.find(e => 
        e.type === 'email' || 
        e.type === 'phone' || 
        e.type === 'number'
      );
      if (value) params.value = value.value;
      break;
      
    case 'book':
      const date = entities.find(e => e.type === 'date' || e.type === 'datetime');
      if (date) params.date = date.value;
      
      const person = entities.find(e => e.type === 'person');
      if (person) params.name = person.value;
      break;
      
    case 'buy':
      const money = entities.find(e => e.type === 'money');
      if (money) params.amount = money.value;
      
      const number = entities.find(e => e.type === 'number');
      if (number) params.quantity = number.value;
      break;
  }
  
  // Add all entities as a reference
  params.entities = entities.map(e => ({
    type: e.type,
    value: e.value,
  }));
  
  return params;
}

/**
 * Get suggested actions based on current context
 */
export function getSuggestedActions(pageContext: {
  url: string;
  title: string;
  hasForms?: boolean;
  hasLinks?: boolean;
}): IntentAction[] {
  const suggestions: IntentAction[] = [];
  
  // Always suggest search and navigate
  suggestions.push('search', 'navigate');
  
  // If page has forms, suggest fill
  if (pageContext.hasForms) {
    suggestions.push('fill');
  }
  
  // Suggest summarize for content pages
  if (pageContext.url.includes('article') || 
      pageContext.url.includes('blog') || 
      pageContext.url.includes('news')) {
    suggestions.push('summarize');
  }
  
  // Suggest extract for data-rich pages
  if (pageContext.url.includes('search') || 
      pageContext.url.includes('results') ||
      pageContext.url.includes('list')) {
    suggestions.push('extract', 'compare');
  }
  
  // E-commerce suggestions
  if (pageContext.url.includes('product') || 
      pageContext.url.includes('shop') ||
      pageContext.url.includes('cart')) {
    suggestions.push('buy', 'compare');
  }
  
  // Booking suggestions
  if (pageContext.url.includes('book') || 
      pageContext.url.includes('reservation') ||
      pageContext.url.includes('flight') ||
      pageContext.url.includes('hotel')) {
    suggestions.push('book');
  }
  
  return [...new Set(suggestions)];
}
