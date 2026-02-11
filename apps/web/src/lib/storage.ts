/**
 * Simple storage wrapper for web browser
 * Uses localStorage for simple key-value storage
 */

export async function setItem(key: string, value: string): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, value);
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return null;
}

export async function removeItem(key: string): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(key);
  }
}

export async function clear(): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
}
