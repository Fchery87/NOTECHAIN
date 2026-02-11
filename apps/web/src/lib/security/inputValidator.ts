/**
 * Input Validation and Sanitization Utilities
 * Prevents injection attacks and validates user inputs
 */

import { z } from 'zod';

// Validation schemas
export const schemas = {
  email: z
    .string()
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must not exceed 254 characters')
    .email('Invalid email format'),

  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  noteTitle: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters')
    .regex(/^[^<>]*$/, 'Title contains invalid characters'),

  noteContent: z.string().max(100000, 'Content must not exceed 100KB'),

  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),

  searchQuery: z
    .string()
    .max(200, 'Search query too long')
    .regex(/^[^<>]*$/, 'Search query contains invalid characters'),

  fileName: z
    .string()
    .max(255, 'Filename too long')
    .regex(/^[^<>\/:"|?*]+$/, 'Filename contains invalid characters')
    .refine(name => !name.startsWith('.'), 'Hidden files not allowed'),
};

export type ValidationResult<T> = { success: true; data: T } | { success: false; errors: string[] };

/**
 * Validate email address
 */
export function validateEmail(email: unknown): ValidationResult<string> {
  const result = schemas.email.safeParse(email);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map(e => e.message),
  };
}

/**
 * Validate password strength
 */
export function validatePassword(password: unknown): ValidationResult<string> {
  const result = schemas.password.safeParse(password);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map(e => e.message),
  };
}

/**
 * Validate note title
 */
export function validateNoteTitle(title: unknown): ValidationResult<string> {
  const result = schemas.noteTitle.safeParse(title);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map(e => e.message),
  };
}

/**
 * Validate note content
 */
export function validateNoteContent(content: unknown): ValidationResult<string> {
  const result = schemas.noteContent.safeParse(content);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map(e => e.message),
  };
}

/**
 * Validate username
 */
export function validateUsername(username: unknown): ValidationResult<string> {
  const result = schemas.username.safeParse(username);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map(e => e.message),
  };
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: unknown): ValidationResult<string> {
  const result = schemas.searchQuery.safeParse(query);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map(e => e.message),
  };
}

/**
 * Validate filename
 */
export function validateFileName(filename: unknown): ValidationResult<string> {
  const result = schemas.fileName.safeParse(filename);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map(e => e.message),
  };
}

/**
 * Sanitize HTML content to prevent XSS
 * Uses a whitelist approach - only allows specific safe tags
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';

  // Allowed HTML tags (whitelist approach)
  const allowedTags = new Set([
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'strike',
    'del',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'code',
    'pre',
    'a',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ]);

  // Allowed attributes for specific tags
  const allowedAttributes: Record<string, Set<string>> = {
    a: new Set(['href', 'title', 'target']),
    img: new Set(['src', 'alt', 'title', 'width', 'height']),
  };

  // Remove script tags and event handlers
  const sanitized = input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  // Parse and clean HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, 'text/html');

  function cleanNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode(true);
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      if (!allowedTags.has(tagName)) {
        // Replace disallowed tags with their text content
        const text = document.createTextNode(element.textContent || '');
        return text;
      }

      // Create clean element
      const clean = document.createElement(tagName);

      // Copy allowed attributes
      const allowedAttrs = allowedAttributes[tagName];
      if (allowedAttrs) {
        Array.from(element.attributes).forEach(attr => {
          if (allowedAttrs.has(attr.name)) {
            // Sanitize URLs
            if (
              (tagName === 'a' && attr.name === 'href') ||
              (tagName === 'img' && attr.name === 'src')
            ) {
              const url = attr.value.trim();
              if (
                url.startsWith('http://') ||
                url.startsWith('https://') ||
                url.startsWith('/') ||
                url.startsWith('#') ||
                url.startsWith('mailto:')
              ) {
                clean.setAttribute(attr.name, url);
              }
            } else {
              clean.setAttribute(attr.name, attr.value);
            }
          }
        });
      }

      // Recursively clean child nodes
      Array.from(element.childNodes).forEach(child => {
        const cleaned = cleanNode(child);
        if (cleaned) {
          clean.appendChild(cleaned);
        }
      });

      return clean;
    }

    return null;
  }

  const body = doc.body;
  const cleanedBody = document.createElement('div');

  Array.from(body.childNodes).forEach(child => {
    const cleaned = cleanNode(child);
    if (cleaned) {
      cleanedBody.appendChild(cleaned);
    }
  });

  return cleanedBody.innerHTML;
}

/**
 * Sanitize plain text - removes all HTML
 */
export function sanitizeText(input: string): string {
  if (!input) return '';

  // Create a temporary element to strip HTML
  const temp = document.createElement('div');
  temp.textContent = input;
  return temp.textContent || '';
}

/**
 * Validate and sanitize user input
 * Combines validation and sanitization
 */
export function validateAndSanitize(
  input: string,
  type: 'email' | 'password' | 'text' | 'html' | 'search'
): ValidationResult<string> {
  switch (type) {
    case 'email':
      return validateEmail(input);

    case 'password':
      return validatePassword(input);

    case 'text':
      return {
        success: true,
        data: sanitizeText(input),
      };

    case 'html':
      return {
        success: true,
        data: sanitizeHtml(input),
      };

    case 'search': {
      const searchResult = validateSearchQuery(input);
      if (!searchResult.success) return searchResult;
      return {
        success: true,
        data: sanitizeText(searchResult.data),
      };
    }

    default:
      return {
        success: true,
        data: sanitizeText(input),
      };
  }
}

/**
 * Check for common injection patterns
 */
export function detectInjection(input: string): boolean {
  const patterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /\.exec\s*\(/i,
    /\.eval\s*\(/i,
    /union\s+select/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /drop\s+table/i,
    /\.\.\//, // Path traversal
    /%2e%2e%2f/i, // URL encoded path traversal
    /\$\{/,
    /\{\{/,
  ];

  return patterns.some(pattern => pattern.test(input));
}

/**
 * Rate limit validation attempts
 */
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  canProceed(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  getTimeUntilReset(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) return 0;
    return Math.max(0, record.resetTime - Date.now());
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Global rate limiter for validation
export const validationRateLimiter = new RateLimiter(10, 60000);

/**
 * Validate with rate limiting
 */
export function validateWithRateLimit(
  identifier: string,
  input: unknown,
  validator: (input: unknown) => ValidationResult<unknown>
): ValidationResult<unknown> & { rateLimited?: boolean; retryAfter?: number } {
  if (!validationRateLimiter.canProceed(identifier)) {
    return {
      success: false,
      errors: ['Too many validation attempts. Please try again later.'],
      rateLimited: true,
      retryAfter: validationRateLimiter.getTimeUntilReset(identifier),
    };
  }

  return validator(input) as ValidationResult<unknown> & {
    rateLimited?: boolean;
    retryAfter?: number;
  };
}

/**
 * File validation
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export function validateFile(
  file: File,
  options: FileValidationOptions = {}
): ValidationResult<File> {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes,
    allowedExtensions,
  } = options;

  const errors: string[] = [];

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${formatBytes(maxSize)} limit`);
  }

  // Check MIME type
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} not allowed`);
  }

  // Check extension
  if (allowedExtensions) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      errors.push(`File extension .${extension} not allowed`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: file };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Export all validation functions
 */
export const InputValidator = {
  email: validateEmail,
  password: validatePassword,
  noteTitle: validateNoteTitle,
  noteContent: validateNoteContent,
  username: validateUsername,
  searchQuery: validateSearchQuery,
  fileName: validateFileName,
  sanitizeHtml,
  sanitizeText,
  validateAndSanitize,
  detectInjection,
  validateWithRateLimit,
  validateFile,
};

export default InputValidator;
