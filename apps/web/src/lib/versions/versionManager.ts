/**
 * Version Manager for NoteChain
 *
 * Manages version history for notes, allowing users to save, restore,
 * and compare previous versions of their content.
 */

/**
 * Version interface representing a saved version
 */
export interface Version {
  id: string;
  resourceId: string;
  content: string;
  timestamp: Date;
  userId: string;
  userDisplayName: string;
  changeSummary?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Diff result interface for version comparison
 */
export interface DiffResult {
  /** Lines added */
  added: string[];
  /** Lines removed */
  removed: string[];
  /** Lines unchanged */
  unchanged: string[];
  /** Number of characters added */
  charsAdded: number;
  /** Number of characters removed */
  charsRemoved: number;
  /** Summary of changes */
  summary: string;
}

/**
 * Version filter options
 */
export interface VersionFilter {
  /** Filter by resource IDs */
  resourceIds?: string[];
  /** Filter by user IDs */
  userIds?: string[];
  /** Start date for versions */
  startDate?: Date;
  /** End date for versions */
  endDate?: Date;
  /** Maximum number of versions to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Version manager configuration
 */
export interface VersionManagerConfig {
  /** Maximum versions to keep per resource */
  maxVersionsPerResource?: number;
  /** Maximum versions in memory total */
  maxInMemory?: number;
  /** Persist to localStorage */
  persistLocal?: boolean;
  /** LocalStorage key prefix */
  storageKey?: string;
  /** Auto-save interval in milliseconds (0 to disable) */
  autoSaveInterval?: number;
  /** Callback when a version is saved */
  onVersionSaved?: (version: Version) => void;
  /** Callback when a version is restored */
  onVersionRestored?: (version: Version) => void;
  /** Callback when a version is deleted */
  onVersionDeleted?: (versionId: string) => void;
}

const DEFAULT_CONFIG: Required<VersionManagerConfig> = {
  maxVersionsPerResource: 50,
  maxInMemory: 1000,
  persistLocal: true,
  storageKey: 'notechain_versions',
  autoSaveInterval: 0,
  onVersionSaved: () => {},
  onVersionRestored: () => {},
  onVersionDeleted: () => {},
};

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate change summary between two contents
 */
function generateChangeSummary(oldContent: string, newContent: string): string {
  const oldLength = oldContent.length;
  const newLength = newContent.length;
  const diff = newLength - oldLength;

  if (diff === 0) {
    return 'Minor edits';
  } else if (diff > 0) {
    return `Added ${diff} characters`;
  } else {
    return `Removed ${Math.abs(diff)} characters`;
  }
}

/**
 * Compute diff between two strings
 */
function computeDiff(oldContent: string, newContent: string): DiffResult {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];

  // Simple diff algorithm - track which lines exist in each version
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  // Find added and unchanged
  newLines.forEach(line => {
    if (!oldSet.has(line)) {
      added.push(line);
    } else {
      unchanged.push(line);
    }
  });

  // Find removed
  oldLines.forEach(line => {
    if (!newSet.has(line)) {
      removed.push(line);
    }
  });

  const charsAdded =
    newContent.length > oldContent.length ? newContent.length - oldContent.length : 0;
  const charsRemoved =
    oldContent.length > newContent.length ? oldContent.length - newContent.length : 0;

  let summary: string;
  if (added.length === 0 && removed.length === 0) {
    summary = 'No changes';
  } else if (removed.length === 0) {
    summary = `Added ${added.length} lines`;
  } else if (added.length === 0) {
    summary = `Removed ${removed.length} lines`;
  } else {
    summary = `Changed ${added.length + removed.length} lines`;
  }

  return {
    added,
    removed,
    unchanged,
    charsAdded,
    charsRemoved,
    summary,
  };
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
 * Version Manager class
 */
export class VersionManager {
  private versions: Map<string, Version> = new Map();
  private resourceVersions: Map<string, string[]> = new Map();
  private config: Required<VersionManagerConfig>;
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private pendingVersions: Map<string, { content: string; timestamp: number }> = new Map();
  private subscribers: Set<(version: Version) => void> = new Set();

  constructor(config: VersionManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
    this.startAutoSaveTimer();
  }

  /**
   * Save a new version
   */
  saveVersion(
    resourceId: string,
    content: string,
    userId: string,
    userDisplayName: string,
    changeSummary?: string
  ): Version {
    // Get previous version to generate change summary if not provided
    let summary = changeSummary;
    if (!summary) {
      const previousVersion = this.getLatestVersion(resourceId);
      if (previousVersion) {
        summary = generateChangeSummary(previousVersion.content, content);
      } else {
        summary = 'Initial version';
      }
    }

    const version: Version = {
      id: generateId(),
      resourceId,
      content,
      timestamp: new Date(),
      userId,
      userDisplayName,
      changeSummary: summary,
    };

    // Store version
    this.versions.set(version.id, version);

    // Update resource index
    const resourceVersionIds = this.resourceVersions.get(resourceId) || [];
    resourceVersionIds.unshift(version.id);

    // Trim to max versions per resource
    if (resourceVersionIds.length > this.config.maxVersionsPerResource) {
      const removedIds = resourceVersionIds.splice(this.config.maxVersionsPerResource);
      removedIds.forEach(id => this.versions.delete(id));
    }

    this.resourceVersions.set(resourceId, resourceVersionIds);

    // Trim total memory if needed
    this.trimToMaxMemory();

    // Persist
    this.saveToStorage();

    // Notify
    this.config.onVersionSaved(version);
    this.subscribers.forEach(callback => callback(version));

    return version;
  }

  /**
   * Schedule an auto-save version
   */
  scheduleAutoSave(
    resourceId: string,
    content: string,
    _userId: string,
    _userDisplayName: string
  ): void {
    this.pendingVersions.set(resourceId, {
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * Get all versions for a resource (newest first)
   */
  getVersions(resourceId: string): Version[] {
    const versionIds = this.resourceVersions.get(resourceId) || [];
    return versionIds.map(id => this.versions.get(id)).filter((v): v is Version => v !== undefined);
  }

  /**
   * Get a specific version by ID
   */
  getVersion(versionId: string): Version | null {
    return this.versions.get(versionId) || null;
  }

  /**
   * Get the latest version for a resource
   */
  getLatestVersion(resourceId: string): Version | null {
    const versionIds = this.resourceVersions.get(resourceId);
    if (!versionIds || versionIds.length === 0) {
      return null;
    }
    return this.versions.get(versionIds[0]) || null;
  }

  /**
   * Restore a version by ID (returns the version to restore to)
   */
  restoreVersion(versionId: string): Version | null {
    const version = this.versions.get(versionId);
    if (!version) {
      return null;
    }

    this.config.onVersionRestored(version);

    return version;
  }

  /**
   * Delete a version by ID
   */
  deleteVersion(versionId: string): boolean {
    const version = this.versions.get(versionId);
    if (!version) {
      return false;
    }

    // Remove from versions map
    this.versions.delete(versionId);

    // Remove from resource index
    const resourceVersionIds = this.resourceVersions.get(version.resourceId) || [];
    const index = resourceVersionIds.indexOf(versionId);
    if (index > -1) {
      resourceVersionIds.splice(index, 1);
      if (resourceVersionIds.length === 0) {
        this.resourceVersions.delete(version.resourceId);
      } else {
        this.resourceVersions.set(version.resourceId, resourceVersionIds);
      }
    }

    // Persist
    this.saveToStorage();

    // Notify
    this.config.onVersionDeleted(versionId);

    return true;
  }

  /**
   * Delete all versions for a resource
   */
  deleteResourceVersions(resourceId: string): boolean {
    const versionIds = this.resourceVersions.get(resourceId);
    if (!versionIds) {
      return false;
    }

    // Delete all versions for this resource
    versionIds.forEach(id => {
      this.versions.delete(id);
      this.config.onVersionDeleted(id);
    });

    // Remove resource index
    this.resourceVersions.delete(resourceId);

    // Persist
    this.saveToStorage();

    return true;
  }

  /**
   * Compare two versions
   */
  compareVersions(versionId1: string, versionId2: string): DiffResult | null {
    const version1 = this.versions.get(versionId1);
    const version2 = this.versions.get(versionId2);

    if (!version1 || !version2) {
      return null;
    }

    return computeDiff(version1.content, version2.content);
  }

  /**
   * Compare a version with the current content
   */
  compareWithCurrent(versionId: string, currentContent: string): DiffResult | null {
    const version = this.versions.get(versionId);
    if (!version) {
      return null;
    }

    return computeDiff(version.content, currentContent);
  }

  /**
   * Get versions with filtering
   */
  getFilteredVersions(filter: VersionFilter = {}): Version[] {
    let result = Array.from(this.versions.values());

    if (filter.resourceIds && filter.resourceIds.length > 0) {
      result = result.filter(v => filter.resourceIds!.includes(v.resourceId));
    }

    if (filter.userIds && filter.userIds.length > 0) {
      result = result.filter(v => filter.userIds!.includes(v.userId));
    }

    if (filter.startDate) {
      result = result.filter(v => new Date(v.timestamp) >= filter.startDate!);
    }

    if (filter.endDate) {
      result = result.filter(v => new Date(v.timestamp) <= filter.endDate!);
    }

    // Sort by timestamp (newest first)
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? result.length;

    return result.slice(offset, offset + limit);
  }

  /**
   * Subscribe to new version events
   */
  subscribe(callback: (version: Version) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Clear all versions
   */
  clear(): void {
    this.versions.clear();
    this.resourceVersions.clear();
    this.pendingVersions.clear();
    this.autoSaveTimers.forEach(timer => clearTimeout(timer));
    this.autoSaveTimers.clear();
    this.saveToStorage();
  }

  /**
   * Clear versions older than a date
   */
  clearOlderThan(date: Date): void {
    const cutoff = date.getTime();

    for (const [id, version] of this.versions.entries()) {
      if (new Date(version.timestamp).getTime() < cutoff) {
        this.versions.delete(id);

        // Update resource index
        const resourceVersionIds = this.resourceVersions.get(version.resourceId) || [];
        const index = resourceVersionIds.indexOf(id);
        if (index > -1) {
          resourceVersionIds.splice(index, 1);
          if (resourceVersionIds.length === 0) {
            this.resourceVersions.delete(version.resourceId);
          } else {
            this.resourceVersions.set(version.resourceId, resourceVersionIds);
          }
        }
      }
    }

    this.saveToStorage();
  }

  /**
   * Get version count for a resource
   */
  getVersionCount(resourceId: string): number {
    return this.resourceVersions.get(resourceId)?.length || 0;
  }

  /**
   * Get total version count
   */
  getTotalVersionCount(): number {
    return this.versions.size;
  }

  /**
   * Format version timestamp
   */
  formatVersionTime(version: Version): string {
    return formatRelativeTime(version.timestamp);
  }

  /**
   * Start auto-save timer
   */
  private startAutoSaveTimer(): void {
    if (this.config.autoSaveInterval <= 0) {
      return;
    }

    // Check for pending versions every interval
    setInterval(() => {
      const now = Date.now();
      const threshold = this.config.autoSaveInterval;

      for (const [resourceId, pending] of this.pendingVersions.entries()) {
        if (now - pending.timestamp >= threshold) {
          // Get the user info - this is a simplification
          // In a real app, you'd track user info with the pending version
          const latestVersion = this.getLatestVersion(resourceId);
          const userId = latestVersion?.userId || 'unknown';
          const userDisplayName = latestVersion?.userDisplayName || 'Unknown';

          this.saveVersion(resourceId, pending.content, userId, userDisplayName, 'Auto-saved');

          this.pendingVersions.delete(resourceId);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Trim versions to max memory limit
   */
  private trimToMaxMemory(): void {
    if (this.versions.size <= this.config.maxInMemory) {
      return;
    }

    // Get all versions sorted by timestamp (oldest first)
    const allVersions = Array.from(this.versions.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const toRemove = allVersions.slice(0, this.versions.size - this.config.maxInMemory);

    toRemove.forEach(version => {
      this.versions.delete(version.id);

      // Update resource index
      const resourceVersionIds = this.resourceVersions.get(version.resourceId) || [];
      const index = resourceVersionIds.indexOf(version.id);
      if (index > -1) {
        resourceVersionIds.splice(index, 1);
        if (resourceVersionIds.length === 0) {
          this.resourceVersions.delete(version.resourceId);
        } else {
          this.resourceVersions.set(version.resourceId, resourceVersionIds);
        }
      }
    });
  }

  /**
   * Load versions from localStorage
   */
  private loadFromStorage(): void {
    if (!this.config.persistLocal || typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const data = JSON.parse(stored) as {
          versions: Version[];
          resourceVersions: Record<string, string[]>;
        };

        // Restore versions
        data.versions.forEach(v => {
          this.versions.set(v.id, {
            ...v,
            timestamp: new Date(v.timestamp),
          });
        });

        // Restore resource index
        Object.entries(data.resourceVersions).forEach(([resourceId, versionIds]) => {
          this.resourceVersions.set(resourceId, versionIds);
        });
      }
    } catch (error) {
      console.error('Failed to load versions from storage:', error);
    }
  }

  /**
   * Save versions to localStorage
   */
  private saveToStorage(): void {
    if (!this.config.persistLocal || typeof window === 'undefined') {
      return;
    }

    try {
      const data = {
        versions: Array.from(this.versions.values()),
        resourceVersions: Object.fromEntries(this.resourceVersions),
      };
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save versions to storage:', error);
    }
  }
}

// Singleton instance
let versionManagerInstance: VersionManager | null = null;

/**
 * Get the singleton version manager instance
 */
export function getVersionManager(config?: VersionManagerConfig): VersionManager {
  if (!versionManagerInstance) {
    versionManagerInstance = new VersionManager(config);
  }
  return versionManagerInstance;
}

/**
 * Save a version for a note
 */
export function saveNoteVersion(
  noteId: string,
  content: string,
  userId: string,
  userDisplayName: string,
  changeSummary?: string
): Version {
  return getVersionManager().saveVersion(noteId, content, userId, userDisplayName, changeSummary);
}

/**
 * Get versions for a note
 */
export function getNoteVersions(noteId: string): Version[] {
  return getVersionManager().getVersions(noteId);
}

/**
 * Restore a note to a specific version
 */
export function restoreNoteVersion(versionId: string): Version | null {
  return getVersionManager().restoreVersion(versionId);
}

export default VersionManager;
