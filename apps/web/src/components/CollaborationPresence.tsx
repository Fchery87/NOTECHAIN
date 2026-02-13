'use client';

import React from 'react';
import type { UserPresence } from '../hooks/useCollaboration';

/**
 * Props for CollaborationPresence component
 */
export interface CollaborationPresenceProps {
  /** Users currently connected */
  users: UserPresence[];
  /** Current user's presence */
  localUser: UserPresence;
  /** Maximum avatars to show before "+N" */
  maxVisible?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show connection status indicator */
  showStatus?: boolean;
  /** Whether connected to server */
  isConnected?: boolean;
}

/**
 * User avatar component
 */
function UserAvatar({
  user,
  size = 'md',
  showName = false,
}: {
  user: UserPresence;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-amber-500',
    offline: 'bg-stone-400',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white`}
            title={user.displayName}
          />
        ) : (
          <div
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-medium text-white ring-2 ring-white`}
            style={{ backgroundColor: user.color }}
            title={user.displayName}
          >
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        {/* Status indicator */}
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${statusColors[user.status]}`}
        />
      </div>
      {showName && (
        <span className="text-sm text-stone-700 font-medium truncate max-w-[100px]">
          {user.displayName}
        </span>
      )}
    </div>
  );
}

/**
 * Connection status indicator
 */
function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-stone-100">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-stone-400'
        }`}
      />
      <span className="text-xs font-medium text-stone-600">
        {isConnected ? 'Connected' : 'Connecting...'}
      </span>
    </div>
  );
}

/**
 * CollaborationPresence component
 * Shows active users in the document with avatars and status
 */
export function CollaborationPresence({
  users,
  localUser,
  maxVisible = 4,
  size = 'md',
  showStatus = true,
  isConnected = true,
}: CollaborationPresenceProps) {
  // Filter out offline users and local user from visible list
  const remoteUsers = users.filter(u => u.status !== 'offline' && u.userId !== localUser.userId);
  const visibleUsers = remoteUsers.slice(0, maxVisible);
  const remainingCount = remoteUsers.length - maxVisible;

  return (
    <div className="flex items-center gap-3">
      {/* Connection status */}
      {showStatus && <ConnectionStatus isConnected={isConnected} />}

      {/* User avatars */}
      <div className="flex items-center">
        {/* Local user first */}
        <div className="relative z-10">
          <UserAvatar user={localUser} size={size} />
        </div>

        {/* Remote users */}
        {visibleUsers.map((user, index) => (
          <div key={user.userId} className="relative -ml-2" style={{ zIndex: maxVisible - index }}>
            <UserAvatar user={user} size={size} />
          </div>
        ))}

        {/* Remaining count */}
        {remainingCount > 0 && (
          <div
            className={`relative -ml-2 ${
              size === 'sm'
                ? 'w-6 h-6 text-xs'
                : size === 'md'
                  ? 'w-8 h-8 text-sm'
                  : 'w-10 h-10 text-base'
            } rounded-full flex items-center justify-center font-medium bg-stone-200 text-stone-600 ring-2 ring-white`}
          >
            +{remainingCount}
          </div>
        )}
      </div>

      {/* User names tooltip */}
      {remoteUsers.length > 0 && (
        <div className="hidden md:flex items-center gap-1 text-xs text-stone-500">
          <span>
            {remoteUsers.length === 1
              ? `${remoteUsers[0].displayName} is editing`
              : `${remoteUsers.length} others editing`}
          </span>
        </div>
      )}
    </div>
  );
}

export default CollaborationPresence;
