// Security Module - Export all security-related functionality

export * from './crypto-manager';
export * from './secure-storage';
export * from './privacy-manager';
export * from './csp-manager';
export {
  sanitizeHtml,
  sanitizeAttribute,
  sanitizeText,
  sanitizeSql,
  sanitizeFilename,
  sanitizeJson,
  sanitizeObject,
  isValidEmail,
  isValidUrl,
  isValidPhone,
  isValidCreditCard,
  isAlphanumeric,
  isValidLength,
  isValidInteger,
  stripDangerous,
  truncate,
  normalizeWhitespace,
  removeControlChars,
  validateInput,
  createValidator,
} from './sanitizer';

// Re-export initialization functions
import { initializeCryptoManager } from './crypto-manager';
import { initializeCSPMonitor } from './csp-manager';

/**
 * Initialize all security systems
 */
export async function initializeSecuritySystems(): Promise<void> {
  await initializeCryptoManager();
  initializeCSPMonitor();
  
  console.log('[Security] All security systems initialized');
}
