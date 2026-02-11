/**
 * Content Security Policy (CSP) Configuration
 * Defines strict CSP to prevent XSS and other injection attacks
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
}

/**
 * Strict CSP configuration for production
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
 * Lenient CSP for development
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
 * Get CSP based on environment
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
 * Get all security headers
 */
export function getSecurityHeaders(isDevelopment: boolean = false): SecurityHeaders {
  const hstsMaxAge = isDevelopment ? 0 : 31536000; // 1 year in production

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
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };
}

/**
 * Generate nonce for inline scripts
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
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
 * CSP middleware for Next.js
 */
export function createCSPMiddleware(
  options: {
    isDevelopment?: boolean;
    reportOnly?: boolean;
  } = {}
) {
  const { isDevelopment = false, reportOnly = false } = options;

  return function cspMiddleware(headers: Headers): Headers {
    const csp = getCSP(isDevelopment);
    const headerName = reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';

    headers.set(headerName, csp);

    return headers;
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
  getMetaTagCSP,
  getSecurityHeaders,
  generateNonce,
  handleCSPViolation,
  createCSPMiddleware,
};

export default CSP;
