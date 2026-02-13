'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  VersionManager,
  type Version,
  type DiffResult,
  getVersionManager,
} from '../lib/versions/versionManager';

/**
 * Props for VersionHistory component
 */
export interface VersionHistoryProps {
  /** Resource ID to show versions for */
  resourceId: string;
  /** Current content to compare against */
  currentContent?: string;
  /** Custom version manager instance */
  versionManager?: VersionManager;
  /** Called when a version is restored */
  onRestore?: (version: Version) => void;
  /** Called when a version is selected for preview */
  onSelect?: (version: Version) => void;
  /** Called when compare mode is toggled */
  onCompareToggle?: (enabled: boolean) => void;
  /** Show compare mode */
  enableCompare?: boolean;
  /** Maximum versions to show */
  limit?: number;
  /** Compact mode */
  compact?: boolean;
  /** User ID of current user */
  currentUserId?: string;
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Format full date and time
 */
function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Version list item component
 */
function VersionListItem({
  version,
  isSelected,
  isCompareSelected,
  onSelect,
  onToggleCompare,
  compact,
  currentUserId,
  showCompare,
}: {
  version: Version;
  isSelected: boolean;
  isCompareSelected: boolean;
  onSelect: () => void;
  onToggleCompare: () => void;
  compact?: boolean;
  currentUserId?: string;
  showCompare: boolean;
}) {
  const isCurrentUser = currentUserId === version.userId;

  return (
    <div
      onClick={onSelect}
      className={`
        group relative p-4 rounded-xl border-2 cursor-pointer
        transition-all duration-200
        ${
          isSelected
            ? 'border-amber-500 bg-amber-50/50'
            : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
        }
      `}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <div className="w-2 h-2 bg-amber-500 rounded-full" />
        </div>
      )}

      {/* Compare checkbox */}
      {showCompare && (
        <div
          onClick={e => {
            e.stopPropagation();
            onToggleCompare();
          }}
          className={`
            absolute top-3 right-3 w-5 h-5 rounded border-2 flex items-center justify-center
            transition-colors cursor-pointer
            ${
              isCompareSelected
                ? 'bg-amber-500 border-amber-500'
                : 'border-stone-300 hover:border-amber-400'
            }
          `}
        >
          {isCompareSelected && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        {/* User avatar */}
        <div
          className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
          ${isCurrentUser ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-600'}
        `}
        >
          {version.userDisplayName.charAt(0).toUpperCase()}
        </div>

        {/* User name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-900 truncate">
            {version.userDisplayName}
            {isCurrentUser && (
              <span className="ml-2 text-xs text-amber-600 font-normal">(you)</span>
            )}
          </p>
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span title={formatFullDate(version.timestamp)}>
          {formatRelativeTime(version.timestamp)}
        </span>
      </div>

      {/* Change summary */}
      {version.changeSummary && !compact && (
        <p className="text-sm text-stone-600 line-clamp-2">{version.changeSummary}</p>
      )}
    </div>
  );
}

/**
 * Diff view component
 */
function DiffView({ diff, title }: { diff: DiffResult; title?: string }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-stone-200 bg-stone-50">
          <h4 className="text-sm font-medium text-stone-900">{title}</h4>
          <p className="text-xs text-stone-500 mt-0.5">{diff.summary}</p>
        </div>
      )}

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {/* Added lines */}
        {diff.added.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Added</p>
            <div className="space-y-1">
              {diff.added.slice(0, 10).map((line, i) => (
                <div
                  key={`added-${i}`}
                  className="px-3 py-1.5 bg-green-50 border border-green-200 rounded text-sm text-green-800 font-mono"
                >
                  + {line || '(empty line)'}
                </div>
              ))}
              {diff.added.length > 10 && (
                <p className="text-xs text-stone-400 pl-3">+ {diff.added.length - 10} more lines</p>
              )}
            </div>
          </div>
        )}

        {/* Removed lines */}
        {diff.removed.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-rose-600 uppercase tracking-wide">Removed</p>
            <div className="space-y-1">
              {diff.removed.slice(0, 10).map((line, i) => (
                <div
                  key={`removed-${i}`}
                  className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded text-sm text-rose-800 font-mono line-through"
                >
                  - {line || '(empty line)'}
                </div>
              ))}
              {diff.removed.length > 10 && (
                <p className="text-xs text-stone-400 pl-3">
                  + {diff.removed.length - 10} more lines
                </p>
              )}
            </div>
          </div>
        )}

        {/* No changes */}
        {diff.added.length === 0 && diff.removed.length === 0 && (
          <div className="text-center py-6 text-stone-400">
            <svg
              className="w-10 h-10 mx-auto mb-2 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm">No changes detected</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-green-600">+{diff.charsAdded} chars</span>
          <span className="text-rose-600">-{diff.charsRemoved} chars</span>
        </div>
        <span className="text-stone-400">
          {diff.added.length + diff.removed.length} lines changed
        </span>
      </div>
    </div>
  );
}

/**
 * Version preview component
 */
function VersionPreview({
  version,
  diff,
  onRestore,
  isRestoring,
}: {
  version: Version;
  diff?: DiffResult;
  onRestore: () => void;
  isRestoring: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Version info header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-stone-900">
            Version from {formatRelativeTime(version.timestamp)}
          </h3>
          <p className="text-sm text-stone-500">
            {formatFullDate(version.timestamp)} by {version.userDisplayName}
          </p>
        </div>

        <button
          onClick={onRestore}
          disabled={isRestoring}
          className="
            px-5 py-2.5
            bg-stone-900 text-stone-50
            font-medium rounded-lg
            hover:bg-stone-800
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            flex items-center gap-2
          "
        >
          {isRestoring ? (
            <>
              <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
              <span>Restoring...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Restore this version</span>
            </>
          )}
        </button>
      </div>

      {/* Change summary */}
      {version.changeSummary && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Change: </span>
            {version.changeSummary}
          </p>
        </div>
      )}

      {/* Diff view */}
      {diff && <DiffView diff={diff} title="Changes from this version to current" />}

      {/* Content preview */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200 bg-stone-50">
          <h4 className="text-sm font-medium text-stone-900">Content Preview</h4>
        </div>
        <div className="p-4">
          <pre className="text-sm text-stone-700 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
            {version.content}
          </pre>
        </div>
      </div>
    </div>
  );
}

/**
 * VersionHistory component
 * Display and manage version history for a resource
 */
export function VersionHistory({
  resourceId,
  currentContent,
  versionManager: customVersionManager,
  onRestore,
  onSelect,
  onCompareToggle,
  enableCompare = true,
  limit = 20,
  compact = false,
  currentUserId,
}: VersionHistoryProps) {
  const versionManager = customVersionManager ?? getVersionManager();
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareVersionIds, setCompareVersionIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareDiff, setCompareDiff] = useState<DiffResult | null>(null);

  // Load versions
  const loadVersions = useCallback(() => {
    setIsLoading(true);
    const loaded = versionManager.getVersions(resourceId);
    setVersions(loaded.slice(0, limit));
    setIsLoading(false);
  }, [versionManager, resourceId, limit]);

  // Initial load
  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  // Subscribe to new versions
  useEffect(() => {
    const unsubscribe = versionManager.subscribe(version => {
      if (version.resourceId === resourceId) {
        setVersions(prev => [version, ...prev].slice(0, limit));
      }
    });

    return unsubscribe;
  }, [versionManager, resourceId, limit]);

  // Calculate diff when selection changes
  useEffect(() => {
    if (selectedVersion && currentContent) {
      const result = versionManager.compareWithCurrent(selectedVersion.id, currentContent);
      setDiff(result);
    } else {
      setDiff(null);
    }
  }, [selectedVersion, currentContent, versionManager]);

  // Calculate compare diff
  useEffect(() => {
    if (compareVersionIds.length === 2) {
      const result = versionManager.compareVersions(compareVersionIds[0], compareVersionIds[1]);
      setCompareDiff(result);
    } else {
      setCompareDiff(null);
    }
  }, [compareVersionIds, versionManager]);

  // Handle version selection
  const handleSelect = useCallback(
    (version: Version) => {
      setSelectedVersion(version);
      onSelect?.(version);
    },
    [onSelect]
  );

  // Handle restore
  const handleRestore = useCallback(async () => {
    if (!selectedVersion) return;

    setIsRestoring(true);

    try {
      const restored = versionManager.restoreVersion(selectedVersion.id);
      if (restored) {
        onRestore?.(restored);
      }
    } finally {
      setIsRestoring(false);
    }
  }, [selectedVersion, versionManager, onRestore]);

  // Handle compare toggle
  const handleCompareToggle = useCallback(() => {
    const newShowCompare = !showCompare;
    setShowCompare(newShowCompare);
    setCompareVersionIds([]);
    setCompareDiff(null);
    onCompareToggle?.(newShowCompare);
  }, [showCompare, onCompareToggle]);

  // Handle version selection for compare
  const handleToggleCompareVersion = useCallback((versionId: string) => {
    setCompareVersionIds(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-stone-900 mb-1">No version history</h3>
        <p className="text-sm text-stone-500 max-w-sm mx-auto">
          This note doesn't have any saved versions yet. Versions are created automatically or when
          you manually save.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
      {/* Versions list */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-stone-900">Version History</h3>
            <p className="text-sm text-stone-500">
              {versions.length} {versions.length === 1 ? 'version' : 'versions'} saved
            </p>
          </div>

          {enableCompare && (
            <button
              onClick={handleCompareToggle}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-lg
                transition-all duration-200
                ${
                  showCompare
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }
              `}
            >
              {showCompare ? 'Done' : 'Compare'}
            </button>
          )}
        </div>

        {/* Compare instructions */}
        {showCompare && (
          <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              Select 2 versions to compare ({compareVersionIds.length}/2 selected)
            </p>
          </div>
        )}

        {/* Compare result */}
        {showCompare && compareDiff && compareVersionIds.length === 2 && (
          <DiffView diff={compareDiff} title="Comparing selected versions" />
        )}

        {/* Version list */}
        <div className="space-y-3">
          {versions.map(version => (
            <VersionListItem
              key={version.id}
              version={version}
              isSelected={selectedVersion?.id === version.id}
              isCompareSelected={compareVersionIds.includes(version.id)}
              onSelect={() => handleSelect(version)}
              onToggleCompare={() => handleToggleCompareVersion(version.id)}
              compact={compact}
              currentUserId={currentUserId}
              showCompare={showCompare}
            />
          ))}
        </div>
      </div>

      {/* Version preview */}
      {!compact && selectedVersion && (
        <div className="lg:border-l lg:border-stone-200 lg:pl-6">
          <VersionPreview
            version={selectedVersion}
            diff={diff || undefined}
            onRestore={handleRestore}
            isRestoring={isRestoring}
          />
        </div>
      )}
    </div>
  );
}

export default VersionHistory;
