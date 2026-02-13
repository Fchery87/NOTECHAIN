'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { PermissionSelector, type PermissionLevel } from './PermissionSelector';
import { ShareLinkManager, type ShareLink } from './ShareLinkManager';

/**
 * Permission interface
 */
export interface Permission {
  id: string;
  userId: string;
  resourceId: string;
  level: PermissionLevel;
  grantedAt: Date;
  grantedBy: string;
  user?: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
  };
}

/**
 * Props for ShareDialog component
 */
export interface ShareDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Close the dialog */
  onClose: () => void;
  /** Resource ID being shared */
  resourceId: string;
  /** Resource name for display */
  resourceName: string;
  /** Resource type */
  resourceType: 'note' | 'folder' | 'workspace';
  /** Current permissions */
  permissions: Permission[];
  /** Share links */
  shareLinks: ShareLink[];
  /** Current user ID */
  currentUserId: string;
  /** Add permission */
  onAddPermission: (userId: string, level: PermissionLevel) => Promise<void>;
  /** Update permission */
  onUpdatePermission: (userId: string, level: PermissionLevel) => Promise<void>;
  /** Remove permission */
  onRemovePermission: (userId: string) => Promise<void>;
  /** Create share link */
  onCreateShareLink: (options: {
    permissionLevel: PermissionLevel;
    expiresAt?: Date;
    maxUses?: number;
  }) => Promise<ShareLink>;
  /** Revoke share link */
  onRevokeShareLink: (linkId: string) => Promise<void>;
  /** Search users */
  onSearchUsers?: (
    query: string
  ) => Promise<Array<{ id: string; displayName: string; email: string; avatarUrl?: string }>>;
}

/**
 * User search input
 */
function UserSearchInput({
  onSearch,
  onSelect,
  placeholder = 'Search by email or name...',
}: {
  onSearch: (
    query: string
  ) => Promise<Array<{ id: string; displayName: string; email: string; avatarUrl?: string }>>;
  onSelect: (user: { id: string; displayName: string; email: string }) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    Array<{ id: string; displayName: string; email: string; avatarUrl?: string }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.length >= 2) {
        setIsSearching(true);
        try {
          const users = await onSearch(query);
          setResults(users);
          setShowResults(true);
        } catch {
          // Silently handle search errors - just show empty results
          setResults([]);
          setShowResults(false);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, onSearch]);

  const handleSelect = (user: { id: string; displayName: string; email: string }) => {
    onSelect(user);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pl-10 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Search results dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map(user => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelect(user)}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-stone-50 transition-colors"
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm font-medium text-stone-600">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <div className="text-sm font-medium text-stone-900">{user.displayName}</div>
                <div className="text-xs text-stone-500">{user.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Permission item
 */
function PermissionItem({
  permission,
  currentUserId,
  onUpdate,
  onRemove,
  isUpdating,
}: {
  permission: Permission;
  currentUserId: string;
  onUpdate: (level: PermissionLevel) => Promise<void>;
  onRemove: () => Promise<void>;
  isUpdating: boolean;
}) {
  const isOwner = permission.userId === currentUserId;

  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-white border border-stone-200 rounded-lg">
      <div className="flex items-center gap-3">
        {permission.user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={permission.user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm font-medium text-stone-600">
            {permission.user?.displayName?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-stone-900">
            {permission.user?.displayName || 'Unknown User'}
            {isOwner && <span className="ml-2 text-xs text-stone-500">(you)</span>}
          </div>
          <div className="text-xs text-stone-500">{permission.user?.email}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isOwner ? (
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              permission.level === 'admin'
                ? 'bg-rose-100 text-rose-700'
                : permission.level === 'edit'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-stone-100 text-stone-700'
            }`}
          >
            {permission.level.charAt(0).toUpperCase() + permission.level.slice(1)}
          </span>
        ) : (
          <>
            <PermissionSelector
              value={permission.level}
              onChange={onUpdate}
              disabled={isUpdating}
              size="sm"
            />
            <button
              onClick={onRemove}
              disabled={isUpdating}
              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
              title="Remove access"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Visibility option
 */
type Visibility = 'private' | 'link' | 'public';

/**
 * ShareDialog component
 * Main sharing interface for notes and resources
 */
export function ShareDialog({
  isOpen,
  onClose,
  resourceId,
  resourceName,
  resourceType,
  permissions,
  shareLinks,
  currentUserId,
  onAddPermission,
  onUpdatePermission,
  onRemovePermission,
  onCreateShareLink,
  onRevokeShareLink,
  onSearchUsers,
}: ShareDialogProps) {
  const [activeTab, setActiveTab] = useState<'people' | 'links'>('people');
  const [newUserPermission, setNewUserPermission] = useState<PermissionLevel>('view');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>('private');

  // Determine visibility from permissions
  useEffect(() => {
    const hasPublicAccess = permissions.some(p => p.userId === '*');
    const hasLinkAccess = shareLinks.some(l => l.isActive);
    if (hasPublicAccess) {
      setVisibility('public');
    } else if (hasLinkAccess) {
      setVisibility('link');
    } else {
      setVisibility('private');
    }
  }, [permissions, shareLinks]);

  const handleAddUser = useCallback(
    async (user: { id: string; displayName: string; email: string }) => {
      setUpdatingUserId(user.id);
      try {
        await onAddPermission(user.id, newUserPermission);
      } finally {
        setUpdatingUserId(null);
      }
    },
    [onAddPermission, newUserPermission]
  );

  const handleUpdatePermission = useCallback(
    async (userId: string, level: PermissionLevel) => {
      setUpdatingUserId(userId);
      try {
        await onUpdatePermission(userId, level);
      } finally {
        setUpdatingUserId(null);
      }
    },
    [onUpdatePermission]
  );

  const handleRemovePermission = useCallback(
    async (userId: string) => {
      setUpdatingUserId(userId);
      try {
        await onRemovePermission(userId);
      } finally {
        setUpdatingUserId(null);
      }
    },
    [onRemovePermission]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <div>
            <h2 className="text-lg font-medium text-stone-900">Share {resourceType}</h2>
            <p className="text-sm text-stone-500 truncate">{resourceName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
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

        {/* Visibility toggle */}
        <div className="p-4 border-b border-stone-200">
          <label className="block text-sm font-medium text-stone-700 mb-2">Who can access</label>
          <div className="flex gap-2">
            {(['private', 'link', 'public'] as Visibility[]).map(v => (
              <button
                key={v}
                onClick={() => setVisibility(v)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  visibility === v
                    ? 'bg-stone-900 text-stone-50'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {v === 'private' && 'Private'}
                {v === 'link' && 'Anyone with link'}
                {v === 'public' && 'Public'}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200">
          <button
            onClick={() => setActiveTab('people')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'people'
                ? 'text-stone-900 border-b-2 border-stone-900'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            People ({permissions.length})
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'links'
                ? 'text-stone-900 border-b-2 border-stone-900'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Links ({shareLinks.filter(l => l.isActive).length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'people' ? (
            <div className="space-y-4">
              {/* Add user */}
              {onSearchUsers && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <UserSearchInput onSearch={onSearchUsers} onSelect={handleAddUser} />
                  </div>
                  <PermissionSelector
                    value={newUserPermission}
                    onChange={setNewUserPermission}
                    size="sm"
                  />
                </div>
              )}

              {/* Permissions list */}
              <div className="space-y-2">
                {permissions.map(permission => (
                  <PermissionItem
                    key={permission.id}
                    permission={permission}
                    currentUserId={currentUserId}
                    onUpdate={level => handleUpdatePermission(permission.userId, level)}
                    onRemove={() => handleRemovePermission(permission.userId)}
                    isUpdating={updatingUserId === permission.userId}
                  />
                ))}
              </div>

              {permissions.length === 0 && (
                <div className="text-center py-8 text-stone-500">
                  <p>No one has access yet</p>
                  <p className="text-sm mt-1">Add people or create a share link</p>
                </div>
              )}
            </div>
          ) : (
            <ShareLinkManager
              resourceId={resourceId}
              links={shareLinks}
              onCreateLink={onCreateShareLink}
              onRevokeLink={onRevokeShareLink}
              userId={currentUserId}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50">
          <div className="flex items-center justify-between text-sm text-stone-500">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>End-to-end encrypted</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-900 text-stone-50 font-medium rounded-lg hover:bg-stone-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShareDialog;
