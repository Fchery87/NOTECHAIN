/**
 * Permission Manager for NoteChain
 * Manages access control with 5 permission levels
 */

import {
  Permission,
  PermissionLevel,
  ResourceType,
  ShareLink,
  ShareLinkOptions,
  PermissionCheckResult,
} from './types';

/** Generate a unique ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Manages permissions for users accessing resources
 */
export class PermissionManager {
  private permissions: Map<string, Permission> = new Map();
  private shareLinks: Map<string, ShareLink> = new Map();

  /**
   * Create a unique key for a user-resource pair
   */
  private createPermissionKey(userId: string, resourceId: string): string {
    return `${userId}:${resourceId}`;
  }

  /**
   * Grant permission to a user for a resource
   */
  grantPermission(
    userId: string,
    resourceId: string,
    resourceType: ResourceType,
    level: PermissionLevel,
    grantedBy: string
  ): Permission {
    const key = this.createPermissionKey(userId, resourceId);

    const permission: Permission = {
      id: generateId(),
      userId,
      resourceId,
      resourceType,
      level,
      grantedAt: new Date(),
      grantedBy,
    };

    this.permissions.set(key, permission);
    return permission;
  }

  /**
   * Revoke permission from a user for a resource
   */
  revokePermission(userId: string, resourceId: string): void {
    const key = this.createPermissionKey(userId, resourceId);
    this.permissions.delete(key);
  }

  /**
   * Update permission level for a user-resource pair
   */
  updatePermission(userId: string, resourceId: string, newLevel: PermissionLevel): Permission {
    const key = this.createPermissionKey(userId, resourceId);
    const existing = this.permissions.get(key);

    if (!existing) {
      throw new Error('Permission not found');
    }

    const updated: Permission = {
      ...existing,
      level: newLevel,
    };

    this.permissions.set(key, updated);
    return updated;
  }

  /**
   * Check permission level for a user on a resource
   * Supports inheritance from parent resources (e.g., folders)
   */
  checkPermission(userId: string, resourceId: string, parentResourceId?: string): PermissionLevel {
    // Check direct permission first
    const key = this.createPermissionKey(userId, resourceId);
    const directPermission = this.permissions.get(key);

    if (directPermission) {
      return directPermission.level;
    }

    // Check inherited permission from parent (e.g., folder)
    if (parentResourceId) {
      const parentKey = this.createPermissionKey(userId, parentResourceId);
      const parentPermission = this.permissions.get(parentKey);

      if (parentPermission) {
        return parentPermission.level;
      }
    }

    return PermissionLevel.NONE;
  }

  /**
   * Get all permissions for a specific resource
   */
  getResourcePermissions(resourceId: string): Permission[] {
    const results: Permission[] = [];

    for (const permission of this.permissions.values()) {
      if (permission.resourceId === resourceId) {
        results.push(permission);
      }
    }

    return results;
  }

  /**
   * Get all permissions for a specific user
   */
  getUserPermissions(userId: string): Permission[] {
    const results: Permission[] = [];

    for (const permission of this.permissions.values()) {
      if (permission.userId === userId) {
        results.push(permission);
      }
    }

    return results;
  }

  /**
   * Create a share link for temporary access
   */
  createShareLink(
    resourceId: string,
    resourceType: ResourceType,
    level: PermissionLevel,
    options?: ShareLinkOptions
  ): ShareLink {
    const link: ShareLink = {
      id: generateId(),
      resourceId,
      resourceType,
      permissionLevel: level,
      createdAt: new Date(),
      currentUses: 0,
      expiresAt: options?.expiresAt,
      maxUses: options?.maxUses,
    };

    this.shareLinks.set(link.id, link);
    return link;
  }

  /**
   * Validate a share link
   */
  validateShareLink(linkId: string): PermissionCheckResult & { permission?: PermissionLevel } {
    const link = this.shareLinks.get(linkId);

    if (!link) {
      return {
        valid: false,
        hasPermission: false,
        level: PermissionLevel.NONE,
        reason: 'Link not found',
      };
    }

    // Check expiration
    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      return {
        valid: false,
        hasPermission: false,
        level: PermissionLevel.NONE,
        reason: 'Link has expired',
      };
    }

    // Check max uses
    if (link.maxUses !== undefined && link.currentUses >= link.maxUses) {
      return {
        valid: false,
        hasPermission: false,
        level: PermissionLevel.NONE,
        reason: 'Maximum uses exceeded',
      };
    }

    return {
      valid: true,
      hasPermission: true,
      level: link.permissionLevel,
      permission: link.permissionLevel,
    };
  }

  /**
   * Use a share link (increments usage count)
   */
  useShareLink(linkId: string): boolean {
    const link = this.shareLinks.get(linkId);

    if (!link) {
      return false;
    }

    // Check if link is still valid
    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      return false;
    }

    if (link.maxUses !== undefined && link.currentUses >= link.maxUses) {
      return false;
    }

    link.currentUses++;
    return true;
  }

  /**
   * Revoke a share link
   */
  revokeShareLink(linkId: string): void {
    this.shareLinks.delete(linkId);
  }
}
