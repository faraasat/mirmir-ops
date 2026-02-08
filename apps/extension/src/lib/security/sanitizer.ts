// Data Sanitizer - Input validation and sanitization

/**
 * HTML entities map
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  return input.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize for use in HTML attribute
 */
export function sanitizeAttribute(input: string): string {
  return sanitizeHtml(input).replace(/[\r\n]/g, '');
}

/**
 * Sanitize text content (remove all HTML)
 */
export function sanitizeText(input: string): string {
  // Remove HTML tags
  let clean = input.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  clean = clean
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
  
  // Then re-sanitize to ensure safety
  return sanitizeHtml(clean);
}

/**
 * Sanitize for SQL (basic protection, always use parameterized queries)
 */
export function sanitizeSql(input: string): string {
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '')
    .replace(/\x00/g, '')
    .replace(/\x1a/g, '');
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(input: string): string | null {
  try {
    const url = new URL(input);
    
    // Only allow safe protocols
    const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!safeProtocols.includes(url.protocol)) {
      return null;
    }
    
    // Check for javascript in URL
    if (/javascript:/i.test(input)) {
      return null;
    }
    
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(input: string): string {
  return input
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Invalid filename chars
    .replace(/^\.+/, '_') // No leading dots
    .replace(/\.+$/, '') // No trailing dots
    .slice(0, 255); // Max filename length
}

/**
 * Sanitize JSON string
 */
export function sanitizeJson(input: string): unknown {
  try {
    const parsed = JSON.parse(input);
    return sanitizeObject(parsed);
  } catch {
    return null;
  }
}

/**
 * Sanitize object (deep)
 */
export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeHtml(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key as well
      const safeKey = sanitizeHtml(key);
      sanitized[safeKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate phone number (basic)
 */
export function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  return /^\+?[0-9]{7,15}$/.test(cleanPhone);
}

/**
 * Validate credit card number (Luhn algorithm)
 */
export function isValidCreditCard(cardNumber: string): boolean {
  const clean = cardNumber.replace(/\D/g, '');
  
  if (clean.length < 13 || clean.length > 19) {
    return false;
  }
  
  let sum = 0;
  let isEven = false;
  
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Validate alphanumeric string
 */
export function isAlphanumeric(input: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(input);
}

/**
 * Validate string length
 */
export function isValidLength(input: string, min: number, max: number): boolean {
  return input.length >= min && input.length <= max;
}

/**
 * Validate integer in range
 */
export function isValidInteger(input: unknown, min?: number, max?: number): boolean {
  const num = typeof input === 'string' ? parseInt(input, 10) : input;
  
  if (typeof num !== 'number' || !Number.isInteger(num)) {
    return false;
  }
  
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  
  return true;
}

/**
 * Remove potentially dangerous content from string
 */
export function stripDangerous(input: string): string {
  return input
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*(['"])[^'"]*\1/gi, '')
    .replace(/\s*on\w+\s*=[^\s>]*/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (can be dangerous)
    .replace(/data:[^,]*,/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '');
}

/**
 * Truncate string safely
 */
export function truncate(input: string, maxLength: number, suffix: string = '...'): string {
  if (input.length <= maxLength) return input;
  
  return input.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Normalize whitespace
 */
export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

/**
 * Remove control characters
 */
export function removeControlChars(input: string): string {
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validate and sanitize user input based on type
 */
export function validateInput(
  input: string,
  type: 'text' | 'email' | 'url' | 'phone' | 'number' | 'alphanumeric',
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  } = {}
): { valid: boolean; sanitized: string | null; error?: string } {
  const { required = false, minLength, maxLength, min, max } = options;
  
  // Required check
  if (!input || input.trim() === '') {
    if (required) {
      return { valid: false, sanitized: null, error: 'Field is required' };
    }
    return { valid: true, sanitized: '' };
  }
  
  let sanitized = removeControlChars(input.trim());
  
  // Length checks
  if (minLength !== undefined && sanitized.length < minLength) {
    return { valid: false, sanitized: null, error: `Minimum length is ${minLength}` };
  }
  
  if (maxLength !== undefined && sanitized.length > maxLength) {
    return { valid: false, sanitized: null, error: `Maximum length is ${maxLength}` };
  }
  
  // Type-specific validation
  switch (type) {
    case 'email':
      if (!isValidEmail(sanitized)) {
        return { valid: false, sanitized: null, error: 'Invalid email format' };
      }
      return { valid: true, sanitized: sanitized.toLowerCase() };
      
    case 'url':
      const safeUrl = sanitizeUrl(sanitized);
      if (!safeUrl) {
        return { valid: false, sanitized: null, error: 'Invalid URL format' };
      }
      return { valid: true, sanitized: safeUrl };
      
    case 'phone':
      if (!isValidPhone(sanitized)) {
        return { valid: false, sanitized: null, error: 'Invalid phone number' };
      }
      return { valid: true, sanitized: sanitized.replace(/[\s\-\(\)\.]/g, '') };
      
    case 'number':
      const num = parseFloat(sanitized);
      if (isNaN(num)) {
        return { valid: false, sanitized: null, error: 'Invalid number' };
      }
      if (min !== undefined && num < min) {
        return { valid: false, sanitized: null, error: `Minimum value is ${min}` };
      }
      if (max !== undefined && num > max) {
        return { valid: false, sanitized: null, error: `Maximum value is ${max}` };
      }
      return { valid: true, sanitized: String(num) };
      
    case 'alphanumeric':
      if (!isAlphanumeric(sanitized)) {
        return { valid: false, sanitized: null, error: 'Only letters and numbers allowed' };
      }
      return { valid: true, sanitized };
      
    case 'text':
    default:
      return { valid: true, sanitized: sanitizeHtml(sanitized) };
  }
}

/**
 * Create a schema-based validator
 */
export function createValidator<T extends Record<string, unknown>>(
  schema: Record<keyof T, {
    type: 'text' | 'email' | 'url' | 'phone' | 'number' | 'alphanumeric' | 'boolean' | 'object';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: unknown) => boolean;
  }>
): (data: unknown) => { valid: boolean; errors: Record<string, string>; sanitized: T | null } {
  return (data: unknown) => {
    if (!data || typeof data !== 'object') {
      return {
        valid: false,
        errors: { _root: 'Invalid data format' },
        sanitized: null,
      };
    }
    
    const errors: Record<string, string> = {};
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, rules] of Object.entries(schema)) {
      const value = (data as Record<string, unknown>)[key];
      
      // Boolean type
      if (rules.type === 'boolean') {
        if (rules.required && value === undefined) {
          errors[key] = 'Field is required';
          continue;
        }
        sanitized[key] = Boolean(value);
        continue;
      }
      
      // Object type
      if (rules.type === 'object') {
        if (rules.required && !value) {
          errors[key] = 'Field is required';
          continue;
        }
        if (value && typeof value !== 'object') {
          errors[key] = 'Must be an object';
          continue;
        }
        sanitized[key] = sanitizeObject(value);
        continue;
      }
      
      // String-based types
      const stringValue = String(value ?? '');
      const result = validateInput(stringValue, rules.type, {
        required: rules.required,
        minLength: rules.minLength,
        maxLength: rules.maxLength,
        min: rules.min,
        max: rules.max,
      });
      
      if (!result.valid) {
        errors[key] = result.error || 'Invalid value';
        continue;
      }
      
      // Custom pattern
      if (rules.pattern && !rules.pattern.test(result.sanitized || '')) {
        errors[key] = 'Value does not match required pattern';
        continue;
      }
      
      // Custom validator
      if (rules.custom && !rules.custom(result.sanitized)) {
        errors[key] = 'Custom validation failed';
        continue;
      }
      
      sanitized[key] = result.sanitized;
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors,
      sanitized: Object.keys(errors).length === 0 ? (sanitized as T) : null,
    };
  };
}
