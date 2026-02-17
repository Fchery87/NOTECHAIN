/**
 * Vitest compatibility shim for Bun test runner
 *
 * This module re-exports Bun's test API with vitest-compatible names,
 * allowing tests written for vitest to work with bun test.
 */

import {
  describe,
  it,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  mock,
  spyOn,
  setDefaultTimeout,
} from 'bun:test';

// Create vi object with vitest-compatible API
const vi = {
  fn: mock,
  spyOn: spyOn,
  mock: mock,

  stubGlobal: (name: string, value: unknown) => {
    (globalThis as Record<string, unknown>)[name] = value;
  },

  unstubAllGlobals: () => {
    // No-op for compatibility
  },

  useFakeTimers: () => {
    // Bun handles timers differently - return self for chaining
    return vi;
  },

  useRealTimers: () => {
    // Bun handles timers differently
  },

  runAllTimers: () => {
    // Bun doesn't have this, but we can try to advance time
  },

  runOnlyPendingTimers: () => {
    // No-op
  },

  advanceTimersByTime: (_ms: number) => {
    // No-op
  },

  advanceTimersToNextTimer: () => {
    // No-op
  },

  getTimerCount: () => 0,

  clearAllMocks: () => {
    // Bun clears mocks automatically
  },

  resetAllMocks: () => {
    // Bun resets mocks automatically
  },

  restoreAllMocks: () => {
    // Bun restores mocks automatically
  },

  mockImplementation: <T extends (...args: unknown[]) => unknown>(fn: T) => {
    return mock(fn);
  },

  mockResolvedValue: <T>(value: T) => {
    return mock(() => Promise.resolve(value));
  },

  mockRejectedValue: <T>(value: T) => {
    return mock(() => Promise.reject(value));
  },

  mockReturnValue: <T>(value: T) => {
    return mock(() => value);
  },

  mockClear: (_mock: unknown) => {
    // No-op
  },

  mockReset: (_mock: unknown) => {
    // No-op
  },

  mockRestore: (_mock: unknown) => {
    // No-op
  },

  importActual: async <T = unknown>(modulePath: string): Promise<T> => {
    // Re-import the actual module
    return import(modulePath) as Promise<T>;
  },

  importMock: async <T = unknown>(_modulePath: string): Promise<T> => {
    return {} as T;
  },

  mocked: <T>(item: T): T => {
    return item;
  },

  waitFor: async (
    callback: () => boolean | void,
    options?: { timeout?: number; interval?: number }
  ) => {
    const timeout = options?.timeout ?? 1000;
    const interval = options?.interval ?? 50;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      try {
        const result = callback();
        if (result === true || result === undefined) {
          return;
        }
      } catch {
        // Continue waiting
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('waitFor timeout exceeded');
  },
};

// Re-export everything with vitest-compatible names
export { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, mock, spyOn, vi };

// Default export for convenience
export default {
  describe,
  it,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  mock,
  spyOn,
  vi,
};
