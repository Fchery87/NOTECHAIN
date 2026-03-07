import { NextRequest, NextResponse } from 'next/server';

export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly timeoutMs: number
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  context: string
): Promise<T> {
  // Create timeout Promise that rejects after timeoutMs
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`Operation timed out: ${context}`, context, timeoutMs));
    }, timeoutMs);
  });

  // Race between the original promise and timeout
  return Promise.race([promise, timeoutPromise]);
}

export function createTimeoutMiddleware(defaultTimeoutMs: number = 5000) {
  return function withTimeoutHandler<T extends NextRequest>(
    handler: (req: T) => Promise<NextResponse>,
    timeoutMs?: number
  ) {
    return async (req: T): Promise<NextResponse> => {
      try {
        const effectiveTimeout = timeoutMs ?? defaultTimeoutMs;
        return await withTimeout(handler(req), effectiveTimeout, `API request ${req.url}`);
      } catch (error) {
        if (error instanceof TimeoutError) {
          return NextResponse.json(
            { error: 'Request Timeout', message: 'The request took too long to process' },
            { status: 504 }
          );
        }
        // Re-throw other errors for upstream error handling
        throw error;
      }
    };
  };
}
