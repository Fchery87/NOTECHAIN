import { describe, test, expect, beforeEach } from 'bun:test';
import { PermissionManager } from '../PermissionManager';
import { PermissionLevel, ResourceType } from '../types';

describe('PermissionManager', () => {
  let manager: PermissionManager;
  const testUserId = 'user-123';
  const testResourceId = 'resource-456';
  const testGrantorId = 'grantor-789';

  beforeEach(() => {
    manager = new PermissionManager();
  });

  describe('initialization', () => {
    test('should initialize with empty permissions', () => {
      expect(manager).toBeDefined();
      const permissions = manager.getResourcePermissions(testResourceId);
      expect(permissions).toEqual([]);
    });
  });

  describe('grantPermission', () => {
    test('should create a new permission', () => {
      const permission = manager.grantPermission(
        testUserId,
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.VIEW,
        testGrantorId
      );

      expect(permission).toBeDefined();
      expect(permission.userId).toBe(testUserId);
      expect(permission.resourceId).toBe(testResourceId);
      expect(permission.resourceType).toBe(ResourceType.NOTE);
      expect(permission.level).toBe(PermissionLevel.VIEW);
      expect(permission.grantedBy).toBe(testGrantorId);
      expect(permission.grantedAt).toBeInstanceOf(Date);
      expect(permission.id).toBeDefined();
    });

    test('should update existing permission if one exists', () => {
      manager.grantPermission(
        testUserId,
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.VIEW,
        testGrantorId
      );

      const updated = manager.grantPermission(
        testUserId,
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.EDIT,
        testGrantorId
      );

      expect(updated.level).toBe(PermissionLevel.EDIT);
    });
  });

  describe('checkPermission', () => {
    test('should return NONE for non-existent permission', () => {
      const level = manager.checkPermission(testUserId, testResourceId);
      expect(level).toBe(PermissionLevel.NONE);
    });

    test('should return correct permission level', () => {
      manager.grantPermission(
        testUserId,
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.EDIT,
        testGrantorId
      );

      const level = manager.checkPermission(testUserId, testResourceId);
      expect(level).toBe(PermissionLevel.EDIT);
    });

    test('should return correct level for different permission types', () => {
      manager.grantPermission(
        testUserId,
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.ADMIN,
        testGrantorId
      );

      const level = manager.checkPermission(testUserId, testResourceId);
      expect(level).toBe(PermissionLevel.ADMIN);
    });
  });

  describe('revokePermission', () => {
    test('should remove permission', () => {
      manager.grantPermission(
        testUserId,
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.VIEW,
        testGrantorId
      );

      manager.revokePermission(testUserId, testResourceId);

      const level = manager.checkPermission(testUserId, testResourceId);
      expect(level).toBe(PermissionLevel.NONE);
    });

    test('should not throw when revoking non-existent permission', () => {
      expect(() => {
        manager.revokePermission(testUserId, testResourceId);
      }).not.toThrow();
    });
  });

  describe('updatePermission', () => {
    test('should change permission level', () => {
      manager.grantPermission(
        testUserId,
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.VIEW,
        testGrantorId
      );

      const updated = manager.updatePermission(testUserId, testResourceId, PermissionLevel.ADMIN);

      expect(updated.level).toBe(PermissionLevel.ADMIN);
      expect(manager.checkPermission(testUserId, testResourceId)).toBe(PermissionLevel.ADMIN);
    });

    test('should throw when updating non-existent permission', () => {
      expect(() => {
        manager.updatePermission(testUserId, testResourceId, PermissionLevel.EDIT);
      }).toThrow('Permission not found');
    });
  });

  describe('getResourcePermissions', () => {
    test('should return all permissions for a resource', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      manager.grantPermission(
        user1,
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.VIEW,
        testGrantorId
      );
      manager.grantPermission(
        user2,
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.EDIT,
        testGrantorId
      );

      const permissions = manager.getResourcePermissions(testResourceId);
      expect(permissions).toHaveLength(2);
      expect(permissions.map(p => p.userId).sort()).toEqual([user1, user2].sort());
    });

    test('should return empty array for resource with no permissions', () => {
      const permissions = manager.getResourcePermissions('non-existent-resource');
      expect(permissions).toEqual([]);
    });
  });

  describe('getUserPermissions', () => {
    test('should return all permissions for a user', () => {
      const resource1 = 'resource-1';
      const resource2 = 'resource-2';

      manager.grantPermission(
        testUserId,
        resource1,
        ResourceType.NOTE,
        PermissionLevel.VIEW,
        testGrantorId
      );
      manager.grantPermission(
        testUserId,
        resource2,
        ResourceType.FOLDER,
        PermissionLevel.EDIT,
        testGrantorId
      );

      const permissions = manager.getUserPermissions(testUserId);
      expect(permissions).toHaveLength(2);
    });

    test('should return empty array for user with no permissions', () => {
      const permissions = manager.getUserPermissions('non-existent-user');
      expect(permissions).toEqual([]);
    });
  });

  describe('createShareLink', () => {
    test('should create a share link', () => {
      const link = manager.createShareLink(testResourceId, ResourceType.NOTE, PermissionLevel.VIEW);

      expect(link).toBeDefined();
      expect(link.resourceId).toBe(testResourceId);
      expect(link.resourceType).toBe(ResourceType.NOTE);
      expect(link.permissionLevel).toBe(PermissionLevel.VIEW);
      expect(link.currentUses).toBe(0);
      expect(link.id).toBeDefined();
      expect(link.createdAt).toBeInstanceOf(Date);
    });

    test('should create share link with expiration', () => {
      const expiresAt = new Date(Date.now() + 86400000); // 1 day from now
      const link = manager.createShareLink(
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.VIEW,
        { expiresAt }
      );

      expect(link.expiresAt).toEqual(expiresAt);
    });

    test('should create share link with max uses', () => {
      const link = manager.createShareLink(
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.VIEW,
        { maxUses: 5 }
      );

      expect(link.maxUses).toBe(5);
    });
  });

  describe('validateShareLink', () => {
    test('should return valid for active share link', () => {
      const link = manager.createShareLink(testResourceId, ResourceType.NOTE, PermissionLevel.EDIT);

      const result = manager.validateShareLink(link.id);
      expect(result.valid).toBe(true);
      expect(result.permission).toBe(PermissionLevel.EDIT);
    });

    test('should return invalid for expired link', () => {
      const expiresAt = new Date(Date.now() - 1000); // Already expired
      const link = manager.createShareLink(
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.VIEW,
        { expiresAt }
      );

      const result = manager.validateShareLink(link.id);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Link has expired');
    });

    test('should return invalid for max uses exceeded', () => {
      const link = manager.createShareLink(
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.VIEW,
        { maxUses: 2 }
      );

      manager.useShareLink(link.id);
      manager.useShareLink(link.id);

      const result = manager.validateShareLink(link.id);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Maximum uses exceeded');
    });

    test('should return invalid for non-existent link', () => {
      const result = manager.validateShareLink('non-existent-link');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Link not found');
    });
  });

  describe('useShareLink', () => {
    test('should increment usage count', () => {
      const link = manager.createShareLink(
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.VIEW,
        { maxUses: 3 }
      );

      expect(manager.useShareLink(link.id)).toBe(true);
      expect(manager.useShareLink(link.id)).toBe(true);

      const result = manager.validateShareLink(link.id);
      expect(result.valid).toBe(true);
    });

    test('should return false when max uses exceeded', () => {
      const link = manager.createShareLink(
        testResourceId,
        ResourceType.NOTE,
        PermissionLevel.VIEW,
        { maxUses: 1 }
      );

      expect(manager.useShareLink(link.id)).toBe(true);
      expect(manager.useShareLink(link.id)).toBe(false);
    });

    test('should return false for non-existent link', () => {
      expect(manager.useShareLink('non-existent-link')).toBe(false);
    });
  });

  describe('revokeShareLink', () => {
    test('should remove share link', () => {
      const link = manager.createShareLink(testResourceId, ResourceType.NOTE, PermissionLevel.VIEW);

      manager.revokeShareLink(link.id);

      const result = manager.validateShareLink(link.id);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Link not found');
    });

    test('should not throw when revoking non-existent link', () => {
      expect(() => {
        manager.revokeShareLink('non-existent-link');
      }).not.toThrow();
    });
  });

  describe('permission inheritance', () => {
    test('should check folder permission for nested notes', () => {
      const folderId = 'folder-123';
      const noteId = 'note-456';

      // Grant permission on folder
      manager.grantPermission(
        testUserId,
        folderId,
        ResourceType.FOLDER,
        PermissionLevel.EDIT,
        testGrantorId
      );

      // Should inherit folder permission for note
      const level = manager.checkPermission(testUserId, noteId, folderId);
      expect(level).toBe(PermissionLevel.EDIT);
    });

    test('should return direct permission over inherited', () => {
      const folderId = 'folder-123';
      const noteId = 'note-456';

      manager.grantPermission(
        testUserId,
        folderId,
        ResourceType.FOLDER,
        PermissionLevel.VIEW,
        testGrantorId
      );

      manager.grantPermission(
        testUserId,
        noteId,
        ResourceType.NOTE,
        PermissionLevel.ADMIN,
        testGrantorId
      );

      const level = manager.checkPermission(testUserId, noteId, folderId);
      expect(level).toBe(PermissionLevel.ADMIN);
    });
  });

  describe('edge cases', () => {
    test('should handle multiple users with different permissions', () => {
      const users = ['user-1', 'user-2', 'user-3'];
      const levels = [PermissionLevel.VIEW, PermissionLevel.EDIT, PermissionLevel.ADMIN];

      users.forEach((user, index) => {
        manager.grantPermission(
          user,
          testResourceId,
          ResourceType.NOTE,
          levels[index],
          testGrantorId
        );
      });

      users.forEach((user, index) => {
        expect(manager.checkPermission(user, testResourceId)).toBe(levels[index]);
      });
    });

    test('should handle resource type variations', () => {
      const noteId = 'note-1';
      const folderId = 'folder-1';
      const workspaceId = 'workspace-1';

      manager.grantPermission(
        testUserId,
        noteId,
        ResourceType.NOTE,
        PermissionLevel.VIEW,
        testGrantorId
      );
      manager.grantPermission(
        testUserId,
        folderId,
        ResourceType.FOLDER,
        PermissionLevel.EDIT,
        testGrantorId
      );
      manager.grantPermission(
        testUserId,
        workspaceId,
        ResourceType.WORKSPACE,
        PermissionLevel.ADMIN,
        testGrantorId
      );

      expect(manager.checkPermission(testUserId, noteId)).toBe(PermissionLevel.VIEW);
      expect(manager.checkPermission(testUserId, folderId)).toBe(PermissionLevel.EDIT);
      expect(manager.checkPermission(testUserId, workspaceId)).toBe(PermissionLevel.ADMIN);
    });

    test('should maintain separate namespaces for different resources', () => {
      const resource1 = 'resource-1';
      const resource2 = 'resource-2';

      manager.grantPermission(
        testUserId,
        resource1,
        ResourceType.NOTE,
        PermissionLevel.VIEW,
        testGrantorId
      );
      manager.grantPermission(
        testUserId,
        resource2,
        ResourceType.NOTE,
        PermissionLevel.ADMIN,
        testGrantorId
      );

      expect(manager.checkPermission(testUserId, resource1)).toBe(PermissionLevel.VIEW);
      expect(manager.checkPermission(testUserId, resource2)).toBe(PermissionLevel.ADMIN);
    });
  });
});
