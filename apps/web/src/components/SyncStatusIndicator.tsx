// apps/web/src/components/SyncStatusIndicator.tsx
'use client';

import { useSync } from '@/lib/sync/SyncProvider';

/**
 * SyncStatusIndicator - Shows current sync state
 * Displays: syncing spinner, synced checkmark, offline warning, or error
 */
export function SyncStatusIndicator() {
  const { status, isInitialized } = useSync();

  if (!isInitialized) {
    return (
      <div className="flex items-center gap-2 text-stone-400 text-sm">
        <div className="w-2 h-2 rounded-full bg-stone-300" />
        <span>Initializing...</span>
      </div>
    );
  }

  if (status.isSyncing) {
    return (
      <div className="flex items-center gap-2 text-amber-600 text-sm">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>Syncing...</span>
        {status.pendingOperations > 0 && (
          <span className="text-xs text-stone-500">({status.pendingOperations} pending)</span>
        )}
      </div>
    );
  }

  if (status.syncErrors > 0) {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Sync error</span>
        <span className="text-xs text-stone-500">({status.syncErrors} errors)</span>
      </div>
    );
  }

  if (status.lastSyncTime) {
    const timeAgo = getTimeAgo(status.lastSyncTime);
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>Synced</span>
        <span className="text-xs text-stone-500">({timeAgo})</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-stone-400 text-sm">
      <div className="w-2 h-2 rounded-full bg-stone-300" />
      <span>Waiting...</span>
    </div>
  );
}

/**
 * Format time ago for display
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
