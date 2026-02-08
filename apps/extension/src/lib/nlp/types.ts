// NLP Types for entity extraction and intent parsing

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export type EntityType =
  | 'date'
  | 'time'
  | 'datetime'
  | 'number'
  | 'money'
  | 'percent'
  | 'email'
  | 'url'
  | 'phone'
  | 'person'
  | 'place'
  | 'organization'
  | 'hashtag'
  | 'mention'
  | 'selector'
  | 'command';

export interface ParsedIntent {
  action: IntentAction;
  target?: string;
  entities: ExtractedEntity[];
  parameters: Record<string, unknown>;
  confidence: number;
  raw: string;
  normalized: string;
}

export type IntentAction =
  | 'navigate'
  | 'search'
  | 'click'
  | 'fill'
  | 'extract'
  | 'scroll'
  | 'summarize'
  | 'compare'
  | 'book'
  | 'buy'
  | 'find'
  | 'open'
  | 'close'
  | 'save'
  | 'copy'
  | 'question'
  | 'unknown';

export interface IntentPattern {
  action: IntentAction;
  patterns: RegExp[];
  keywords: string[];
  verbs: string[];
}

export const INTENT_PATTERNS: IntentPattern[] = [
  {
    action: 'navigate',
    patterns: [/^go\s+to/i, /^open\s+/i, /^visit\s+/i, /^take\s+me\s+to/i],
    keywords: ['go', 'navigate', 'open', 'visit', 'take me'],
    verbs: ['go', 'navigate', 'open', 'visit'],
  },
  {
    action: 'search',
    patterns: [/^search\s+for/i, /^find\s+/i, /^look\s+for/i, /^look\s+up/i],
    keywords: ['search', 'find', 'look for', 'look up', 'google'],
    verbs: ['search', 'find', 'look', 'google'],
  },
  {
    action: 'click',
    patterns: [/^click\s+/i, /^press\s+/i, /^tap\s+/i, /^select\s+/i],
    keywords: ['click', 'press', 'tap', 'select', 'choose'],
    verbs: ['click', 'press', 'tap', 'select', 'choose'],
  },
  {
    action: 'fill',
    patterns: [/^fill\s+/i, /^type\s+/i, /^enter\s+/i, /^input\s+/i, /^set\s+/i],
    keywords: ['fill', 'type', 'enter', 'input', 'set'],
    verbs: ['fill', 'type', 'enter', 'input', 'set', 'write'],
  },
  {
    action: 'extract',
    patterns: [/^extract\s+/i, /^get\s+/i, /^grab\s+/i, /^scrape\s+/i, /^pull\s+/i],
    keywords: ['extract', 'get', 'grab', 'scrape', 'pull', 'copy'],
    verbs: ['extract', 'get', 'grab', 'scrape', 'pull'],
  },
  {
    action: 'scroll',
    patterns: [/^scroll\s+/i, /^go\s+down/i, /^go\s+up/i],
    keywords: ['scroll', 'page down', 'page up'],
    verbs: ['scroll'],
  },
  {
    action: 'summarize',
    patterns: [/^summarize/i, /^summary\s+of/i, /^give\s+me\s+a\s+summary/i, /^tldr/i],
    keywords: ['summarize', 'summary', 'tldr', 'brief', 'overview'],
    verbs: ['summarize', 'condense', 'brief'],
  },
  {
    action: 'compare',
    patterns: [/^compare\s+/i, /^difference\s+between/i, /^vs\s+/i],
    keywords: ['compare', 'difference', 'versus', 'vs'],
    verbs: ['compare', 'contrast'],
  },
  {
    action: 'book',
    patterns: [/^book\s+/i, /^reserve\s+/i, /^schedule\s+/i],
    keywords: ['book', 'reserve', 'schedule', 'appointment'],
    verbs: ['book', 'reserve', 'schedule'],
  },
  {
    action: 'buy',
    patterns: [/^buy\s+/i, /^purchase\s+/i, /^order\s+/i, /^add\s+to\s+cart/i],
    keywords: ['buy', 'purchase', 'order', 'checkout', 'add to cart'],
    verbs: ['buy', 'purchase', 'order'],
  },
  {
    action: 'save',
    patterns: [/^save\s+/i, /^download\s+/i, /^export\s+/i],
    keywords: ['save', 'download', 'export', 'store'],
    verbs: ['save', 'download', 'export', 'store'],
  },
  {
    action: 'copy',
    patterns: [/^copy\s+/i, /^clipboard/i],
    keywords: ['copy', 'clipboard'],
    verbs: ['copy'],
  },
];
