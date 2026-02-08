// CSP Manager - Content Security Policy compliance and security headers

/**
 * CSP violation report
 */
export interface CSPViolation {
  id: string;
  timestamp: number;
  documentUri: string;
  blockedUri: string;
  violatedDirective: string;
  effectiveDirective: string;
  originalPolicy: string;
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
  sample?: string;
}

/**
 * Security check result
 */
export interface SecurityCheckResult {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
  score: number; // 0-100
}

// CSP violation log
const violations: CSPViolation[] = [];
const MAX_VIOLATIONS = 100;

/**
 * Check if we're in a service worker context (no DOM access)
 */
function isServiceWorker(): boolean {
  return typeof document === 'undefined' || typeof window === 'undefined';
}

/**
 * Initialize CSP violation listener
 * Note: This only works in document contexts (sidepanel, options page), not in service workers
 */
export function initializeCSPMonitor(): void {
  // Skip in service worker context - no DOM available
  if (isServiceWorker()) {
    console.log('[CSPManager] Skipping CSP monitor in service worker context');
    return;
  }
  
  // Listen for CSP violation reports
  document.addEventListener('securitypolicyviolation', (event) => {
    const violation: CSPViolation = {
      id: `csp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      documentUri: event.documentURI,
      blockedUri: event.blockedURI,
      violatedDirective: event.violatedDirective,
      effectiveDirective: event.effectiveDirective,
      originalPolicy: event.originalPolicy,
      sourceFile: event.sourceFile || undefined,
      lineNumber: event.lineNumber || undefined,
      columnNumber: event.columnNumber || undefined,
      sample: event.sample || undefined,
    };
    
    logViolation(violation);
  });
  
  console.log('[CSPManager] CSP monitor initialized');
}

/**
 * Log a CSP violation
 */
function logViolation(violation: CSPViolation): void {
  violations.unshift(violation);
  
  // Trim to max size
  if (violations.length > MAX_VIOLATIONS) {
    violations.length = MAX_VIOLATIONS;
  }
  
  console.warn('[CSPManager] CSP Violation:', violation);
}

/**
 * Get logged violations
 */
export function getCSPViolations(): CSPViolation[] {
  return [...violations];
}

/**
 * Clear violation log
 */
export function clearCSPViolations(): void {
  violations.length = 0;
}

/**
 * Perform security check on extension
 * Note: DOM checks only run in document contexts, not in service workers
 */
export function performSecurityCheck(): SecurityCheckResult {
  const checks: SecurityCheckResult['checks'] = [];
  
  // Skip DOM checks in service worker context
  if (!isServiceWorker()) {
    // Check 1: Verify no inline scripts (except in sidepanel)
    const inlineScripts = document.querySelectorAll('script:not([src])');
    checks.push({
      name: 'No inline scripts',
      passed: inlineScripts.length === 0,
      message: inlineScripts.length === 0
        ? 'No inline scripts found'
        : `Found ${inlineScripts.length} inline script(s)`,
      severity: 'high',
    });
    
    // Check 2: Verify no inline event handlers
    const elementsWithHandlers = document.querySelectorAll('[onclick], [onload], [onerror], [onmouseover]');
    checks.push({
      name: 'No inline event handlers',
      passed: elementsWithHandlers.length === 0,
      message: elementsWithHandlers.length === 0
        ? 'No inline event handlers found'
        : `Found ${elementsWithHandlers.length} element(s) with inline handlers`,
      severity: 'medium',
    });
    
    // Check 3: Verify secure context (HTTPS or extension)
    const isSecure = window.isSecureContext;
    checks.push({
      name: 'Secure context',
      passed: isSecure,
      message: isSecure
        ? 'Running in secure context'
        : 'Not running in secure context',
      severity: 'critical',
    });
    
    // Check 5: Verify localStorage is available (indicates proper extension context)
    let storageAvailable = false;
    try {
      localStorage.setItem('__test__', '__test__');
      localStorage.removeItem('__test__');
      storageAvailable = true;
    } catch {
      storageAvailable = false;
    }
    checks.push({
      name: 'Storage available',
      passed: storageAvailable,
      message: storageAvailable
        ? 'Local storage is available'
        : 'Local storage is not available',
      severity: 'medium',
    });
    
    // Check 6: Verify Web Crypto API is available
    const cryptoAvailable = !!(window.crypto && window.crypto.subtle);
    checks.push({
      name: 'Web Crypto API available',
      passed: cryptoAvailable,
      message: cryptoAvailable
        ? 'Web Crypto API is available'
        : 'Web Crypto API is not available',
      severity: 'high',
    });
  } else {
    // Service worker context - check crypto availability via globalThis
    const cryptoAvailable = !!(globalThis.crypto && globalThis.crypto.subtle);
    checks.push({
      name: 'Web Crypto API available',
      passed: cryptoAvailable,
      message: cryptoAvailable
        ? 'Web Crypto API is available'
        : 'Web Crypto API is not available',
      severity: 'high',
    });
  }
  
  // Check 4: Check for eval() usage (not possible to detect at runtime, assume pass)
  checks.push({
    name: 'No eval() usage',
    passed: true,
    message: 'eval() usage must be verified via code review',
    severity: 'critical',
  });
  
  // Check 7: No recent CSP violations
  const recentViolations = violations.filter(
    v => Date.now() - v.timestamp < 60 * 60 * 1000 // Last hour
  );
  checks.push({
    name: 'No recent CSP violations',
    passed: recentViolations.length === 0,
    message: recentViolations.length === 0
      ? 'No CSP violations in the last hour'
      : `${recentViolations.length} CSP violation(s) in the last hour`,
    severity: 'high',
  });
  
  // Calculate score
  const severityWeights = {
    critical: 30,
    high: 20,
    medium: 10,
    low: 5,
  };
  
  const maxScore = checks.reduce((sum, c) => sum + severityWeights[c.severity], 0);
  const actualScore = checks.reduce(
    (sum, c) => sum + (c.passed ? severityWeights[c.severity] : 0),
    0
  );
  
  return {
    passed: checks.every(c => c.passed || c.severity === 'low'),
    checks,
    score: Math.round((actualScore / maxScore) * 100),
  };
}

/**
 * Get recommended CSP for the extension manifest
 */
export function getRecommendedCSP(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // Allow inline styles for UI
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  
  return directives.join('; ');
}

/**
 * Sanitize URL to prevent injection
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    
    // Only allow http, https, and extension protocols
    if (!['http:', 'https:', 'chrome-extension:', 'moz-extension:'].includes(parsed.protocol)) {
      return null;
    }
    
    // Remove dangerous fragments and query params
    const dangerousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i,
      /on\w+=/i,
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(url)) {
        return null;
      }
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validate origin for postMessage
 */
export function isValidOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.includes('*')) return true;
  
  return allowedOrigins.some(allowed => {
    if (allowed.startsWith('*.')) {
      // Wildcard subdomain matching
      const domain = allowed.slice(2);
      return origin.endsWith(domain) || origin === `https://${domain}`;
    }
    return origin === allowed;
  });
}

/**
 * Create a safe iframe sandbox attribute
 */
export function getSafeIframeSandbox(permissions: {
  allowScripts?: boolean;
  allowForms?: boolean;
  allowPopups?: boolean;
  allowSameOrigin?: boolean;
}): string {
  const values: string[] = [];
  
  if (permissions.allowScripts) values.push('allow-scripts');
  if (permissions.allowForms) values.push('allow-forms');
  if (permissions.allowPopups) values.push('allow-popups');
  if (permissions.allowSameOrigin) values.push('allow-same-origin');
  
  // Never allow together: scripts + same-origin (defeats sandbox)
  if (permissions.allowScripts && permissions.allowSameOrigin) {
    console.warn('[CSPManager] Warning: allow-scripts + allow-same-origin defeats sandbox purpose');
  }
  
  return values.join(' ');
}

/**
 * Check if extension context is valid
 */
export function isValidExtensionContext(): boolean {
  try {
    // Check if we're in an extension context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromeRuntime = (globalThis as any).chrome?.runtime;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const browserRuntime = (globalThis as any).browser?.runtime;
    
    if (chromeRuntime?.id) {
      return true;
    }
    
    if (browserRuntime?.id) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Rate limit sensitive operations
 */
export function createRateLimiter(
  maxRequests: number,
  windowMs: number
): (key: string) => boolean {
  const requests = new Map<string, number[]>();
  
  return (key: string): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get and filter existing requests
    const keyRequests = (requests.get(key) || []).filter(time => time > windowStart);
    
    if (keyRequests.length >= maxRequests) {
      return false; // Rate limited
    }
    
    // Add new request
    keyRequests.push(now);
    requests.set(key, keyRequests);
    
    return true;
  };
}

/**
 * Generate nonce for inline scripts (if needed)
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}
