/**
 * Tests for VersionManager storage limits and pruning
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VersionManager } from '../versionManager';

describe('VersionManager storage limits', () => {
  let manager: VersionManager;

  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    // Create new manager with small limits for testing
    manager = new VersionManager({
      maxVersionsPerResource: 5,
      maxInMemory: 10,
      persistLocal: true,
      storageKey: 'test_versions',
    });
  });

  describe('pruneOldestVersions', () => {
    it('should prune versions when storage exceeds safe limit', () => {
      const resourceId = 'test-resource';
      const userId = 'user-1';
      const userDisplayName = 'Test User';

      // Create 50 versions with large content (100KB each = ~5MB total)
      const largeContent = 'x'.repeat(100000); // 100KB
      for (let i = 0; i < 50; i++) {
        manager.saveVersion(resourceId, largeContent + i, userId, userDisplayName, `Version ${i}`);
      }

      // Get the stored data from localStorage
      const stored = localStorage.getItem('test_versions');
      expect(stored).not.toBeNull();

      const data = JSON.parse(stored || '{}');
      const storedVersions = data.versions || [];

      // Verify that pruning occurred - we should have fewer than 50 versions
      // because localStorage has a 5-10MB limit and we're storing 5MB+ of data
      expect(storedVersions.length).toBeLessThan(50);

      // Verify that the versions stored are the newest ones
      // (oldest should have been pruned first)
      if (storedVersions.length > 0) {
        // Versions are stored newest first in the array
        // The pruned versions should be the oldest ones
        const timestamps = storedVersions.map((v: { timestamp: string }) =>
          new Date(v.timestamp).getTime()
        );
        // Verify all stored versions are relatively recent (within pruning window)
        const oldestStored = Math.min(...timestamps);
        const newestStored = Math.max(...timestamps);
        const timeSpan = newestStored - oldestStored;

        // With 50 versions and pruning, we should see a reasonable time span
        // indicating older versions were removed
        expect(timeSpan).toBeGreaterThan(0);
      }
    });

    it('should handle QuotaExceededError gracefully', () => {
      const resourceId = 'test-resource';
      const userId = 'user-1';
      const userDisplayName = 'Test User';

      // Mock the localStorage.setItem that VersionManager actually uses
      const originalSetItem = (globalThis as any).localStorage.setItem;
      let callCount = 0;

      (globalThis as any).localStorage.setItem = vi.fn((key: string, value: string) => {
        callCount++;

        // First call throws error to trigger pruning
        if (callCount === 1) {
          const error = new DOMException('QuotaExceededError', 'QuotaExceededError');
          throw error;
        }

        // Subsequent calls succeed
        return originalSetItem.call((globalThis as any).localStorage, key, value);
      });

      try {
        // Save a version - should handle the error gracefully
        const version = manager.saveVersion(
          resourceId,
          'Test content',
          userId,
          userDisplayName,
          'Test version'
        );

        // Verify version was saved successfully (after retry with pruning)
        expect(version).toBeDefined();
        expect(version.id).toBeDefined();
        expect(version.content).toBe('Test content');

        // Verify the mock was called twice (initial error + retry after pruning)
        expect((globalThis as any).localStorage.setItem).toHaveBeenCalledTimes(2);
      } finally {
        // Restore original setItem
        (globalThis as any).localStorage.setItem = originalSetItem;
      }
    });
  });
});
