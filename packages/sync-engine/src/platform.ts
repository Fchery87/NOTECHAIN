/**
 * Platform abstraction layer for environment-agnostic sync operations
 * Allows the sync engine to work in browser, Node.js, React Native, etc.
 */

export interface NetworkStatus {
  /** Whether the network is currently available */
  isOnline: boolean;
  /** Subscribe to online/offline changes */
  onOnlineChange?: (callback: (isOnline: boolean) => void) => () => void;
}

export interface PlatformAdapter {
  /** Get current network status */
  getNetworkStatus(): NetworkStatus;
  /** Subscribe to network status changes, returns unsubscribe function */
  subscribeToNetworkChanges(callback: (isOnline: boolean) => void): () => void;
}

/**
 * Browser platform adapter - uses navigator and window
 */
export class BrowserPlatformAdapter implements PlatformAdapter {
  getNetworkStatus(): NetworkStatus {
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  }

  subscribeToNetworkChanges(callback: (isOnline: boolean) => void): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}

/**
 * Node.js platform adapter - always online (server environments)
 */
export class NodePlatformAdapter implements PlatformAdapter {
  getNetworkStatus(): NetworkStatus {
    return { isOnline: true };
  }

  subscribeToNetworkChanges(_callback: (isOnline: boolean) => void): () => void {
    // Node.js doesn't have network status events
    return () => {};
  }
}

/**
 * Test platform adapter - controllable network status for testing
 */
export class TestPlatformAdapter implements PlatformAdapter {
  private isOnlineStatus: boolean = true;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  getNetworkStatus(): NetworkStatus {
    return { isOnline: this.isOnlineStatus };
  }

  subscribeToNetworkChanges(callback: (isOnline: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /** Set network status for testing */
  setOnlineStatus(isOnline: boolean): void {
    this.isOnlineStatus = isOnline;
    this.listeners.forEach(cb => cb(isOnline));
  }
}

/**
 * Detect and return the appropriate platform adapter
 */
export function detectPlatform(): PlatformAdapter {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    return new BrowserPlatformAdapter();
  }
  return new NodePlatformAdapter();
}

/** Default platform adapter instance */
export const defaultPlatform = detectPlatform();
