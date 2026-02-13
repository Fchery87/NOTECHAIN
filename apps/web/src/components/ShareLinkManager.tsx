'use client';

import React, { useState, useCallback } from 'react';
import { PermissionSelector, type PermissionLevel } from './PermissionSelector';

/**
 * Share link interface
 */
export interface ShareLink {
  id: string;
  resourceId: string;
  permissionLevel: PermissionLevel;
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
  maxUses?: number;
  useCount: number;
  isActive: boolean;
}

/**
 * Props for ShareLinkManager component
 */
export interface ShareLinkManagerProps {
  /** Resource ID being shared */
  resourceId: string;
  /** Existing share links */
  links: ShareLink[];
  /** Create new share link */
  onCreateLink: (options: {
    permissionLevel: PermissionLevel;
    expiresAt?: Date;
    maxUses?: number;
  }) => Promise<ShareLink>;
  /** Revoke a share link */
  onRevokeLink: (linkId: string) => Promise<void>;
  /** Current user ID */
  userId: string;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = new Date(date).getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (diff < 0) return 'Expired';
  if (hours < 1) return 'Expires soon';
  if (hours < 24) return `Expires in ${hours} hours`;
  if (days === 1) return 'Expires in 1 day';
  return `Expires in ${days} days`;
}

/**
 * Copy to clipboard button
 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded hover:bg-stone-100 transition-colors"
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <svg
          className="w-4 h-4 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className="w-4 h-4 text-stone-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}

/**
 * Create link form
 */
function CreateLinkForm({
  onCreate,
  isCreating,
}: {
  onCreate: (options: {
    permissionLevel: PermissionLevel;
    expiresAt?: Date;
    maxUses?: number;
  }) => Promise<void>;
  isCreating: boolean;
}) {
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('view');
  const [expiration, setExpiration] = useState<'never' | '1h' | '24h' | '7d' | '30d'>('7d');
  const [maxUses, setMaxUses] = useState<'unlimited' | '1' | '5' | '10' | '50'>('unlimited');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const options: { permissionLevel: PermissionLevel; expiresAt?: Date; maxUses?: number } = {
      permissionLevel,
    };

    if (expiration !== 'never') {
      const now = new Date();
      switch (expiration) {
        case '1h':
          options.expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case '24h':
          options.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case '7d':
          options.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          options.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    if (maxUses !== 'unlimited') {
      options.maxUses = parseInt(maxUses, 10);
    }

    await onCreate(options);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-stone-50 rounded-xl">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">Permission Level</label>
        <PermissionSelector value={permissionLevel} onChange={setPermissionLevel} />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">Expires After</label>
        <select
          value={expiration}
          onChange={e => setExpiration(e.target.value as typeof expiration)}
          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
        >
          <option value="never">Never</option>
          <option value="1h">1 hour</option>
          <option value="24h">24 hours</option>
          <option value="7d">7 days</option>
          <option value="30d">30 days</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">Max Uses</label>
        <select
          value={maxUses}
          onChange={e => setMaxUses(e.target.value as typeof maxUses)}
          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
        >
          <option value="unlimited">Unlimited</option>
          <option value="1">1 use</option>
          <option value="5">5 uses</option>
          <option value="10">10 uses</option>
          <option value="50">50 uses</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isCreating}
        className="w-full px-4 py-2 bg-stone-900 text-stone-50 font-medium rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreating ? 'Creating...' : 'Create Link'}
      </button>
    </form>
  );
}

/**
 * Share link item
 */
function ShareLinkItem({
  link,
  baseUrl,
  onRevoke,
  isRevoking,
}: {
  link: ShareLink;
  baseUrl: string;
  onRevoke: () => Promise<void>;
  isRevoking: boolean;
}) {
  const fullUrl = `${baseUrl}/share/${link.id}`;
  const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
  const isUsedUp = link.maxUses !== undefined && link.useCount >= link.maxUses;
  const isInactive = !link.isActive || isExpired || isUsedUp;

  return (
    <div
      className={`p-4 border rounded-xl ${isInactive ? 'bg-stone-50 border-stone-200' : 'bg-white border-stone-200'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                link.permissionLevel === 'view'
                  ? 'bg-stone-100 text-stone-700'
                  : link.permissionLevel === 'edit'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
              }`}
            >
              {link.permissionLevel.charAt(0).toUpperCase() + link.permissionLevel.slice(1)}
            </span>
            {isInactive && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-700">
                {isExpired ? 'Expired' : isUsedUp ? 'Used up' : 'Inactive'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <code className="flex-1 px-2 py-1 bg-stone-100 rounded text-sm text-stone-600 truncate">
              {fullUrl}
            </code>
            <CopyButton text={fullUrl} />
          </div>

          <div className="flex items-center gap-4 text-xs text-stone-500">
            <span>Created {formatDate(link.createdAt)}</span>
            {link.expiresAt && <span>{formatRelativeTime(link.expiresAt)}</span>}
            {link.maxUses && (
              <span>
                {link.useCount}/{link.maxUses} uses
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onRevoke}
          disabled={isRevoking || isInactive}
          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Revoke link"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * ShareLinkManager component
 * Manage shareable links for a resource
 */
export function ShareLinkManager({
  resourceId,
  links,
  onCreateLink,
  onRevokeLink,
  userId,
}: ShareLinkManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCreate = useCallback(
    async (options: { permissionLevel: PermissionLevel; expiresAt?: Date; maxUses?: number }) => {
      setIsCreating(true);
      try {
        await onCreateLink(options);
        setShowCreateForm(false);
      } finally {
        setIsCreating(false);
      }
    },
    [onCreateLink]
  );

  const handleRevoke = useCallback(
    async (linkId: string) => {
      setRevokingId(linkId);
      try {
        await onRevokeLink(linkId);
      } finally {
        setRevokingId(null);
      }
    },
    [onRevokeLink]
  );

  const activeLinks = links.filter(link => link.isActive);
  const inactiveLinks = links.filter(link => !link.isActive);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-stone-900">Share Links</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-3 py-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
        >
          {showCreateForm ? 'Cancel' : 'Create Link'}
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && <CreateLinkForm onCreate={handleCreate} isCreating={isCreating} />}

      {/* Active links */}
      {activeLinks.length > 0 && (
        <div className="space-y-2">
          {activeLinks.map(link => (
            <ShareLinkItem
              key={link.id}
              link={link}
              baseUrl={baseUrl}
              onRevoke={() => handleRevoke(link.id)}
              isRevoking={revokingId === link.id}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {links.length === 0 && !showCreateForm && (
        <div className="text-center py-8 text-stone-500">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-stone-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <p>No share links yet</p>
          <p className="text-sm mt-1">Create a link to share this note with others</p>
        </div>
      )}

      {/* Inactive links */}
      {inactiveLinks.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-stone-500 hover:text-stone-700">
            Show inactive links ({inactiveLinks.length})
          </summary>
          <div className="mt-2 space-y-2">
            {inactiveLinks.map(link => (
              <ShareLinkItem
                key={link.id}
                link={link}
                baseUrl={baseUrl}
                onRevoke={() => handleRevoke(link.id)}
                isRevoking={revokingId === link.id}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default ShareLinkManager;
