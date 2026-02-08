// Data Normalizers - Normalize extracted data to standardized formats

/**
 * Normalized price data
 */
export interface PriceData {
  amount: number;
  currency: string;
  currencySymbol: string;
  original: string;
  formatted: string;
}

/**
 * Normalized date data
 */
export interface DateData {
  iso: string;
  timestamp: number;
  formatted: string;
  relative?: string;
  original: string;
}

/**
 * Currency symbols and codes mapping
 */
const CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  '$': { code: 'USD', symbol: '$' },
  '€': { code: 'EUR', symbol: '€' },
  '£': { code: 'GBP', symbol: '£' },
  '¥': { code: 'JPY', symbol: '¥' },
  '₹': { code: 'INR', symbol: '₹' },
  '₽': { code: 'RUB', symbol: '₽' },
  '₩': { code: 'KRW', symbol: '₩' },
  '¢': { code: 'USD', symbol: '¢' },
  'A$': { code: 'AUD', symbol: 'A$' },
  'C$': { code: 'CAD', symbol: 'C$' },
  'CHF': { code: 'CHF', symbol: 'CHF' },
  'USD': { code: 'USD', symbol: '$' },
  'EUR': { code: 'EUR', symbol: '€' },
  'GBP': { code: 'GBP', symbol: '£' },
  'JPY': { code: 'JPY', symbol: '¥' },
  'INR': { code: 'INR', symbol: '₹' },
  'AUD': { code: 'AUD', symbol: 'A$' },
  'CAD': { code: 'CAD', symbol: 'C$' },
};

/**
 * Exchange rates (simplified, in production use an API)
 */
const EXCHANGE_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  JPY: 0.0067,
  INR: 0.012,
  AUD: 0.65,
  CAD: 0.74,
  CHF: 1.12,
  KRW: 0.00075,
  RUB: 0.011,
};

/**
 * Normalize a price string to standardized format
 */
export function normalizePrice(priceText: string, defaultCurrency: string = 'USD'): PriceData {
  const original = priceText.trim();
  
  // Remove extra whitespace
  let cleaned = original.replace(/\s+/g, ' ');
  
  // Detect currency
  let currency = defaultCurrency;
  let currencySymbol = CURRENCY_MAP[defaultCurrency]?.symbol || defaultCurrency;
  
  for (const [symbol, info] of Object.entries(CURRENCY_MAP)) {
    if (cleaned.includes(symbol)) {
      currency = info.code;
      currencySymbol = info.symbol;
      cleaned = cleaned.replace(symbol, '').trim();
      break;
    }
  }
  
  // Extract numeric value
  // Handle different number formats: 1,234.56 or 1.234,56
  let numericStr = cleaned.replace(/[^\d.,\-]/g, '');
  
  // Determine decimal separator
  const lastComma = numericStr.lastIndexOf(',');
  const lastDot = numericStr.lastIndexOf('.');
  
  if (lastComma > lastDot && lastComma > numericStr.length - 4) {
    // European format: 1.234,56
    numericStr = numericStr.replace(/\./g, '').replace(',', '.');
  } else {
    // US format: 1,234.56
    numericStr = numericStr.replace(/,/g, '');
  }
  
  const amount = parseFloat(numericStr) || 0;
  
  // Format with currency
  const formatted = formatPrice(amount, currency);
  
  return {
    amount,
    currency,
    currencySymbol,
    original,
    formatted,
  };
}

/**
 * Format a price with currency
 */
export function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch {
    const symbol = CURRENCY_MAP[currency]?.symbol || currency;
    return `${symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Convert currency amount to another currency
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  const fromRate = EXCHANGE_RATES_TO_USD[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES_TO_USD[toCurrency] || 1;
  
  // Convert to USD, then to target currency
  const usdAmount = amount * fromRate;
  return usdAmount / toRate;
}

/**
 * Common date patterns
 */
const DATE_PATTERNS = [
  // ISO 8601
  { regex: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/, parse: (s: string) => new Date(s) },
  // US format: MM/DD/YYYY
  { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, parse: (s: string) => {
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
    return new Date(year, parseInt(m[1]) - 1, parseInt(m[2]));
  }},
  // European format: DD/MM/YYYY or DD.MM.YYYY
  { regex: /^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/, parse: (s: string) => {
    const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
    if (!m) return null;
    const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
    return new Date(year, parseInt(m[2]) - 1, parseInt(m[1]));
  }},
  // Written: January 15, 2024 or Jan 15, 2024
  { regex: /^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/i, parse: (s: string) => new Date(s) },
  // Written: 15 January 2024 or 15 Jan 2024
  { regex: /^(\d{1,2})\s+([a-z]+)\s+(\d{4})/i, parse: (s: string) => new Date(s) },
  // Relative: today, yesterday, tomorrow
  { regex: /^(today|yesterday|tomorrow)$/i, parse: (s: string) => {
    const now = new Date();
    const lower = s.toLowerCase();
    if (lower === 'yesterday') {
      now.setDate(now.getDate() - 1);
    } else if (lower === 'tomorrow') {
      now.setDate(now.getDate() + 1);
    }
    return now;
  }},
  // Relative: X days ago
  { regex: /^(\d+)\s+(day|week|month|year)s?\s+ago$/i, parse: (s: string) => {
    const m = s.match(/^(\d+)\s+(day|week|month|year)s?\s+ago$/i);
    if (!m) return null;
    const num = parseInt(m[1]);
    const unit = m[2].toLowerCase();
    const now = new Date();
    if (unit === 'day') now.setDate(now.getDate() - num);
    else if (unit === 'week') now.setDate(now.getDate() - num * 7);
    else if (unit === 'month') now.setMonth(now.getMonth() - num);
    else if (unit === 'year') now.setFullYear(now.getFullYear() - num);
    return now;
  }},
];

/**
 * Normalize a date string to standardized format
 */
export function normalizeDate(dateText: string, _format?: string): DateData {
  const original = dateText.trim();
  
  // Try each pattern
  for (const pattern of DATE_PATTERNS) {
    if (pattern.regex.test(original)) {
      const date = pattern.parse(original);
      if (date && !isNaN(date.getTime())) {
        return createDateData(date, original);
      }
    }
  }
  
  // Fallback: try native Date parsing
  const fallbackDate = new Date(original);
  if (!isNaN(fallbackDate.getTime())) {
    return createDateData(fallbackDate, original);
  }
  
  // Could not parse
  return {
    iso: '',
    timestamp: 0,
    formatted: original,
    original,
  };
}

/**
 * Create DateData from a Date object
 */
function createDateData(date: Date, original: string): DateData {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  let relative: string | undefined;
  if (diffDays === 0) relative = 'today';
  else if (diffDays === 1) relative = 'yesterday';
  else if (diffDays === -1) relative = 'tomorrow';
  else if (diffDays > 0 && diffDays < 7) relative = `${diffDays} days ago`;
  else if (diffDays < 0 && diffDays > -7) relative = `in ${Math.abs(diffDays)} days`;
  
  return {
    iso: date.toISOString(),
    timestamp: date.getTime(),
    formatted: date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    relative,
    original,
  };
}

/**
 * Normalize a phone number
 */
export function normalizePhone(phoneText: string): {
  normalized: string;
  countryCode?: string;
  formatted: string;
  original: string;
} {
  const original = phoneText.trim();
  const digitsOnly = original.replace(/\D/g, '');
  
  let countryCode: string | undefined;
  let nationalNumber = digitsOnly;
  
  // Detect country code
  if (digitsOnly.length >= 11 && digitsOnly.startsWith('1')) {
    countryCode = '+1';
    nationalNumber = digitsOnly.slice(1);
  } else if (digitsOnly.length >= 12 && digitsOnly.startsWith('44')) {
    countryCode = '+44';
    nationalNumber = digitsOnly.slice(2);
  }
  
  // Format US/Canada numbers
  let formatted = original;
  if (nationalNumber.length === 10) {
    formatted = `(${nationalNumber.slice(0, 3)}) ${nationalNumber.slice(3, 6)}-${nationalNumber.slice(6)}`;
    if (countryCode) {
      formatted = `${countryCode} ${formatted}`;
    }
  }
  
  return {
    normalized: countryCode ? `${countryCode}${nationalNumber}` : `+${nationalNumber}`,
    countryCode,
    formatted,
    original,
  };
}

/**
 * Normalize an email address
 */
export function normalizeEmail(emailText: string): {
  normalized: string;
  domain: string;
  isValid: boolean;
  original: string;
} {
  const original = emailText.trim();
  const normalized = original.toLowerCase();
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(normalized);
  
  const domain = isValid ? normalized.split('@')[1] : '';
  
  return {
    normalized,
    domain,
    isValid,
    original,
  };
}

/**
 * Normalize a URL
 */
export function normalizeUrl(urlText: string): {
  normalized: string;
  domain: string;
  path: string;
  protocol: string;
  isValid: boolean;
  original: string;
} {
  const original = urlText.trim();
  
  try {
    // Add protocol if missing
    let urlStr = original;
    if (!urlStr.match(/^https?:\/\//)) {
      urlStr = 'https://' + urlStr;
    }
    
    const url = new URL(urlStr);
    
    return {
      normalized: url.href,
      domain: url.hostname,
      path: url.pathname,
      protocol: url.protocol.replace(':', ''),
      isValid: true,
      original,
    };
  } catch {
    return {
      normalized: original,
      domain: '',
      path: '',
      protocol: '',
      isValid: false,
      original,
    };
  }
}

/**
 * Clean and normalize text content
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')           // Collapse whitespace
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width chars
    .replace(/\u00A0/g, ' ')        // Replace non-breaking space
    .trim();
}

/**
 * Extract numeric value from text
 */
export function extractNumber(text: string): number | null {
  const match = text.match(/-?\d+([.,]\d+)?/);
  if (match) {
    return parseFloat(match[0].replace(',', '.'));
  }
  return null;
}

/**
 * Normalize percentage
 */
export function normalizePercentage(text: string): {
  value: number;
  formatted: string;
  original: string;
} {
  const original = text.trim();
  const numMatch = original.match(/-?\d+([.,]\d+)?/);
  
  let value = numMatch ? parseFloat(numMatch[0].replace(',', '.')) : 0;
  
  // If the original doesn't have %, but value > 1, assume it's already a percentage
  // If original has % and value > 1, it's already in percentage form
  // If value <= 1 and no %, assume it's a decimal (0.5 = 50%)
  if (!original.includes('%') && value <= 1) {
    value = value * 100;
  }
  
  return {
    value,
    formatted: `${value.toFixed(1)}%`,
    original,
  };
}
