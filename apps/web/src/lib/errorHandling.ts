/**
 * Global Error Handling Utilities
 *
 * Provides centralized error handling, retry logic, and error reporting.
 */

import { useCallback, useState } from 'react';

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Delay between retries in ms */
  retryDelay: number;
  /** Whether to use exponential backoff */
  exponentialBackoff?: boolean;
  /** Maximum delay in ms */
  maxDelay?: number;
}

/**
 * Default retry configuration
 */
export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  maxDelay: 30000,
};

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, retryDelay, exponentialBackoff, maxDelay } = {
    ...defaultRetryConfig,
    ...config,
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = exponentialBackoff
          ? Math.min(retryDelay * Math.pow(2, attempt), maxDelay || Infinity)
          : retryDelay;

        console.warn(
          `Attempt ${attempt + 1}/${maxRetries + 1} failed. Retrying in ${delay}ms...`,
          lastError.message
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Hook for retry logic with state management
 */
export function useRetry<T>(fn: () => Promise<T>, config: Partial<RetryConfig> = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(async (): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    setRetryCount(0);

    try {
      const result = await withRetry(fn, config);
      setIsLoading(false);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsLoading(false);
      return null;
    }
  }, [fn, config]);

  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsLoading(false);
  }, []);

  return {
    execute,
    reset,
    isLoading,
    error,
    retryCount,
  };
}

/**
 * User-friendly error message mapping
 */
const errorMessageMap: Record<string, string> = {
  'Network Error': 'Unable to connect to the server. Please check your internet connection.',
  timeout: 'The request timed out. Please try again.',
  '404': 'The requested resource was not found.',
  '403': 'You do not have permission to access this resource.',
  '401': 'Please sign in to continue.',
  '500': 'An unexpected error occurred. Please try again later.',
  '503': 'Service temporarily unavailable. Please try again later.',
};

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check for specific error messages
    for (const [key, message] of Object.entries(errorMessageMap)) {
      if (error.message.includes(key)) {
        return message;
      }
    }

    // Return sanitized error message
    return sanitizeErrorMessage(error.message);
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Sanitize error message (remove sensitive data)
 */
function sanitizeErrorMessage(message: string): string {
  // Remove emails
  let sanitized = message.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[EMAIL]'
  );

  // Remove URLs with credentials
  sanitized = sanitized.replace(/(https?:\/\/)[^\s]+:[^\s]+@/g, '$1[CREDENTIALS]@');

  // Remove API keys/tokens
  sanitized = sanitized.replace(
    /([Aa]pi[_-]?[Kk]ey|[Tt]oken|[Ss]ecret)[\s]*[=:]+[\s]*[^\s]+/g,
    '$1=[REDACTED]'
  );

  return sanitized;
}

/**
 * Safe error logging (without sensitive data)
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const errorInfo = {
    type: error instanceof Error ? error.name : 'Unknown',
    message: error instanceof Error ? sanitizeErrorMessage(error.message) : String(error),
    stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  console.error('[Error]', errorInfo);

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error, { extra: errorInfo });
    sendErrorToEndpoint(errorInfo);
  }
}

/**
 * Send error to logging endpoint
 */
async function sendErrorToEndpoint(errorInfo: Record<string, unknown>): Promise<void> {
  try {
    await fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorInfo),
      keepalive: true,
    });
  } catch {
    // Silent fail - don't cause another error
  }
}

/**
 * Debounce error logging to prevent spam
 */
export function createDebouncedErrorLogger(
  delay: number = 5000
): (error: unknown, context?: Record<string, unknown>) => void {
  const errorCache = new Map<string, number>();

  return (error: unknown, context?: Record<string, unknown>) => {
    const key = error instanceof Error ? error.message : String(error);
    const now = Date.now();
    const lastLogged = errorCache.get(key);

    if (!lastLogged || now - lastLogged > delay) {
      errorCache.set(key, now);
      logError(error, context);
    }
  };
}

/**
 * Handle unhandled promise rejections
 */
export function setupGlobalErrorHandlers(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    event.preventDefault();
    logError(event.reason, { type: 'unhandledrejection' });
  };

  const handleError = (event: ErrorEvent) => {
    event.preventDefault();
    logError(event.error, {
      type: 'error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };

  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  window.addEventListener('error', handleError);

  return () => {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    window.removeEventListener('error', handleError);
  };
}

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Classify error severity
 */
export function classifyErrorSeverity(error: unknown): ErrorSeverity {
  if (!(error instanceof Error)) return 'low';

  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('timeout')) {
    return 'medium';
  }

  if (message.includes('unauthorized') || message.includes('forbidden')) {
    return 'high';
  }

  if (message.includes('crash') || message.includes('fatal')) {
    return 'critical';
  }

  return 'low';
}

export default {
  withRetry,
  useRetry,
  getUserFriendlyErrorMessage,
  logError,
  createDebouncedErrorLogger,
  setupGlobalErrorHandlers,
  classifyErrorSeverity,
};
