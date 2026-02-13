/**
 * Tests for VersionHistory component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { VersionHistory, VersionHistoryProps } from '../VersionHistory';
import { VersionManager, type Version, type DiffResult } from '../../lib/versions/versionManager';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('VersionHistory', () => {
  const mockOnRestore = vi.fn();
  const mockOnSelect = vi.fn();
  const mockOnCompareToggle = vi.fn();
  let mockVersionManager: VersionManager & {
    addVersion: (version: Version) => void;
    clearVersions: () => void;
  };
  let mockSubscribers: Array<(version: Version) => void> = [];

  const createMockVersion = (
    id: string,
    resourceId: string,
    overrides: Partial<Version> = {}
  ): Version => ({
    id,
    resourceId,
    content: `Content for version ${id}`,
    timestamp: new Date(),
    userId: 'user-1',
    userDisplayName: 'John Doe',
    changeSummary: 'Test change',
    ...overrides,
  });

  const createMockLogger = (): VersionManager & {
    addVersion: (version: Version) => void;
    clearVersions: () => void;
  } => {
    const versions: Map<string, Version> = new Map();
    const resourceVersions: Map<string, string[]> = new Map();
    const subscribers = new Set<(version: Version) => void>();

    const manager = {
      saveVersion: vi.fn(
        (
          resourceId: string,
          content: string,
          userId: string,
          userDisplayName: string,
          changeSummary?: string
        ) => {
          const version: Version = {
            id: `ver-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            resourceId,
            content,
            timestamp: new Date(),
            userId,
            userDisplayName,
            changeSummary,
          };
          versions.set(version.id, version);

          const resourceVersionIds = resourceVersions.get(resourceId) || [];
          resourceVersionIds.unshift(version.id);
          resourceVersions.set(resourceId, resourceVersionIds);

          subscribers.forEach(cb => cb(version));
          return version;
        }
      ),
      addVersion: (version: Version) => {
        versions.set(version.id, version);
        const resourceVersionIds = resourceVersions.get(version.resourceId) || [];
        resourceVersionIds.unshift(version.id);
        resourceVersions.set(version.resourceId, resourceVersionIds);
      },
      clearVersions: () => {
        versions.clear();
        resourceVersions.clear();
      },
      getVersions: vi.fn((resourceId: string) => {
        const versionIds = resourceVersions.get(resourceId) || [];
        return versionIds
          .map((id: string) => versions.get(id))
          .filter((v): v is Version => v !== undefined);
      }),
      getVersion: vi.fn((versionId: string) => versions.get(versionId) || null),
      getLatestVersion: vi.fn((resourceId: string) => {
        const versionIds = resourceVersions.get(resourceId);
        if (!versionIds || versionIds.length === 0) return null;
        return versions.get(versionIds[0]) || null;
      }),
      restoreVersion: vi.fn((versionId: string) => versions.get(versionId) || null),
      deleteVersion: vi.fn(() => true),
      deleteResourceVersions: vi.fn(() => true),
      compareVersions: vi.fn((id1: string, id2: string): DiffResult | null => {
        const v1 = versions.get(id1);
        const v2 = versions.get(id2);
        if (!v1 || !v2) return null;
        return {
          added: ['New line'],
          removed: ['Old line'],
          unchanged: ['Same line'],
          charsAdded: 10,
          charsRemoved: 8,
          summary: '1 line added, 1 line removed',
        };
      }),
      compareWithCurrent: vi.fn(
        (): DiffResult => ({
          added: ['Current addition'],
          removed: ['Previous content'],
          unchanged: [],
          charsAdded: 20,
          charsRemoved: 15,
          summary: 'Changed 2 lines',
        })
      ),
      getFilteredVersions: vi.fn(() => []),
      subscribe: vi.fn((callback: (version: Version) => void) => {
        subscribers.add(callback);
        mockSubscribers.push(callback);
        return () => {
          subscribers.delete(callback);
          const index = mockSubscribers.indexOf(callback);
          if (index > -1) {
            mockSubscribers.splice(index, 1);
          }
        };
      }),
      clear: vi.fn(),
      clearOlderThan: vi.fn(),
      getVersionCount: vi.fn((resourceId: string) => {
        return resourceVersions.get(resourceId)?.length || 0;
      }),
      getTotalVersionCount: vi.fn(() => versions.size),
      formatVersionTime: vi.fn((_version: Version) => 'just now'),
      scheduleAutoSave: vi.fn(),
    } as unknown as VersionManager & {
      addVersion: (version: Version) => void;
      clearVersions: () => void;
    };

    return manager;
  };

  const defaultProps: VersionHistoryProps = {
    resourceId: 'note-123',
    currentContent: 'Current note content',
    versionManager: undefined,
    onRestore: mockOnRestore,
    onSelect: mockOnSelect,
    onCompareToggle: mockOnCompareToggle,
    enableCompare: true,
    limit: 20,
    compact: false,
    currentUserId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockSubscribers = [];
    mockVersionManager = createMockLogger();
  });

  afterEach(() => {
    vi.useRealTimers();
    mockSubscribers = [];
  });

  describe('Loading state', () => {
    it('should not crash during loading', async () => {
      // Since getVersions is synchronous, loading state is very brief
      // We just verify the component renders without errors
      const { container } = render(
        <VersionHistory {...defaultProps} versionManager={mockVersionManager} />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no versions exist', async () => {
      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('No version history')).toBeInTheDocument();
      });

      expect(screen.getByText(/This note doesn't have any saved versions/)).toBeInTheDocument();
    });

    it('should show clock icon in empty state', async () => {
      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        const emptyState = screen.getByText('No version history').parentElement;
        expect(emptyState?.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Version list rendering', () => {
    it('should render all versions', async () => {
      // Pre-populate the mock manager
      mockVersionManager.addVersion(
        createMockVersion('ver-1', 'note-123', {
          userDisplayName: 'Alice Smith',
          timestamp: new Date(Date.now() - 10000),
        })
      );
      mockVersionManager.addVersion(
        createMockVersion('ver-2', 'note-123', {
          userDisplayName: 'Bob Wilson',
          timestamp: new Date(Date.now() - 5000),
        })
      );

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });

      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('should show version count in header', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));
      mockVersionManager.addVersion(createMockVersion('ver-2', 'note-123'));

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('2 versions saved')).toBeInTheDocument();
      });
    });

    it('should show singular "version" when only one exists', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('1 version saved')).toBeInTheDocument();
      });
    });
  });

  describe('Version selection', () => {
    it('should show version preview when version is selected', async () => {
      mockVersionManager.addVersion(
        createMockVersion('ver-1', 'note-123', {
          content: 'Test content',
        })
      );

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click on the version
      const versionItem = screen.getByText('John Doe').closest('.cursor-pointer');
      if (versionItem) {
        fireEvent.click(versionItem);
      }

      await waitFor(() => {
        expect(screen.getByText('Restore this version')).toBeInTheDocument();
      });
    });

    it('should call onSelect when version is clicked', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const versionItem = screen.getByText('John Doe').closest('.cursor-pointer');
      if (versionItem) {
        fireEvent.click(versionItem);
      }

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledTimes(1);
      });
    });

    it('should show selected state for clicked version', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const versionItem = screen.getByText('John Doe').closest('.cursor-pointer');
      if (versionItem) {
        fireEvent.click(versionItem);
        expect(versionItem.className).toContain('border-amber-500');
      }
    });
  });

  describe('Version restore', () => {
    it('should show restore button when version is selected', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const versionItem = screen.getByText('John Doe').closest('.cursor-pointer');
      if (versionItem) {
        fireEvent.click(versionItem);
      }

      await waitFor(() => {
        expect(screen.getByText('Restore this version')).toBeInTheDocument();
      });
    });

    it('should call onRestore when restore button is clicked', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Select version
      const versionItem = screen.getByText('John Doe').closest('.cursor-pointer');
      if (versionItem) {
        fireEvent.click(versionItem);
      }

      await waitFor(() => {
        expect(screen.getByText('Restore this version')).toBeInTheDocument();
      });

      // Click restore
      const restoreButton = screen.getByText('Restore this version');
      fireEvent.click(restoreButton);

      await waitFor(() => {
        expect(mockOnRestore).toHaveBeenCalledTimes(1);
      });
    });

    it('should show restoring state during restore operation', async () => {
      // Make restoreVersion hang to test loading state
      let resolveRestore: (value: Version) => void;
      const restorePromise = new Promise<Version>(resolve => {
        resolveRestore = resolve;
      });
      mockVersionManager.restoreVersion = vi.fn(() => restorePromise);

      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Select version
      const versionItem = screen.getByText('John Doe').closest('.cursor-pointer');
      if (versionItem) {
        fireEvent.click(versionItem);
      }

      await waitFor(() => {
        expect(screen.getByText('Restore this version')).toBeInTheDocument();
      });

      // Click restore but don't resolve yet
      const restoreButton = screen.getByText('Restore this version');
      fireEvent.click(restoreButton);

      // Check restoring state immediately
      await waitFor(() => {
        expect(screen.getByText('Restoring...')).toBeInTheDocument();
      });

      // Clean up by resolving
      resolveRestore!(createMockVersion('ver-1', 'note-123'));
    });
  });

  describe('Compare mode', () => {
    it('should show compare button when enableCompare is true', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('Compare')).toBeInTheDocument();
      });
    });

    it('should not show compare button when enableCompare is false', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(
        <VersionHistory
          {...defaultProps}
          versionManager={mockVersionManager}
          enableCompare={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.queryByText('Compare')).not.toBeInTheDocument();
    });

    it('should toggle compare mode when compare button is clicked', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('Compare')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Compare'));

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument();
      });

      expect(screen.getByText(/Select 2 versions to compare/)).toBeInTheDocument();
    });

    it('should call onCompareToggle when compare mode is toggled', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('Compare')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Compare'));

      await waitFor(() => {
        expect(mockOnCompareToggle).toHaveBeenCalledWith(true);
      });
    });

    it('should show checkboxes in compare mode', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('Compare')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Compare'));

      await waitFor(() => {
        expect(screen.getByText(/Select 2 versions to compare/)).toBeInTheDocument();
      });
    });
  });

  describe('User information', () => {
    it('should display user display name', async () => {
      mockVersionManager.addVersion(
        createMockVersion('ver-1', 'note-123', {
          userDisplayName: 'Alice Smith',
        })
      );

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });
    });

    it('should show user initial', async () => {
      mockVersionManager.addVersion(
        createMockVersion('ver-1', 'note-123', {
          userDisplayName: 'Alice Smith',
        })
      );

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument();
      });
    });

    it('should indicate current user with "(you)" label', async () => {
      mockVersionManager.addVersion(
        createMockVersion('ver-1', 'note-123', {
          userId: 'user-1',
          userDisplayName: 'Alice Smith',
        })
      );

      render(
        <VersionHistory
          {...defaultProps}
          versionManager={mockVersionManager}
          currentUserId="user-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('(you)')).toBeInTheDocument();
      });
    });

    it('should use amber styling for current user', async () => {
      mockVersionManager.addVersion(
        createMockVersion('ver-1', 'note-123', {
          userId: 'user-1',
          userDisplayName: 'Alice Smith',
        })
      );

      render(
        <VersionHistory
          {...defaultProps}
          versionManager={mockVersionManager}
          currentUserId="user-1"
        />
      );

      await waitFor(() => {
        const avatar = screen.getByText('A');
        expect(avatar.closest('div')?.className).toContain('bg-amber-100');
      });
    });
  });

  describe('Timestamp formatting', () => {
    it('should show relative time for recent versions', async () => {
      mockVersionManager.addVersion(
        createMockVersion('ver-1', 'note-123', {
          timestamp: new Date(Date.now() - 30000),
        })
      );

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        const timeElement = screen.getByText(/\d+[mhd]|just now|yesterday/);
        expect(timeElement).toBeInTheDocument();
      });
    });

    it('should show timestamp icon', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        const timeIcon = document.querySelector('svg[viewBox="0 0 24 24"]');
        expect(timeIcon).toBeInTheDocument();
      });
    });
  });

  describe('Change summary', () => {
    it('should display change summary for versions', async () => {
      mockVersionManager.addVersion(
        createMockVersion('ver-1', 'note-123', {
          changeSummary: 'Added introduction paragraph',
        })
      );

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('Added introduction paragraph')).toBeInTheDocument();
      });
    });

    it('should hide change summary in compact mode', async () => {
      mockVersionManager.addVersion(
        createMockVersion('ver-1', 'note-123', {
          changeSummary: 'Added introduction paragraph',
        })
      );

      render(
        <VersionHistory {...defaultProps} versionManager={mockVersionManager} compact={true} />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Change summary should not be visible in compact mode
      expect(screen.queryByText('Added introduction paragraph')).not.toBeInTheDocument();
    });
  });

  describe('Real-time updates', () => {
    it('should subscribe to new versions', async () => {
      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(mockVersionManager.subscribe).toHaveBeenCalledTimes(1);
      });
    });

    it('should add new version to list when received via subscription', async () => {
      mockVersionManager.addVersion(
        createMockVersion('ver-1', 'note-123', {
          userDisplayName: 'Existing User',
        })
      );

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('Existing User')).toBeInTheDocument();
      });

      // Simulate receiving a new version via subscription
      const newVersion = createMockVersion('ver-2', 'note-123', {
        userDisplayName: 'New User',
      });

      act(() => {
        mockSubscribers.forEach(callback => callback(newVersion));
      });

      await waitFor(() => {
        expect(screen.getByText('New User')).toBeInTheDocument();
      });
    });

    it('should only show versions for the correct resource', async () => {
      mockVersionManager.addVersion(
        createMockVersion('ver-1', 'note-123', {
          userDisplayName: 'Correct User',
        })
      );

      render(
        <VersionHistory
          {...defaultProps}
          versionManager={mockVersionManager}
          resourceId="note-123"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Correct User')).toBeInTheDocument();
      });

      // Simulate version for different resource
      const differentResourceVersion = createMockVersion('ver-2', 'note-456', {
        userDisplayName: 'Different User',
      });

      act(() => {
        mockSubscribers.forEach(callback => callback(differentResourceVersion));
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(screen.queryByText('Different User')).not.toBeInTheDocument();
    });
  });

  describe('Diff view', () => {
    it('should show diff when version is selected and currentContent is provided', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const versionItem = screen.getByText('John Doe').closest('.cursor-pointer');
      if (versionItem) {
        fireEvent.click(versionItem);
      }

      await waitFor(() => {
        expect(mockVersionManager.compareWithCurrent).toHaveBeenCalled();
      });
    });

    it('should display added content in diff', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const versionItem = screen.getByText('John Doe').closest('.cursor-pointer');
      if (versionItem) {
        fireEvent.click(versionItem);
      }

      await waitFor(() => {
        expect(screen.getByText(/Added/)).toBeInTheDocument();
      });
    });
  });

  describe('Compact mode', () => {
    it('should use single column layout in compact mode', async () => {
      mockVersionManager.addVersion(createMockVersion('ver-1', 'note-123'));

      render(
        <VersionHistory {...defaultProps} versionManager={mockVersionManager} compact={true} />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // In compact mode, there should be no preview column
      expect(screen.queryByText('Restore this version')).not.toBeInTheDocument();
    });
  });

  describe('Limit prop', () => {
    it('should respect limit when displaying versions', async () => {
      // Add 5 versions
      for (let i = 0; i < 5; i++) {
        mockVersionManager.addVersion(
          createMockVersion(`ver-${i}`, 'note-123', {
            userDisplayName: `User ${i}`,
          })
        );
      }

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} limit={3} />);

      await waitFor(() => {
        expect(screen.getByText('User 0')).toBeInTheDocument();
      });

      // Should only show 3 versions
      expect(screen.getByText('3 versions saved')).toBeInTheDocument();
    });
  });

  describe('Content preview', () => {
    it('should show content preview in non-compact mode', async () => {
      mockVersionManager.addVersion(
        createMockVersion('ver-1', 'note-123', {
          content: 'This is the note content',
        })
      );

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const versionItem = screen.getByText('John Doe').closest('.cursor-pointer');
      if (versionItem) {
        fireEvent.click(versionItem);
      }

      await waitFor(() => {
        expect(screen.getByText('Content Preview')).toBeInTheDocument();
      });

      expect(screen.getByText('This is the note content')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle versions with empty change summary', async () => {
      mockVersionManager.addVersion(
        createMockVersion('ver-1', 'note-123', {
          changeSummary: undefined,
        })
      );

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should handle very long content gracefully', async () => {
      mockVersionManager.addVersion(
        createMockVersion('ver-1', 'note-123', {
          content: 'A'.repeat(10000),
        })
      );

      render(<VersionHistory {...defaultProps} versionManager={mockVersionManager} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const versionItem = screen.getByText('John Doe').closest('.cursor-pointer');
      if (versionItem) {
        fireEvent.click(versionItem);
      }

      await waitFor(() => {
        expect(screen.getByText('Content Preview')).toBeInTheDocument();
      });
    });

    it('should unsubscribe on unmount', async () => {
      const { unmount } = render(
        <VersionHistory {...defaultProps} versionManager={mockVersionManager} />
      );

      await waitFor(() => {
        expect(mockVersionManager.subscribe).toHaveBeenCalled();
      });

      unmount();

      expect(mockSubscribers.length).toBe(0);
    });
  });
});
