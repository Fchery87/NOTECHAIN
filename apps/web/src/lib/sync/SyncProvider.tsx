// apps/web/src/lib/sync/SyncProvider.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { SyncService, type SyncStatus } from '@notechain/sync-engine';
import { SupabaseSyncAdapter } from '@/lib/supabase/syncAdapter';
import { useUser } from '@/lib/supabase/UserProvider';
import { v4 as uuidv4 } from 'uuid';

interface SyncContextType {
  syncService: SyncService | null;
  status: SyncStatus;
  isInitialized: boolean;
  triggerSync: () => Promise<void>;
}

const defaultStatus: SyncStatus = {
  isSyncing: false,
  lastSyncTime: null,
  pendingOperations: 0,
  syncErrors: 0,
  lastSyncVersion: 0,
};

const SyncContext = createContext<SyncContextType>({
  syncService: null,
  status: defaultStatus,
  isInitialized: false,
  triggerSync: async () => {},
});

// Get or create a persistent session ID
function getSessionId(): string {
  if (typeof window === 'undefined') {
    return uuidv4();
  }

  const stored = sessionStorage.getItem('notechain-sync-session-id');
  if (stored) {
    return stored;
  }

  const newId = uuidv4();
  sessionStorage.setItem('notechain-sync-session-id', newId);
  return newId;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isUserLoading } = useUser();
  const [status, setStatus] = useState<SyncStatus>(defaultStatus);
  const [isInitialized, setIsInitialized] = useState(false);
  const syncServiceRef = useRef<SyncService | null>(null);
  // Use a stable session ID that persists across remounts
  const sessionIdRef = useRef<string>(getSessionId());
  // Track the current user ID to detect actual changes
  const currentUserIdRef = useRef<string | null>(null);

  // Stable triggerSync function
  const triggerSync = useCallback(async () => {
    if (syncServiceRef.current) {
      await syncServiceRef.current.syncNow();
    }
  }, []);

  useEffect(() => {
    // Get stable user ID primitive for comparison
    const userId = user?.id ?? null;

    // Wait for user loading to complete
    if (isUserLoading) {
      return;
    }

    // No user - clean up existing sync service
    if (!userId) {
      if (syncServiceRef.current) {
        syncServiceRef.current.destroy();
        syncServiceRef.current = null;
      }
      setIsInitialized(false);
      setStatus(defaultStatus);
      currentUserIdRef.current = null;
      return;
    }

    // Same user - don't reinitialize
    if (currentUserIdRef.current === userId && syncServiceRef.current) {
      return;
    }

    // Different user - clean up old service first
    if (syncServiceRef.current) {
      syncServiceRef.current.destroy();
      syncServiceRef.current = null;
    }

    // Update current user tracking
    currentUserIdRef.current = userId;

    // Track if the effect has been cleaned up
    let isMounted = true;

    // Initialize sync service
    const initSync = async () => {
      try {
        const adapter = new SupabaseSyncAdapter();
        const syncService = new SyncService(
          userId,
          sessionIdRef.current,
          adapter,
          undefined, // Use default conflict resolver
          undefined // Use default platform adapter (browser)
        );

        // Only update ref if still mounted
        if (!isMounted) {
          syncService.destroy();
          return;
        }

        syncServiceRef.current = syncService;

        // Listen for status changes
        syncService.on('statusChanged', (newStatus: SyncStatus) => {
          if (isMounted) {
            setStatus(newStatus);
          }
        });

        syncService.on('syncComplete', () => {
          console.log('[SyncProvider] Sync completed');
        });

        syncService.on('remoteOperationReceived', operation => {
          console.log('[SyncProvider] Remote operation received:', operation);
        });

        // Set up network listeners
        syncService.setupNetworkListeners();

        // Initialize and perform initial sync
        await syncService.initialize();

        if (isMounted) {
          setIsInitialized(true);
          console.log('[SyncProvider] Sync service initialized for user:', userId);
        }
      } catch (error) {
        console.error('[SyncProvider] Failed to initialize sync service:', error);
        if (isMounted) {
          setIsInitialized(false);
        }
      }
    };

    initSync();

    return () => {
      isMounted = false;
      if (syncServiceRef.current) {
        syncServiceRef.current.destroy();
        syncServiceRef.current = null;
      }
    };
  }, [user?.id, isUserLoading]); // Use user?.id instead of user object

  return (
    <SyncContext.Provider
      value={{
        syncService: syncServiceRef.current,
        status,
        isInitialized,
        triggerSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
