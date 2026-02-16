/**
 * Production-Ready Logging Utility for NoteChain
 *
 * Security Features:
 * - Environment-aware: Only logs in development by default
 * - Structured logging with log levels
 * - Sensitive data redaction
 * - Correlation IDs for request tracing
 * - Production-safe: No sensitive data leakage
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Failed to save', { error: err });
 */

/**
 * Log levels following RFC 5424
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Log level priority (higher = more severe)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

/**
 * Sensitive field names that should be redacted
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwd',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'authorization',
  'auth',
  'credential',
  'privateKey',
  'private_key',
  'masterKey',
  'master_key',
  'sessionToken',
  'session_token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'jwt',
  'jwtSecret',
  'jwt_secret',
  'key',
  'salt',
  'iv',
  'nonce',
  'ciphertext',
  'plaintext',
];

/**
 * Check if we're in a development environment
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENV === 'development';
}

/**
 * Check if we're in a test environment
 */
function isTest(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.NEXT_PUBLIC_ENV === 'test';
}

/**
 * Check if verbose logging is enabled
 */
function isVerboseLogging(): boolean {
  return process.env.NEXT_PUBLIC_VERBOSE_LOGGING === 'true';
}

/**
 * Redact sensitive fields from an object
 */
function redactSensitive<T>(obj: T, depth: number = 0): T {
  // Prevent infinite recursion
  if (depth > 5) {
    return '[max depth reached]' as T;
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitive(item, depth + 1)) as T;
  }

  if (obj instanceof Error) {
    // Errors are safe to log, but limit stack traces in production
    const errorObj: Record<string, unknown> = {
      name: obj.name,
      message: obj.message,
    };
    if (isDevelopment() || isVerboseLogging()) {
      errorObj.stack = obj.stack;
    }
    return errorObj as T;
  }

  if (obj instanceof Date) {
    return obj;
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();

    // Check if this field should be redacted
    const shouldRedact = SENSITIVE_FIELDS.some(
      field => lowerKey === field || lowerKey.includes(field.toLowerCase())
    );

    if (shouldRedact) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitive(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }

  return redacted as T;
}

/**
 * Generate a correlation ID for request tracing
 */
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Format a log entry
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Include correlation IDs */
  includeCorrelationId: boolean;
  /** Redact sensitive fields */
  redactSensitive: boolean;
  /** Output as JSON (for production) or pretty print (for development) */
  json: boolean;
  /** Include timestamp */
  includeTimestamp: boolean;
}

/**
 * Default logger configuration based on environment
 */
function getDefaultConfig(): LoggerConfig {
  const dev = isDevelopment();
  const test = isTest();

  return {
    minLevel: dev || test ? 'debug' : 'warn',
    includeCorrelationId: !dev,
    redactSensitive: true,
    json: !dev && !test,
    includeTimestamp: true,
  };
}

/**
 * Logger class with environment-aware logging
 */
export class Logger {
  private config: LoggerConfig;
  private correlationId: string | null = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...getDefaultConfig(), ...config };
  }

  /**
   * Set correlation ID for request tracing
   */
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | null {
    return this.correlationId;
  }

  /**
   * Create a child logger with a new correlation ID
   */
  child(): Logger {
    const child = new Logger(this.config);
    child.correlationId = generateCorrelationId();
    return child;
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  /**
   * Format and output a log entry
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    // In production, only log errors and above unless verbose logging is enabled
    if (!isDevelopment() && !isTest() && !isVerboseLogging()) {
      if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY.error) {
        return;
      }
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (this.config.includeCorrelationId && this.correlationId) {
      entry.correlationId = this.correlationId;
    }

    if (data) {
      entry.data = this.config.redactSensitive ? redactSensitive(data) : data;
    }

    // Output based on format
    if (this.config.json) {
      this.outputJson(level, entry);
    } else {
      this.outputPretty(level, entry);
    }
  }

  /**
   * Output as JSON (for production/log aggregation)
   */
  private outputJson(level: LogLevel, entry: LogEntry): void {
    const output = JSON.stringify(entry);

    // Use appropriate console method
    switch (level) {
      case 'fatal':
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  /**
   * Output pretty-printed (for development)
   */
  private outputPretty(level: LogLevel, entry: LogEntry): void {
    const timestamp = this.config.includeTimestamp ? `[${entry.timestamp}] ` : '';
    const levelStr = level.toUpperCase().padEnd(5);
    const correlation = entry.correlationId ? ` [${entry.correlationId}]` : '';

    const prefix = `${timestamp}${levelStr}${correlation}`;
    const message = entry.message;

    // Style based on level
    const styles: Record<LogLevel, string> = {
      debug: 'color: gray',
      info: 'color: blue',
      warn: 'color: orange',
      error: 'color: red; font-weight: bold',
      fatal: 'color: white; background: red; font-weight: bold',
    };

    // Output with data if present
    if (entry.data && Object.keys(entry.data).length > 0) {
      console.log(`%c${prefix}`, styles[level], message, entry.data);
    } else {
      console.log(`%c${prefix}`, styles[level], message);
    }
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  /**
   * Log warning
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  /**
   * Log error
   */
  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const errorData: Record<string, unknown> = { ...data };

    if (error instanceof Error) {
      errorData.error = {
        name: error.name,
        message: error.message,
        stack: isDevelopment() ? error.stack : undefined,
      };
    } else if (error !== undefined) {
      errorData.error = String(error);
    }

    this.log('error', message, errorData);
  }

  /**
   * Log fatal error (application should not continue)
   */
  fatal(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const errorData: Record<string, unknown> = { ...data };

    if (error instanceof Error) {
      errorData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error !== undefined) {
      errorData.error = String(error);
    }

    this.log('fatal', message, errorData);
  }

  /**
   * Create a timed operation logger
   */
  time(label: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.debug(`${label} completed`, { duration: `${duration.toFixed(2)}ms` });
    };
  }

  /**
   * Log API request (sanitized)
   */
  apiRequest(method: string, path: string, data?: Record<string, unknown>): void {
    // Sanitize path (remove query params that might contain tokens)
    const sanitizedPath = path.split('?')[0];
    this.info(`API Request: ${method} ${sanitizedPath}`, {
      method,
      path: sanitizedPath,
      ...data,
    });
  }

  /**
   * Log API response (sanitized)
   */
  apiResponse(method: string, path: string, status: number, duration: number): void {
    const sanitizedPath = path.split('?')[0];
    const level = status >= 400 ? 'warn' : 'info';
    this.log(level, `API Response: ${method} ${sanitizedPath}`, {
      method,
      path: sanitizedPath,
      status,
      duration: `${duration.toFixed(2)}ms`,
    });
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a child logger with correlation ID
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

/**
 * Create a request-scoped logger with correlation ID
 */
export function createRequestLogger(): Logger {
  return logger.child();
}

// Export a no-op logger for production builds if needed
export const noopLogger = new Logger({
  minLevel: 'fatal',
  includeCorrelationId: false,
  redactSensitive: true,
  json: true,
  includeTimestamp: false,
});
