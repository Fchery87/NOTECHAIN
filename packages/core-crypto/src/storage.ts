/**
 * Storage abstraction layer for environment-agnostic key storage
 * Works in browser (localStorage), Node.js (in-memory), React Native (AsyncStorage)
 */

export interface StorageAdapter {
  /** Get an item from storage */
  getItem(key: string): Promise<string | null> | string | null;
  /** Set an item in storage */
  setItem(key: string, value: string): Promise<void> | void;
  /** Remove an item from storage */
  removeItem(key: string): Promise<void> | void;
}

/**
 * Browser storage adapter using localStorage
 */
export class BrowserStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  removeItem(key: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
}

/**
 * In-memory storage adapter for Node.js and testing
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  /** Clear all stored items (useful for testing) */
  clear(): void {
    this.store.clear();
  }
}

/**
 * Detect and return the appropriate storage adapter
 */
export function detectStorage(): StorageAdapter {
  if (typeof localStorage !== 'undefined') {
    return new BrowserStorageAdapter();
  }
  return new MemoryStorageAdapter();
}

/** Default storage adapter instance */
export const defaultStorage = detectStorage();
