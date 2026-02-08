// NLP module exports

export * from './types';
export { extractEntities, extractEntitiesOfType, normalizeText, extractKeyTerms } from './entities';
export { parseIntent, getSuggestedActions } from './intent';

// Re-export parseIntent as classifyIntent for backwards compatibility
export { parseIntent as classifyIntent } from './intent';
