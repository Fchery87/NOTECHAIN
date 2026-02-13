'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityLogger,
  ActivityType,
  type Activity,
  type ActivityFilter,
  getActivityLogger,
} from '../lib/activity/activityLog';

/**
 * Props for ActivityFeed component
 */
export interface ActivityFeedProps {
  /** Resource ID to show activities for */
  resourceId?: string;
  /** User ID to show activities for */
  userId?: string;
  /** Filter by activity types */
  types?: ActivityType[];
  /** Maximum activities to show */
  limit?: number;
  /** Show real-time updates */
  realtime?: boolean;
  /** Custom activity logger instance */
  logger?: ActivityLogger;
  /** Compact mode */
  compact?: boolean;
  /** Show resource name */
  showResourceName?: boolean;
  /** Activity click handler */
  onActivityClick?: (activity: Activity) => void;
}

/**
 * Activity type icons
 */
const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  [ActivityType.NOTE_CREATED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  [ActivityType.NOTE_EDITED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  ),
  [ActivityType.NOTE_DELETED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  ),
  [ActivityType.NOTE_VIEWED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  [ActivityType.USER_JOINED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
      />
    </svg>
  ),
  [ActivityType.USER_LEFT]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
      />
    </svg>
  ),
  [ActivityType.CURSOR_MOVED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
      />
    </svg>
  ),
  [ActivityType.PERMISSION_GRANTED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  ),
  [ActivityType.PERMISSION_UPDATED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  ),
  [ActivityType.PERMISSION_REVOKED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  ),
  [ActivityType.SHARE_LINK_CREATED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  ),
  [ActivityType.SHARE_LINK_USED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"
      />
    </svg>
  ),
  [ActivityType.SHARE_LINK_REVOKED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  ),
  [ActivityType.VERSION_CREATED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
      />
    </svg>
  ),
  [ActivityType.VERSION_RESTORED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  ),
  [ActivityType.COMMENT_ADDED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
      />
    </svg>
  ),
  [ActivityType.COMMENT_RESOLVED]: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

/**
 * Activity type colors
 */
const ACTIVITY_COLORS: Record<ActivityType, string> = {
  [ActivityType.NOTE_CREATED]: 'text-green-600 bg-green-100',
  [ActivityType.NOTE_EDITED]: 'text-amber-600 bg-amber-100',
  [ActivityType.NOTE_DELETED]: 'text-rose-600 bg-rose-100',
  [ActivityType.NOTE_VIEWED]: 'text-stone-600 bg-stone-100',
  [ActivityType.USER_JOINED]: 'text-blue-600 bg-blue-100',
  [ActivityType.USER_LEFT]: 'text-stone-600 bg-stone-100',
  [ActivityType.CURSOR_MOVED]: 'text-stone-400 bg-stone-100',
  [ActivityType.PERMISSION_GRANTED]: 'text-violet-600 bg-violet-100',
  [ActivityType.PERMISSION_UPDATED]: 'text-amber-600 bg-amber-100',
  [ActivityType.PERMISSION_REVOKED]: 'text-rose-600 bg-rose-100',
  [ActivityType.SHARE_LINK_CREATED]: 'text-blue-600 bg-blue-100',
  [ActivityType.SHARE_LINK_USED]: 'text-green-600 bg-green-100',
  [ActivityType.SHARE_LINK_REVOKED]: 'text-rose-600 bg-rose-100',
  [ActivityType.VERSION_CREATED]: 'text-cyan-600 bg-cyan-100',
  [ActivityType.VERSION_RESTORED]: 'text-amber-600 bg-amber-100',
  [ActivityType.COMMENT_ADDED]: 'text-blue-600 bg-blue-100',
  [ActivityType.COMMENT_RESOLVED]: 'text-green-600 bg-green-100',
};

/**
 * Activity type labels
 */
const ACTIVITY_LABELS: Record<ActivityType, string> = {
  [ActivityType.NOTE_CREATED]: 'created',
  [ActivityType.NOTE_EDITED]: 'edited',
  [ActivityType.NOTE_DELETED]: 'deleted',
  [ActivityType.NOTE_VIEWED]: 'viewed',
  [ActivityType.USER_JOINED]: 'joined',
  [ActivityType.USER_LEFT]: 'left',
  [ActivityType.CURSOR_MOVED]: 'moved cursor',
  [ActivityType.PERMISSION_GRANTED]: 'granted access to',
  [ActivityType.PERMISSION_UPDATED]: 'updated access for',
  [ActivityType.PERMISSION_REVOKED]: 'revoked access from',
  [ActivityType.SHARE_LINK_CREATED]: 'created share link for',
  [ActivityType.SHARE_LINK_USED]: 'used share link for',
  [ActivityType.SHARE_LINK_REVOKED]: 'revoked share link for',
  [ActivityType.VERSION_CREATED]: 'saved version of',
  [ActivityType.VERSION_RESTORED]: 'restored version of',
  [ActivityType.COMMENT_ADDED]: 'commented on',
  [ActivityType.COMMENT_RESOLVED]: 'resolved comment on',
};

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
 * Activity item component
 */
function ActivityItem({
  activity,
  compact,
  showResourceName,
  onClick,
}: {
  activity: Activity;
  compact?: boolean;
  showResourceName?: boolean;
  onClick?: () => void;
}) {
  const icon = ACTIVITY_ICONS[activity.type];
  const color = ACTIVITY_COLORS[activity.type];
  const label = ACTIVITY_LABELS[activity.type];

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
        onClick ? 'cursor-pointer hover:bg-stone-50' : ''
      }`}
    >
      {/* Icon */}
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {activity.userAvatarUrl ? (
            <img src={activity.userAvatarUrl} alt="" className="w-5 h-5 rounded-full" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600">
              {activity.userDisplayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-stone-900 truncate">
            {activity.userDisplayName}
          </span>
        </div>

        <p className="text-sm text-stone-600 mt-1">
          <span className="font-medium">{label}</span>
          {showResourceName && activity.resourceName && (
            <span className="text-stone-900"> {activity.resourceName}</span>
          )}
        </p>

        {!compact && activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <div className="mt-1 text-xs text-stone-400">
            {activity.metadata.targetUserDisplayName &&
              typeof activity.metadata.targetUserDisplayName === 'string' && (
                <span>to {activity.metadata.targetUserDisplayName}</span>
              )}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-xs text-stone-400 whitespace-nowrap">
        {formatRelativeTime(activity.timestamp)}
      </span>
    </div>
  );
}

/**
 * ActivityFeed component
 * Display a timeline of activities
 */
export function ActivityFeed({
  resourceId,
  userId,
  types,
  limit = 20,
  realtime = true,
  logger,
  compact = false,
  showResourceName = false,
  onActivityClick,
}: ActivityFeedProps) {
  const activityLogger = logger ?? getActivityLogger();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load activities
  const loadActivities = useCallback(() => {
    setIsLoading(true);

    const filter: ActivityFilter = { limit };

    if (resourceId) {
      filter.resourceIds = [resourceId];
    }

    if (userId) {
      filter.userIds = [userId];
    }

    if (types && types.length > 0) {
      filter.types = types;
    }

    const loaded = activityLogger.getActivities(filter);
    setActivities(loaded);
    setIsLoading(false);
  }, [activityLogger, resourceId, userId, types, limit]);

  // Initial load
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Subscribe to new activities
  useEffect(() => {
    if (!realtime) return;

    const unsubscribe = activityLogger.subscribe(activity => {
      // Check if activity matches filters
      if (resourceId && activity.resourceId !== resourceId) return;
      if (userId && activity.userId !== userId) return;
      if (types && types.length > 0 && !types.includes(activity.type)) return;

      setActivities(prev => [activity, ...prev].slice(0, limit));
    });

    return unsubscribe;
  }, [activityLogger, resourceId, userId, types, limit, realtime]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map(activity => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          compact={compact}
          showResourceName={showResourceName}
          onClick={onActivityClick ? () => onActivityClick(activity) : undefined}
        />
      ))}
    </div>
  );
}

export default ActivityFeed;
