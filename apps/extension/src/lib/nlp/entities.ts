// Entity Extraction using Compromise.js

import nlp from 'compromise';
import type { ExtractedEntity, EntityType } from './types';

// Extend compromise with additional plugins
import dates from 'compromise-dates';
// @ts-expect-error - compromise-numbers types issue
import numbers from 'compromise-numbers';

// Register plugins
// eslint-disable-next-line @typescript-eslint/no-explicit-any
nlp.extend(dates as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
nlp.extend(numbers as any);

// Type for extended nlp document
interface NlpDoc {
  text: () => string;
  json: () => Array<{ offset: { start: number; length: number } }>;
}

interface ExtendedNlp {
  dates: () => { forEach: (fn: (match: NlpDoc) => void) => void };
  numbers: () => { forEach: (fn: (match: NlpDoc) => void) => void };
  people: () => { forEach: (fn: (match: NlpDoc) => void) => void };
  places: () => { forEach: (fn: (match: NlpDoc) => void) => void };
  organizations: () => { forEach: (fn: (match: NlpDoc) => void) => void };
  nouns: () => { out: (format: string) => string[] };
  verbs: () => { out: (format: string) => string[] };
  normalize: (options: Record<string, boolean>) => { text: () => string };
}

/**
 * Extract all entities from text
 */
export function extractEntities(text: string): ExtractedEntity[] {
  const doc = nlp(text) as unknown as ExtendedNlp;
  const entities: ExtractedEntity[] = [];

  // Extract dates
  const dates_found = doc.dates();
  dates_found.forEach((match: NlpDoc) => {
    const json = match.json()[0];
    entities.push({
      type: 'date',
      value: match.text(),
      text: match.text(),
      start: json?.offset?.start || 0,
      end: (json?.offset?.start || 0) + (json?.offset?.length || match.text().length),
      confidence: 0.9,
    });
  });

  // Extract numbers and money
  const numbers_found = doc.numbers();
  numbers_found.forEach((match: NlpDoc) => {
    const text_match = match.text();
    const json = match.json()[0];
    const isMoney = /^\$|€|£|¥|\d+\s*(dollars?|euros?|pounds?|yen)/.test(text_match);
    const isPercent = /%$/.test(text_match);
    
    entities.push({
      type: isMoney ? 'money' : isPercent ? 'percent' : 'number',
      value: text_match,
      text: text_match,
      start: json?.offset?.start || 0,
      end: (json?.offset?.start || 0) + (json?.offset?.length || text_match.length),
      confidence: 0.85,
    });
  });

  // Extract people names
  const people = doc.people();
  people.forEach((match: NlpDoc) => {
    const json = match.json()[0];
    entities.push({
      type: 'person',
      value: match.text(),
      text: match.text(),
      start: json?.offset?.start || 0,
      end: (json?.offset?.start || 0) + (json?.offset?.length || match.text().length),
      confidence: 0.8,
    });
  });

  // Extract places
  const places = doc.places();
  places.forEach((match: NlpDoc) => {
    const json = match.json()[0];
    entities.push({
      type: 'place',
      value: match.text(),
      text: match.text(),
      start: json?.offset?.start || 0,
      end: (json?.offset?.start || 0) + (json?.offset?.length || match.text().length),
      confidence: 0.8,
    });
  });

  // Extract organizations
  const orgs = doc.organizations();
  orgs.forEach((match: NlpDoc) => {
    const json = match.json()[0];
    entities.push({
      type: 'organization',
      value: match.text(),
      text: match.text(),
      start: json?.offset?.start || 0,
      end: (json?.offset?.start || 0) + (json?.offset?.length || match.text().length),
      confidence: 0.75,
    });
  });

  // Extract URLs using regex
  const urlRegex = /https?:\/\/[^\s]+/g;
  let urlMatch;
  while ((urlMatch = urlRegex.exec(text)) !== null) {
    entities.push({
      type: 'url',
      value: urlMatch[0],
      text: urlMatch[0],
      start: urlMatch.index,
      end: urlMatch.index + urlMatch[0].length,
      confidence: 1.0,
    });
  }

  // Extract emails using regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let emailMatch;
  while ((emailMatch = emailRegex.exec(text)) !== null) {
    entities.push({
      type: 'email',
      value: emailMatch[0],
      text: emailMatch[0],
      start: emailMatch.index,
      end: emailMatch.index + emailMatch[0].length,
      confidence: 1.0,
    });
  }

  // Extract phone numbers using regex
  const phoneRegex = /(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/g;
  let phoneMatch;
  while ((phoneMatch = phoneRegex.exec(text)) !== null) {
    entities.push({
      type: 'phone',
      value: phoneMatch[0],
      text: phoneMatch[0],
      start: phoneMatch.index,
      end: phoneMatch.index + phoneMatch[0].length,
      confidence: 0.9,
    });
  }

  // Extract hashtags
  const hashtagRegex = /#[a-zA-Z][a-zA-Z0-9_]*/g;
  let hashtagMatch;
  while ((hashtagMatch = hashtagRegex.exec(text)) !== null) {
    entities.push({
      type: 'hashtag',
      value: hashtagMatch[0],
      text: hashtagMatch[0],
      start: hashtagMatch.index,
      end: hashtagMatch.index + hashtagMatch[0].length,
      confidence: 1.0,
    });
  }

  // Extract mentions
  const mentionRegex = /@[a-zA-Z][a-zA-Z0-9_]*/g;
  let mentionMatch;
  while ((mentionMatch = mentionRegex.exec(text)) !== null) {
    entities.push({
      type: 'mention',
      value: mentionMatch[0],
      text: mentionMatch[0],
      start: mentionMatch.index,
      end: mentionMatch.index + mentionMatch[0].length,
      confidence: 1.0,
    });
  }

  // Extract CSS selectors (quoted strings that look like selectors)
  const selectorRegex = /"([#.][a-zA-Z][a-zA-Z0-9_-]*(?:\s+[#.>+~][a-zA-Z][a-zA-Z0-9_-]*)*)"|'([#.][a-zA-Z][a-zA-Z0-9_-]*(?:\s+[#.>+~][a-zA-Z][a-zA-Z0-9_-]*)*)'/g;
  let selectorMatch;
  while ((selectorMatch = selectorRegex.exec(text)) !== null) {
    const selector = selectorMatch[1] || selectorMatch[2];
    entities.push({
      type: 'selector',
      value: selector,
      text: selectorMatch[0],
      start: selectorMatch.index,
      end: selectorMatch.index + selectorMatch[0].length,
      confidence: 0.9,
    });
  }

  // Sort by position and remove duplicates
  return entities
    .sort((a, b) => a.start - b.start)
    .filter((entity, index, arr) => {
      // Remove duplicates with same start position
      return index === 0 || entity.start !== arr[index - 1].start;
    });
}

/**
 * Extract entities of a specific type
 */
export function extractEntitiesOfType(text: string, type: EntityType): ExtractedEntity[] {
  return extractEntities(text).filter(e => e.type === type);
}

/**
 * Get normalized text
 */
export function normalizeText(text: string): string {
  const doc = nlp(text) as unknown as ExtendedNlp;
  
  // Normalize contractions, lowercase, trim
  return doc
    .normalize({
      whitespace: true,
      punctuation: false,
      case: true,
      contractions: true,
      unicode: true,
    })
    .text();
}

/**
 * Extract key terms from text
 */
export function extractKeyTerms(text: string): string[] {
  const doc = nlp(text) as unknown as ExtendedNlp;
  
  // Get nouns and noun phrases
  const nouns = doc.nouns().out('array') as string[];
  const verbs = doc.verbs().out('array') as string[];
  
  return [...new Set([...nouns, ...verbs])];
}
