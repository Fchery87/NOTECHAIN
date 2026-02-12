/**
 * Permission system types for NoteChain
 * Defines access levels and permission structures
 */

/** Permission levels from least to most access */
export enum PermissionLevel {
  NONE = 'none',
  VIEW = 'view',
  COMMENT = 'comment',
  EDIT = 'edit',
  ADMIN = 'admin',
}

/** Types of resources that can have permissions */
export enum ResourceType {
  NOTE = 'note',
  FOLDER = 'folder',
  WORKSPACE = 'workspace',
}

/** Permission record for a user-resource pair */
export interface Permission {
  id: string;
  userId: string;
  resourceId: string;
  resourceType: ResourceType;
  level: PermissionLevel;
  grantedAt: Date;
  grantedBy: string;
}

/** Share link for temporary access */
export interface ShareLink {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  permissionLevel: PermissionLevel;
  createdAt: Date;
  expiresAt?: Date;
  maxUses?: number;
  currentUses: number;
}

/** Result of checking permissions */
export interface PermissionCheckResult {
  valid: boolean;
  hasPermission: boolean;
  level: PermissionLevel;
  grantedAt?: Date;
  grantedBy?: string;
  reason?: string;
}

/** Options for creating a share link */
export interface ShareLinkOptions {
  expiresAt?: Date;
  maxUses?: number;
}

/** Permission hierarchy for inheritance checks */
export const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  [PermissionLevel.NONE]: 0,
  [PermissionLevel.VIEW]: 1,
  [PermissionLevel.COMMENT]: 2,
  [PermissionLevel.EDIT]: 3,
  [PermissionLevel.ADMIN]: 4,
};

/** Check if a permission level meets or exceeds a required level */
export function hasRequiredLevel(
  userLevel: PermissionLevel,
  requiredLevel: PermissionLevel
): boolean {
  return PERMISSION_HIERARCHY[userLevel] >= PERMISSION_HIERARCHY[requiredLevel];
}
