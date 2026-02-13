/**
 * Activity Logger for Real-time Collaboration
 *
 * Tracks and logs activities for notes, permissions, and collaboration events.
 */

/**
 * Activity types
 */
export enum ActivityType {
  // Note activities
  NOTE_CREATED = 'note_created',
  NOTE_EDITED = 'note_edited',
  NOTE_DELETED = 'note_deleted',
  NOTE_VIEWED = 'note_viewed',

  // Collaboration activities
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  CURSOR_MOVED = 'cursor_moved',

  // Permission activities
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_UPDATED = 'permission_updated',
  PERMISSION_REVOKED = 'permission_revoked',
  SHARE_LINK_CREATED = 'share_link_created',
  SHARE_LINK_USED = 'share_link_used',
  SHARE_LINK_REVOKED = 'share_link_revoked',

  // Version activities
  VERSION_CREATED = 'version_created',
  VERSION_RESTORED = 'version_restored',

  // Comment activities
  COMMENT_ADDED = 'comment_added',
  COMMENT_RESOLVED = 'comment_resolved',
}

/**
 * Activity interface
 */
export interface Activity {
  id: string;
  type: ActivityType;
  resourceId: string;
  resourceType: 'note' | 'folder' | 'workspace';
  resourceName?: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Activity filter options
 */
export interface ActivityFilter {
  resourceIds?: string[];
  types?: ActivityType[];
  userIds?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Activity logger configuration
 */
export interface ActivityLoggerConfig {
  /** Maximum activities to keep in memory */
  maxInMemory?: number;
  /** Persist to localStorage */
  persistLocal?: boolean;
  /** LocalStorage key */
  storageKey?: string;
  /** Callback when new activity is logged */
  onActivity?: (activity: Activity) => void;
}

const DEFAULT_CONFIG: Required<ActivityLoggerConfig> = {
  maxInMemory: 1000,
  persistLocal: true,
  storageKey: 'notechain_activity_log',
  onActivity: () => {},
};

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Activity Logger class
 */
export class ActivityLogger {
  private activities: Activity[] = [];
  private config: Required<ActivityLoggerConfig>;
  private subscribers: Set<(activity: Activity) => void> = new Set();

  constructor(config: ActivityLoggerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  /**
   * Log a new activity
   */
  log(params: {
    type: ActivityType;
    resourceId: string;
    resourceType: 'note' | 'folder' | 'workspace';
    resourceName?: string;
    userId: string;
    userDisplayName: string;
    userAvatarUrl?: string;
    metadata?: Record<string, unknown>;
  }): Activity {
    const activity: Activity = {
      id: generateId(),
      type: params.type,
      resourceId: params.resourceId,
      resourceType: params.resourceType,
      resourceName: params.resourceName,
      userId: params.userId,
      userDisplayName: params.userDisplayName,
      userAvatarUrl: params.userAvatarUrl,
      timestamp: new Date(),
      metadata: params.metadata,
    };

    // Add to beginning of array
    this.activities.unshift(activity);

    // Trim if exceeds max
    if (this.activities.length > this.config.maxInMemory) {
      this.activities = this.activities.slice(0, this.config.maxInMemory);
    }

    // Persist
    this.saveToStorage();

    // Notify
    this.config.onActivity(activity);
    this.subscribers.forEach(callback => callback(activity));

    return activity;
  }

  /**
   * Get activities with optional filtering
   */
  getActivities(filter: ActivityFilter = {}): Activity[] {
    let result = [...this.activities];

    if (filter.resourceIds && filter.resourceIds.length > 0) {
      result = result.filter(a => filter.resourceIds!.includes(a.resourceId));
    }

    if (filter.types && filter.types.length > 0) {
      result = result.filter(a => filter.types!.includes(a.type));
    }

    if (filter.userIds && filter.userIds.length > 0) {
      result = result.filter(a => filter.userIds!.includes(a.userId));
    }

    if (filter.startDate) {
      result = result.filter(a => new Date(a.timestamp) >= filter.startDate!);
    }

    if (filter.endDate) {
      result = result.filter(a => new Date(a.timestamp) <= filter.endDate!);
    }

    // Apply pagination
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? result.length;

    return result.slice(offset, offset + limit);
  }

  /**
   * Get activities for a specific resource
   */
  getResourceActivities(resourceId: string, limit = 50): Activity[] {
    return this.getActivities({
      resourceIds: [resourceId],
      limit,
    });
  }

  /**
   * Get activities for a specific user
   */
  getUserActivities(userId: string, limit = 50): Activity[] {
    return this.getActivities({
      userIds: [userId],
      limit,
    });
  }

  /**
   * Subscribe to new activities
   */
  subscribe(callback: (activity: Activity) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Clear all activities
   */
  clear(): void {
    this.activities = [];
    this.saveToStorage();
  }

  /**
   * Clear activities older than a date
   */
  clearOlderThan(date: Date): void {
    this.activities = this.activities.filter(a => new Date(a.timestamp) > date);
    this.saveToStorage();
  }

  /**
   * Load activities from localStorage
   */
  private loadFromStorage(): void {
    if (!this.config.persistLocal || typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Activity[];
        this.activities = parsed.map(a => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load activity log:', error);
    }
  }

  /**
   * Save activities to localStorage
   */
  private saveToStorage(): void {
    if (!this.config.persistLocal || typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.activities));
    } catch (error) {
      console.error('Failed to save activity log:', error);
    }
  }
}

// Singleton instance
let activityLoggerInstance: ActivityLogger | null = null;

/**
 * Get the singleton activity logger instance
 */
export function getActivityLogger(config?: ActivityLoggerConfig): ActivityLogger {
  if (!activityLoggerInstance) {
    activityLoggerInstance = new ActivityLogger(config);
  }
  return activityLoggerInstance;
}

/**
 * Log a note activity
 */
export function logNoteActivity(
  type: ActivityType,
  noteId: string,
  noteTitle: string,
  userId: string,
  userDisplayName: string,
  userAvatarUrl?: string,
  metadata?: Record<string, unknown>
): Activity {
  return getActivityLogger().log({
    type,
    resourceId: noteId,
    resourceType: 'note',
    resourceName: noteTitle,
    userId,
    userDisplayName,
    userAvatarUrl,
    metadata,
  });
}

/**
 * Log a permission activity
 */
export function logPermissionActivity(
  type: ActivityType,
  resourceId: string,
  resourceType: 'note' | 'folder' | 'workspace',
  resourceName: string,
  userId: string,
  userDisplayName: string,
  targetUserId: string,
  targetUserDisplayName: string,
  metadata?: Record<string, unknown>
): Activity {
  return getActivityLogger().log({
    type,
    resourceId,
    resourceType,
    resourceName,
    userId,
    userDisplayName,
    metadata: {
      ...metadata,
      targetUserId,
      targetUserDisplayName,
    },
  });
}

export default ActivityLogger;
