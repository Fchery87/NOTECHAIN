'use client';

import { useEffect } from 'react';
import { setupGlobalErrorHandlers, logError } from '@/lib/errorHandling';

/**
 * Initializes global error handlers for unhandled rejections and runtime errors.
 * Must be a client component mounted in the root layout.
 */
export function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = setupGlobalErrorHandlers();
    logError('global error handlers initialized', { type: 'lifecycle' });
    return cleanup;
  }, []);

  return <>{children}</>;
}
