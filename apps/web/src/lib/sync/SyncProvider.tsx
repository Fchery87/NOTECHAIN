// apps/web/src/lib/sync/SyncProvider.tsx
'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
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

const SyncContext = createContext<SyncContextType>({
  syncService: null,
  status: {
    isSyncing: false,
    lastSyncTime: null,
    pendingOperations: 0,
    syncErrors: 0,
    lastSyncVersion: 0,
  },
  isInitialized: false,
  triggerSync: async () => {},
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isUserLoading } = useUser();
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    pendingOperations: 0,
    syncErrors: 0,
    lastSyncVersion: 0,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const syncServiceRef = useRef<SyncService | null>(null);
  const sessionIdRef = useRef<string>(uuidv4());

  useEffect(() => {
    if (isUserLoading || !user) {
      // Clean up existing sync service if user logs out
      if (syncServiceRef.current) {
        syncServiceRef.current.destroy();
        syncServiceRef.current = null;
      }
      setIsInitialized(false);
      return;
    }

    // Initialize sync service
    const adapter = new SupabaseSyncAdapter();
    const syncService = new SyncService(
      user.id,
      sessionIdRef.current,
      adapter,
      undefined, // Use default conflict resolver
      undefined // Use default platform adapter (browser)
    );

    syncServiceRef.current = syncService;

    // Listen for status changes
    syncService.on('statusChanged', (newStatus: SyncStatus) => {
      setStatus(newStatus);
    });

    syncService.on('syncComplete', () => {
      console.log('Sync completed');
    });

    syncService.on('remoteOperationReceived', operation => {
      console.log('Remote operation received:', operation);
    });

    // Set up network listeners
    syncService.setupNetworkListeners();

    // Initialize and perform initial sync
    syncService.initialize().then(() => {
      setIsInitialized(true);
      console.log('Sync service initialized');
    });

    return () => {
      syncService.destroy();
      syncServiceRef.current = null;
    };
  }, [user, isUserLoading]);

  const triggerSync = async () => {
    if (syncServiceRef.current) {
      await syncServiceRef.current.syncNow();
    }
  };

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
