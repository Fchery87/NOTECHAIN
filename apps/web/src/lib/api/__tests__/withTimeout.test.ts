import { describe, it, expect, vi } from 'vitest';
import { withTimeout, TimeoutError } from '../withTimeout';

describe('withTimeout', () => {
  it('should reject after timeout', async () => {
    // Create Promise that resolves after 100ms
    const slowPromise = new Promise<string>(resolve => {
      setTimeout(() => resolve('completed'), 100);
    });

    // Use withTimeout with 10ms timeout
    await expect(withTimeout(slowPromise, 10, 'Slow operation')).rejects.toThrow(TimeoutError);
  });

  it('should resolve when promise completes quickly', async () => {
    // Create Promise that resolves after 10ms
    const fastPromise = new Promise<string>(resolve => {
      setTimeout(() => resolve('completed'), 10);
    });

    // Use withTimeout with 100ms timeout
    const result = await withTimeout(fastPromise, 100, 'Fast operation');
    expect(result).toBe('completed');
  });

  it('should include context in TimeoutError', async () => {
    const slowPromise = new Promise<void>(resolve => {
      setTimeout(() => resolve(), 100);
    });

    await expect(withTimeout(slowPromise, 10, 'Test context')).rejects.toSatisfy((error: Error) => {
      if (!(error instanceof TimeoutError)) {
        return false;
      }
      return error.message.includes('Test context') && error.timeoutMs === 10;
    });
  });

  it('should forward non-timeout errors', async () => {
    const failingPromise = Promise.reject(new Error('Operation failed'));

    await expect(withTimeout(failingPromise, 1000, 'Failing operation')).rejects.toThrow(
      'Operation failed'
    );
  });
});
