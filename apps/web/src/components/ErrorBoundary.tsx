'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

/**
 * Error boundary fallback props
 */
interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

/**
 * Error boundary props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Default error fallback component
 * Follows NoteChain design system - Warm Editorial Minimalism
 */
function DefaultErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div
      className="
        flex flex-col items-center justify-center
        min-h-[200px] p-8
        bg-stone-50 rounded-2xl
        border border-rose-200
      "
      role="alert"
      aria-live="assertive"
    >
      {/* Error Icon */}
      <div className="w-16 h-16 mb-4 bg-rose-100 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-rose-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Error Message */}
      <h2 className="font-serif text-xl font-medium text-stone-900 mb-2">Something went wrong</h2>

      <p className="text-stone-600 text-center mb-4 max-w-md">
        We&apos;ve encountered an unexpected issue. Your data is safe and encrypted.
      </p>

      {/* Error Details (collapsible in production) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mb-4 text-left w-full max-w-md">
          <summary className="text-sm text-stone-500 cursor-pointer hover:text-stone-700">
            Error details
          </summary>
          <pre className="mt-2 p-3 bg-stone-100 rounded-lg text-xs text-stone-700 overflow-auto font-mono">
            {error.message}
            {'\n'}
            {error.stack}
          </pre>
        </details>
      )}

      {/* Retry Button */}
      <button
        onClick={resetErrorBoundary}
        className="
          px-5 py-2.5
          bg-stone-900 text-stone-50
          font-medium rounded-lg
          hover:bg-stone-800
          transition-all duration-300
          hover:shadow-lg hover:shadow-stone-900/20
          focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
        "
      >
        Try again
      </button>
    </div>
  );
}

/**
 * ErrorBoundary component - Catches JavaScript errors anywhere in child component tree
 *
 * @example
 * ```tsx
 * <ErrorBoundary onError={logError}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error without sensitive data
    console.error('ErrorBoundary caught an error:', error);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
      // Or custom error logging service
      this.logErrorSafely(error, errorInfo);
    }
  }

  private logErrorSafely(error: Error, errorInfo: ErrorInfo) {
    // Strip potentially sensitive information before logging
    const safeError = {
      name: error.name,
      message: error.message.replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        '[EMAIL]'
      ),
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      componentStack: errorInfo.componentStack?.split('\n').slice(0, 5).join('\n'),
      timestamp: new Date().toISOString(),
    };

    // Send to logging endpoint
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safeError),
      // Use keepalive to ensure error is sent even if page unloads
      keepalive: true,
    }).catch(() => {
      // Silent fail - don't cause another error
    });
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />
      );
    }

    return this.props.children;
  }
}

/**
 * AsyncErrorBoundary - Wrapper for async operations with retry logic
 */
interface AsyncErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'children'> {
  children: ReactNode;
  resetKeys?: Array<string | number>;
}

export class AsyncErrorBoundary extends Component<AsyncErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: AsyncErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: AsyncErrorBoundaryProps) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
