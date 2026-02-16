// apps/web/src/components/SyncDebugPanel.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSync } from '@/lib/sync/SyncProvider';
import { offlineQueue } from '@/lib/sync/offlineQueue';
import { encryptedSyncService } from '@/lib/sync/encryptedSyncService';

interface QueueStats {
  total: number;
  retryable: number;
  failed: number;
  maxRetriesReached: number;
}

/**
 * SyncDebugPanel - Development tool for monitoring sync state
 * Shows queue statistics, encryption status, and allows manual sync control
 */
export function SyncDebugPanel() {
  const { status, isInitialized, triggerSync } = useSync();
  const [isOpen, setIsOpen] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    retryable: 0,
    failed: 0,
    maxRetriesReached: 0,
  });
  const [isEncryptionReady, setIsEncryptionReady] = useState(false);

  // Use ref for the refresh function to avoid interval recreation
  const refreshStatsRef = useRef<(() => Promise<void>) | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const stats = await offlineQueue.getStats();
      setQueueStats(stats);
      setIsEncryptionReady(encryptedSyncService.isReady());
    } catch (error) {
      console.error('[SyncDebugPanel] Error refreshing stats:', error);
    }
  }, []);

  // Keep ref updated
  useEffect(() => {
    refreshStatsRef.current = refreshStats;
  }, [refreshStats]);

  // Set up polling interval with stable ref
  useEffect(() => {
    // Initial refresh
    refreshStatsRef.current?.();

    // Set up interval using ref to avoid dependency issues
    const interval = setInterval(() => {
      refreshStatsRef.current?.();
    }, 2000);

    return () => clearInterval(interval);
  }, []); // No dependencies - interval runs independently

  const handleClearQueue = async () => {
    await offlineQueue.clear();
    await refreshStats();
  };

  const handleForceSync = async () => {
    await triggerSync();
    await refreshStats();
  };

  const handleRegenerateKey = async () => {
    await encryptedSyncService.clear();
    await encryptedSyncService.initialize();
    await refreshStats();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 px-4 py-2 bg-stone-800 text-stone-50 rounded-lg shadow-lg hover:bg-stone-700 transition-colors z-50 text-sm font-medium"
      >
        🔧 Sync Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-xl shadow-2xl border border-stone-200 z-50 max-h-[80vh] overflow-auto">
      <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50 rounded-t-xl">
        <h3 className="font-medium text-stone-900">Sync Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-stone-400 hover:text-stone-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Sync Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-stone-700">Sync Status</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-stone-50 p-2 rounded">
              <span className="text-stone-500">Initialized:</span>
              <span
                className={`ml-2 font-medium ${isInitialized ? 'text-green-600' : 'text-red-600'}`}
              >
                {isInitialized ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="bg-stone-50 p-2 rounded">
              <span className="text-stone-500">Syncing:</span>
              <span
                className={`ml-2 font-medium ${status.isSyncing ? 'text-amber-600' : 'text-green-600'}`}
              >
                {status.isSyncing ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="bg-stone-50 p-2 rounded">
              <span className="text-stone-500">Pending:</span>
              <span className="ml-2 font-medium text-stone-900">{status.pendingOperations}</span>
            </div>
            <div className="bg-stone-50 p-2 rounded">
              <span className="text-stone-500">Errors:</span>
              <span
                className={`ml-2 font-medium ${status.syncErrors > 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                {status.syncErrors}
              </span>
            </div>
          </div>
          {status.lastSyncTime && (
            <p className="text-xs text-stone-500">
              Last sync: {status.lastSyncTime.toLocaleString()}
            </p>
          )}
        </div>

        {/* Encryption Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-stone-700">Encryption</h4>
          <div className="bg-stone-50 p-2 rounded text-sm">
            <span className="text-stone-500">Status:</span>
            <span
              className={`ml-2 font-medium ${isEncryptionReady ? 'text-green-600' : 'text-amber-600'}`}
            >
              {isEncryptionReady ? 'Ready (XSalsa20-Poly1305)' : 'Initializing...'}
            </span>
          </div>
        </div>

        {/* Queue Statistics */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-stone-700">Offline Queue</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-stone-50 p-2 rounded">
              <span className="text-stone-500">Total:</span>
              <span className="ml-2 font-medium text-stone-900">{queueStats.total}</span>
            </div>
            <div className="bg-stone-50 p-2 rounded">
              <span className="text-stone-500">Retryable:</span>
              <span className="ml-2 font-medium text-amber-600">{queueStats.retryable}</span>
            </div>
            <div className="bg-stone-50 p-2 rounded">
              <span className="text-stone-500">Failed:</span>
              <span className="ml-2 font-medium text-red-600">{queueStats.failed}</span>
            </div>
            <div className="bg-stone-50 p-2 rounded">
              <span className="text-stone-500">Max Retries:</span>
              <span className="ml-2 font-medium text-red-600">{queueStats.maxRetriesReached}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2 border-t border-stone-200">
          <h4 className="text-sm font-medium text-stone-700">Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleForceSync}
              disabled={status.isSyncing}
              className="px-3 py-2 bg-stone-900 text-stone-50 rounded-lg text-sm hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Force Sync
            </button>
            <button
              onClick={refreshStats}
              className="px-3 py-2 bg-stone-100 text-stone-700 rounded-lg text-sm hover:bg-stone-200 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={handleClearQueue}
              className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
            >
              Clear Queue
            </button>
            <button
              onClick={handleRegenerateKey}
              className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200 transition-colors"
            >
              New Key
            </button>
          </div>
        </div>

        {/* Warning for max retries */}
        {queueStats.maxRetriesReached > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>Warning:</strong> {queueStats.maxRetriesReached} operation(s) have failed
              permanently and need manual intervention.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
