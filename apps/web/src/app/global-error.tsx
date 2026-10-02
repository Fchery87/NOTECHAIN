'use client';

import { useEffect } from 'react';
import { logError } from '@/lib/errorHandling';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, { type: 'global-error' });
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 font-sans antialiased">
        <div className="flex items-center justify-center min-h-screen p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-rose-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-stone-900 mb-2">Something went wrong</h1>
            <p className="text-stone-600 mb-6">
              NoteChain encountered an unexpected error. Your encrypted data is safe.
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
