/**
 * Content Security Policy (CSP) Configuration
 *
 * SECURITY UPDATE (Sprint 2):
 * - Now uses nonce-based CSP for scripts and styles
 * - Removed 'unsafe-inline' and 'unsafe-eval' for production
 * - Nonces are generated per-request for maximum security
 *
 * Nonce-based CSP provides strong XSS protection while allowing
 * necessary inline scripts/styles in Next.js applications.
 *
 * EDGE RUNTIME COMPATIBILITY (Sprint 4):
 * - Uses Web Crypto API instead of Node.js crypto
 * - Compatible with Next.js middleware edge runtime
 */

export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'frame-src'?: string[];
  'frame-ancestors'?: string[];
  'form-action'?: string[];
  'base-uri'?: string[];
  'manifest-src'?: string[];
  'worker-src'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
  'report-uri'?: string[];
  'report-to'?: string[];
}

/**
 * Convert Uint8Array to base64 string (edge runtime compatible)
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Generate a cryptographically secure nonce for CSP
 * Uses Web Crypto API which is available in both edge runtime and browser
 */
export function generateNonce(): string {
  // Web Crypto API is available in edge runtime and browser
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return uint8ArrayToBase64(array);
  }

  // Fallback (should not happen in normal environments)
  throw new Error('Web Crypto API is not available - cannot generate secure nonce');
}

/**
 * CSP configuration options
 */
export interface CSPConfig {
  /** Include nonce for scripts */
  scriptNonce?: string;
  /** Include nonce for styles */
  styleNonce?: string;
  /** Development mode (more permissive) */
  isDevelopment?: boolean;
  /** Report-only mode (for testing) */
  reportOnly?: boolean;
  /** Report URI for violations */
  reportUri?: string;
}

/**
 * Build strict CSP directives with nonce support
 * This is the production-ready CSP without unsafe-inline/unsafe-eval
 */
export function buildStrictCSP(config: CSPConfig = {}): CSPDirectives {
  const { scriptNonce, styleNonce, reportUri } = config;

  const directives: CSPDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      ...(scriptNonce ? [`'nonce-${scriptNonce}'`] : []),
      'https://challenges.cloudflare.com',
    ],
    'style-src': [
      "'self'",
      ...(styleNonce ? [`'nonce-${styleNonce}'`] : []),
      'https://fonts.googleapis.com',
    ],
    'img-src': ["'self'", 'data:', 'blob:', 'https://*.supabase.co'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'https://api.openai.com',
      'wss://*.supabase.co',
    ],
    'media-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'frame-src': ["'self'", 'https://challenges.cloudflare.com'],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'manifest-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'upgrade-insecure-requests': true,
  };

  if (reportUri) {
    directives['report-uri'] = [reportUri];
  }

  return directives;
}

/**
 * Build development CSP (more permissive for hot reload)
 */
export function buildDevelopmentCSP(config: CSPConfig = {}): CSPDirectives {
  const { scriptNonce, styleNonce: _styleNonce } = config;

  return {
    ...buildStrictCSP(config),
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'https://api.openai.com',
      'wss://*.supabase.co',
      'ws://localhost:3001',
      'ws://localhost:*',
      'http://localhost:*',
    ],
    'script-src': [
      "'self'",
      ...(scriptNonce ? [`'nonce-${scriptNonce}'`] : ["'unsafe-inline'"]),
      "'unsafe-eval'",
      'http://localhost:*',
    ],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  };
}

/**
 * Legacy strict CSP (deprecated - use buildStrictCSP with nonce)
 * @deprecated Use buildStrictCSP with nonce for better security
 */
export const strictCSP: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js - consider using nonce in production
    "'unsafe-eval'", // Required for some JavaScript operations
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind CSS
    'https://fonts.googleapis.com',
  ],
  'img-src': ["'self'", 'data:', 'blob:', 'https://*.supabase.co'],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'https://api.openai.com',
    'wss://*.supabase.co',
  ],
  'media-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'manifest-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'upgrade-insecure-requests': true,
};

/**
 * Legacy development CSP
 * @deprecated Use buildDevelopmentCSP with nonce
 */
export const developmentCSP: CSPDirectives = {
  ...strictCSP,
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'https://api.openai.com',
    'wss://*.supabase.co',
    'ws://localhost:*',
    'http://localhost:*',
  ],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'http://localhost:*'],
};

/**
 * Convert CSP directives to header string
 */
export function buildCSPHeader(directives: CSPDirectives): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(directives)) {
    if (typeof value === 'boolean') {
      if (value) {
        parts.push(key);
      }
    } else if (Array.isArray(value)) {
      parts.push(`${key} ${value.join(' ')}`);
    }
  }

  return parts.join('; ');
}

/**
 * Get CSP based on environment with nonce support
 * This is the recommended way to get CSP headers
 */
export function getCSPWithNonce(config: CSPConfig = {}): string {
  const { isDevelopment = false } = config;
  const directives = isDevelopment ? buildDevelopmentCSP(config) : buildStrictCSP(config);
  return buildCSPHeader(directives);
}

/**
 * Get CSP based on environment (legacy, without nonce)
 * @deprecated Use getCSPWithNonce for better security
 */
export function getCSP(isDevelopment: boolean = false): string {
  const csp = isDevelopment ? developmentCSP : strictCSP;
  return buildCSPHeader(csp);
}

/**
 * CSP for meta tag (more restrictive, no report-uri)
 */
export function getMetaTagCSP(): string {
  const csp = { ...strictCSP };
  // Remove directives not supported in meta tags
  delete (csp as Record<string, unknown>)['frame-ancestors'];
  delete (csp as Record<string, unknown>)['report-uri'];
  delete (csp as Record<string, unknown>)['report-to'];

  return buildCSPHeader(csp);
}

/**
 * Security headers configuration
 */
export interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'Content-Security-Policy-Report-Only'?: string;
  'X-Content-Type-Options'?: string;
  'X-Frame-Options'?: string;
  'X-XSS-Protection'?: string;
  'Strict-Transport-Security'?: string;
  'Referrer-Policy'?: string;
  'Permissions-Policy'?: string;
  'Cross-Origin-Embedder-Policy'?: string;
  'Cross-Origin-Opener-Policy'?: string;
  'Cross-Origin-Resource-Policy'?: string;
}

/**
 * Get all security headers with nonce support
 */
export function getSecurityHeadersWithNonce(config: CSPConfig = {}): SecurityHeaders {
  const { isDevelopment = false, reportOnly = false } = config;
  const hstsMaxAge = isDevelopment ? 0 : 31536000;

  const cspHeader = getCSPWithNonce(config);
  const headerName = reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

  return {
    [headerName]: cspHeader,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': `max-age=${hstsMaxAge}; includeSubDomains; preload`,
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': [
      'accelerometer=()',
      'camera=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
    ].join(', '),
    ...(isDevelopment
      ? {}
      : {
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        }),
  };
}

/**
 * Get all security headers (legacy)
 * @deprecated Use getSecurityHeadersWithNonce for better security
 */
export function getSecurityHeaders(isDevelopment: boolean = false): SecurityHeaders {
  const hstsMaxAge = isDevelopment ? 0 : 31536000;

  return {
    'Content-Security-Policy': getCSP(isDevelopment),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': `max-age=${hstsMaxAge}; includeSubDomains; preload`,
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': [
      'accelerometer=()',
      'camera=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
    ].join(', '),
    ...(isDevelopment
      ? {}
      : {
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        }),
  };
}

/**
 * CSP violation report endpoint
 */
export interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    referrer: string;
    'blocked-uri': string;
    'violated-directive': string;
    'original-policy': string;
    disposition: string;
  };
}

/**
 * Handle CSP violation report
 */
export function handleCSPViolation(report: CSPViolationReport): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.warn('CSP Violation:', report['csp-report']);
    return;
  }

  // In production, send to analytics/logging service
  // This is a placeholder - implement actual logging
  const violation = report['csp-report'];

  // Don't log in production to avoid information leakage
  // Instead, send to secure analytics endpoint
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(
      '/api/security/csp-report',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        blockedUri: violation['blocked-uri'],
        violatedDirective: violation['violated-directive'],
      })
    );
  }
}

/**
 * CSP middleware for Next.js with nonce support
 */
export function createCSPMiddleware(
  options: {
    isDevelopment?: boolean;
    reportOnly?: boolean;
    reportUri?: string;
  } = {}
) {
  const { isDevelopment = false, reportOnly = false, reportUri } = options;

  return function cspMiddleware(headers: Headers): { headers: Headers; nonce: string } {
    // Generate nonce for this request
    const nonce = generateNonce();

    const csp = getCSPWithNonce({
      scriptNonce: nonce,
      styleNonce: nonce,
      isDevelopment,
      reportOnly,
      reportUri,
    });

    const headerName = reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';

    headers.set(headerName, csp);

    return { headers, nonce };
  };
}

/**
 * Export all CSP utilities
 */
export const CSP = {
  strictCSP,
  developmentCSP,
  buildCSPHeader,
  getCSP,
  getCSPWithNonce,
  getMetaTagCSP,
  getSecurityHeaders,
  getSecurityHeadersWithNonce,
  generateNonce,
  handleCSPViolation,
  createCSPMiddleware,
  buildStrictCSP,
  buildDevelopmentCSP,
};

export default CSP;
