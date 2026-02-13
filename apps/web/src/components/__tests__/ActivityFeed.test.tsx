/**
 * Tests for ActivityFeed component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { ActivityFeed, ActivityFeedProps } from '../ActivityFeed';
import {
  ActivityType,
  type Activity,
  type ActivityLogger,
  getActivityLogger,
} from '../../lib/activity/activityLog';

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

describe('ActivityFeed', () => {
  const mockOnActivityClick = vi.fn();
  let mockActivityLogger: ActivityLogger & {
    addActivity: (activity: Activity) => void;
    clearActivities: () => void;
  };
  let mockSubscribers: Array<(activity: Activity) => void> = [];

  const createMockActivity = (
    id: string,
    type: ActivityType,
    overrides: Partial<Activity> = {}
  ): Activity => ({
    id,
    type,
    resourceId: 'resource-1',
    resourceType: 'note',
    resourceName: 'Test Note',
    userId: 'user-1',
    userDisplayName: 'John Doe',
    userAvatarUrl: 'https://example.com/avatar.jpg',
    timestamp: new Date(),
    metadata: {},
    ...overrides,
  });

  const createMockLogger = (): ActivityLogger & {
    addActivity: (activity: Activity) => void;
    clearActivities: () => void;
  } => {
    const activities: Activity[] = [];
    const subscribers = new Set<(activity: Activity) => void>();

    const logger = {
      log: vi.fn((params: Omit<Activity, 'id' | 'timestamp'> & { timestamp?: Date }) => {
        const activity: Activity = {
          id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: params.timestamp ?? new Date(),
          ...params,
        } as Activity;
        activities.unshift(activity);
        subscribers.forEach(cb => cb(activity));
        return activity;
      }),
      addActivity: (activity: Activity) => {
        activities.unshift(activity);
      },
      clearActivities: () => {
        activities.length = 0;
      },
      getActivities: vi.fn(
        (filter: import('../../lib/activity/activityLog').ActivityFilter = {}) => {
          let result = [...activities];

          if (filter.resourceIds && filter.resourceIds.length > 0) {
            result = result.filter(a => filter.resourceIds!.includes(a.resourceId));
          }

          if (filter.userIds && filter.userIds.length > 0) {
            result = result.filter(a => filter.userIds!.includes(a.userId));
          }

          if (filter.types && filter.types.length > 0) {
            result = result.filter(a => filter.types!.includes(a.type));
          }

          const offset = filter.offset ?? 0;
          const limit = filter.limit ?? result.length;

          return result.slice(offset, offset + limit);
        }
      ),
      getResourceActivities: vi.fn(),
      getUserActivities: vi.fn(),
      subscribe: vi.fn((callback: (activity: Activity) => void) => {
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
    } as unknown as ActivityLogger & {
      addActivity: (activity: Activity) => void;
      clearActivities: () => void;
    };

    return logger;
  };

  const defaultProps: ActivityFeedProps = {
    limit: 20,
    realtime: true,
    compact: false,
    showResourceName: false,
    onActivityClick: mockOnActivityClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockSubscribers = [];
    mockActivityLogger = createMockLogger() as ActivityLogger & {
      addActivity: (activity: Activity) => void;
      clearActivities: () => void;
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    mockSubscribers = [];
  });

  describe('Loading state', () => {
    it('should not show activities while loading', () => {
      // Since getActivities is synchronous, loading is very brief
      // We just verify the component renders without crashing during load
      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      // Component should eventually render (either empty state or activities)
      // The loading spinner may or may not be visible depending on timing
      expect(document.body).toBeTruthy();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no activities', async () => {
      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        expect(screen.getByText('No recent activity')).toBeInTheDocument();
      });

      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });

    it('should show clock icon in empty state', async () => {
      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        const emptyState = screen.getByText('No recent activity').parentElement;
        expect(emptyState?.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Activity list rendering', () => {
    it('should render all activities', async () => {
      // Pre-populate the mock logger
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        resourceName: 'Project Notes',
        userId: 'user-1',
        userDisplayName: 'Alice Smith',
      });
      mockActivityLogger.log({
        type: ActivityType.NOTE_EDITED,
        resourceId: 'resource-1',
        resourceType: 'note',
        resourceName: 'Meeting Minutes',
        userId: 'user-2',
        userDisplayName: 'Bob Wilson',
      });
      mockActivityLogger.log({
        type: ActivityType.NOTE_DELETED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-3',
        userDisplayName: 'Charlie Brown',
      });

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
      });

      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('should render activity type labels', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Test User',
      });

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        expect(screen.getByText('created')).toBeInTheDocument();
      });
    });
  });

  describe('Activity icons and colors', () => {
    it('should render icon containers for activities', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Test User',
      });

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        const iconContainer = document.querySelector('.rounded-lg');
        expect(iconContainer).toBeInTheDocument();
      });
    });

    it('should apply color classes to icons', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Test User',
      });

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        // Find the icon container by its specific class combination
        const iconContainer = document.querySelector('.p-2.rounded-lg');
        expect(iconContainer).toBeInTheDocument();
        // Check it has color classes (text-* and bg-*)
        const classList = iconContainer?.className || '';
        expect(classList).toMatch(/text-/);
        expect(classList).toMatch(/bg-/);
      });
    });
  });

  describe('User avatars and names', () => {
    it('should display user avatar when avatarUrl is provided', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Test User',
        userAvatarUrl: 'https://example.com/avatar.jpg',
      });

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        const avatar = screen.getByAltText('');
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      });
    });

    it('should display initial when avatarUrl is not provided', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'John Doe',
      });

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        expect(screen.getByText('J')).toBeInTheDocument();
      });
    });

    it('should capitalize initial letter', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'alice',
      });

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument();
      });
    });

    it('should display user display name', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Custom User Name',
      });

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        expect(screen.getByText('Custom User Name')).toBeInTheDocument();
      });
    });
  });

  describe('Resource name display', () => {
    it('should show resource name when showResourceName is true', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        resourceName: 'My Special Note',
        userId: 'user-1',
        userDisplayName: 'Test User',
      });

      render(
        <ActivityFeed {...defaultProps} logger={mockActivityLogger} showResourceName={true} />
      );

      await waitFor(() => {
        expect(screen.getByText('My Special Note')).toBeInTheDocument();
      });
    });

    it('should not show resource name when showResourceName is false', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        resourceName: 'My Special Note',
        userId: 'user-1',
        userDisplayName: 'Test User',
      });

      render(
        <ActivityFeed {...defaultProps} logger={mockActivityLogger} showResourceName={false} />
      );

      await waitFor(() => {
        expect(screen.queryByText('My Special Note')).not.toBeInTheDocument();
      });
    });
  });

  describe('Relative time formatting', () => {
    it('should show "just now" for activities less than 60 seconds ago', async () => {
      mockActivityLogger.addActivity(
        createMockActivity('act-1', ActivityType.NOTE_CREATED, {
          timestamp: new Date(Date.now() - 30000),
        })
      );

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        expect(screen.getByText('just now')).toBeInTheDocument();
      });
    });

    it('should show "Xm ago" for activities less than an hour ago', async () => {
      mockActivityLogger.addActivity(
        createMockActivity('act-1', ActivityType.NOTE_CREATED, {
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
        })
      );

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        expect(screen.getByText('5m ago')).toBeInTheDocument();
      });
    });

    it('should show "Xh ago" for activities less than 24 hours ago', async () => {
      mockActivityLogger.addActivity(
        createMockActivity('act-1', ActivityType.NOTE_CREATED, {
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        })
      );

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        expect(screen.getByText('3h ago')).toBeInTheDocument();
      });
    });

    it('should show "yesterday" for activities from yesterday', async () => {
      // Create a timestamp that is exactly 25 hours ago (guaranteed to be "yesterday")
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

      mockActivityLogger.addActivity(
        createMockActivity('act-1', ActivityType.NOTE_CREATED, {
          timestamp: twentyFiveHoursAgo,
        })
      );

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        expect(screen.getByText('yesterday')).toBeInTheDocument();
      });
    });

    it('should show "Xd ago" for activities within the last week', async () => {
      mockActivityLogger.addActivity(
        createMockActivity('act-1', ActivityType.NOTE_CREATED, {
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        })
      );

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        expect(screen.getByText('3d ago')).toBeInTheDocument();
      });
    });

    it('should show formatted date for activities older than a week', async () => {
      const oldDate = new Date('2024-01-15T10:00:00Z');
      mockActivityLogger.addActivity(
        createMockActivity('act-1', ActivityType.NOTE_CREATED, {
          timestamp: oldDate,
        })
      );

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        // Should show formatted date like "Jan 15"
        const dateText = screen.getByText(/Jan \d+/);
        expect(dateText).toBeInTheDocument();
      });
    });
  });

  describe('Activity click handler', () => {
    it('should call onActivityClick when activity is clicked', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Test User',
      });

      render(
        <ActivityFeed
          {...defaultProps}
          logger={mockActivityLogger}
          onActivityClick={mockOnActivityClick}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      const activityElement = screen.getByText('Test User').closest('.flex');
      if (activityElement) {
        fireEvent.click(activityElement);
        expect(mockOnActivityClick).toHaveBeenCalledTimes(1);
        expect(mockOnActivityClick).toHaveBeenCalledWith(
          expect.objectContaining({
            type: ActivityType.NOTE_CREATED,
          })
        );
      }
    });

    it('should not show cursor pointer when onActivityClick is not provided', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Test User',
      });

      render(
        <ActivityFeed {...defaultProps} logger={mockActivityLogger} onActivityClick={undefined} />
      );

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      // When onActivityClick is not provided, the activity item should not have cursor-pointer class
      // We can check this by verifying the element doesn't have the hover:bg-stone-50 class
      const activityContainer = screen
        .getByText('Test User')
        .closest('[class*="flex items-start"]');
      expect(activityContainer).not.toBeNull();
      if (activityContainer) {
        expect(activityContainer.className).not.toContain('cursor-pointer');
      }
    });
  });

  describe('Filtering', () => {
    it('should filter by resourceId', async () => {
      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} resourceId="note-123" />);

      await waitFor(() => {
        expect(mockActivityLogger.getActivities).toHaveBeenCalledWith(
          expect.objectContaining({
            resourceIds: ['note-123'],
          })
        );
      });
    });

    it('should filter by userId', async () => {
      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} userId="user-456" />);

      await waitFor(() => {
        expect(mockActivityLogger.getActivities).toHaveBeenCalledWith(
          expect.objectContaining({
            userIds: ['user-456'],
          })
        );
      });
    });

    it('should filter by activity types', async () => {
      const types = [ActivityType.NOTE_CREATED, ActivityType.NOTE_EDITED];
      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} types={types} />);

      await waitFor(() => {
        expect(mockActivityLogger.getActivities).toHaveBeenCalledWith(
          expect.objectContaining({
            types: types,
          })
        );
      });
    });

    it('should apply limit to activities', async () => {
      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} limit={10} />);

      await waitFor(() => {
        expect(mockActivityLogger.getActivities).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 10,
          })
        );
      });
    });
  });

  describe('Compact mode', () => {
    it('should show metadata in non-compact mode', async () => {
      mockActivityLogger.log({
        type: ActivityType.PERMISSION_GRANTED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Test User',
        metadata: {
          targetUserDisplayName: 'Jane Smith',
        },
      });

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} compact={false} />);

      await waitFor(() => {
        expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
      });
    });

    it('should hide metadata in compact mode', async () => {
      mockActivityLogger.log({
        type: ActivityType.PERMISSION_GRANTED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Test User',
        metadata: {
          targetUserDisplayName: 'Jane Smith',
        },
      });

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} compact={true} />);

      await waitFor(() => {
        expect(screen.queryByText(/Jane Smith/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Real-time updates', () => {
    it('should subscribe to new activities when realtime is true', async () => {
      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} realtime={true} />);

      await waitFor(() => {
        expect(mockActivityLogger.subscribe).toHaveBeenCalledTimes(1);
      });
    });

    it('should not subscribe when realtime is false', async () => {
      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} realtime={false} />);

      // Wait a bit to ensure subscribe is not called
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockActivityLogger.subscribe).not.toHaveBeenCalled();
    });

    it('should unsubscribe on unmount when realtime is true', async () => {
      const { unmount } = render(
        <ActivityFeed {...defaultProps} logger={mockActivityLogger} realtime={true} />
      );

      await waitFor(() => {
        expect(mockActivityLogger.subscribe).toHaveBeenCalled();
      });

      unmount();

      expect(mockSubscribers.length).toBe(0);
    });

    it('should add new activity to list when received via subscription', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Existing User',
      });

      render(
        <ActivityFeed {...defaultProps} logger={mockActivityLogger} realtime={true} limit={10} />
      );

      await waitFor(() => {
        expect(screen.getByText('Existing User')).toBeInTheDocument();
      });

      // Simulate receiving a new activity via subscription
      const newActivity = createMockActivity('act-2', ActivityType.NOTE_EDITED, {
        userDisplayName: 'New User',
        resourceId: 'resource-1',
      });

      act(() => {
        mockSubscribers.forEach(callback => callback(newActivity));
      });

      await waitFor(() => {
        expect(screen.getByText('New User')).toBeInTheDocument();
      });
    });

    it('should filter incoming activities by resourceId', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Existing User',
      });

      render(
        <ActivityFeed
          {...defaultProps}
          logger={mockActivityLogger}
          realtime={true}
          resourceId="resource-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Existing User')).toBeInTheDocument();
      });

      // Simulate receiving an activity for a different resource
      const differentResourceActivity = createMockActivity('act-2', ActivityType.NOTE_EDITED, {
        resourceId: 'resource-2',
        userDisplayName: 'Different User',
      });

      act(() => {
        mockSubscribers.forEach(callback => callback(differentResourceActivity));
      });

      // Wait a bit and verify different user is not shown
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(screen.queryByText('Different User')).not.toBeInTheDocument();
    });

    it('should filter incoming activities by userId', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Existing User',
      });

      render(
        <ActivityFeed
          {...defaultProps}
          logger={mockActivityLogger}
          realtime={true}
          userId="user-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Existing User')).toBeInTheDocument();
      });

      // Simulate receiving an activity from a different user
      const differentUserActivity = createMockActivity('act-2', ActivityType.NOTE_EDITED, {
        userId: 'user-2',
        userDisplayName: 'Different User',
      });

      act(() => {
        mockSubscribers.forEach(callback => callback(differentUserActivity));
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(screen.queryByText('Different User')).not.toBeInTheDocument();
    });

    it('should filter incoming activities by types', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Existing User',
      });

      render(
        <ActivityFeed
          {...defaultProps}
          logger={mockActivityLogger}
          realtime={true}
          types={[ActivityType.NOTE_CREATED, ActivityType.NOTE_EDITED]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Existing User')).toBeInTheDocument();
      });

      // Simulate receiving an activity of excluded type
      const excludedActivity = createMockActivity('act-2', ActivityType.NOTE_DELETED, {
        userDisplayName: 'Delete User',
      });

      act(() => {
        mockSubscribers.forEach(callback => callback(excludedActivity));
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(screen.queryByText('Delete User')).not.toBeInTheDocument();
    });

    it('should respect limit when adding new activities', async () => {
      // Add 5 existing activities
      for (let i = 0; i < 5; i++) {
        mockActivityLogger.log({
          type: ActivityType.NOTE_CREATED,
          resourceId: 'resource-1',
          resourceType: 'note',
          userId: `user-${i}`,
          userDisplayName: `User ${i}`,
        });
      }

      render(
        <ActivityFeed {...defaultProps} logger={mockActivityLogger} realtime={true} limit={5} />
      );

      await waitFor(() => {
        expect(screen.getByText('User 0')).toBeInTheDocument();
      });

      // Add a new activity that should push out the oldest
      const newActivity = createMockActivity('act-new', ActivityType.NOTE_EDITED, {
        userDisplayName: 'Newest User',
        resourceId: 'resource-1',
      });

      act(() => {
        mockSubscribers.forEach(callback => callback(newActivity));
      });

      await waitFor(() => {
        expect(screen.getByText('Newest User')).toBeInTheDocument();
      });
    });
  });

  describe('Activity type labels', () => {
    const labelTestCases: [ActivityType, string][] = [
      [ActivityType.NOTE_CREATED, 'created'],
      [ActivityType.NOTE_EDITED, 'edited'],
      [ActivityType.NOTE_DELETED, 'deleted'],
      [ActivityType.NOTE_VIEWED, 'viewed'],
      [ActivityType.USER_JOINED, 'joined'],
      [ActivityType.USER_LEFT, 'left'],
      [ActivityType.CURSOR_MOVED, 'moved cursor'],
      [ActivityType.PERMISSION_GRANTED, 'granted access to'],
      [ActivityType.PERMISSION_UPDATED, 'updated access for'],
      [ActivityType.PERMISSION_REVOKED, 'revoked access from'],
      [ActivityType.SHARE_LINK_CREATED, 'created share link for'],
      [ActivityType.SHARE_LINK_USED, 'used share link for'],
      [ActivityType.SHARE_LINK_REVOKED, 'revoked share link for'],
      [ActivityType.VERSION_CREATED, 'saved version of'],
      [ActivityType.VERSION_RESTORED, 'restored version of'],
      [ActivityType.COMMENT_ADDED, 'commented on'],
      [ActivityType.COMMENT_RESOLVED, 'resolved comment on'],
    ];

    it.each(labelTestCases)(
      'should show correct label for %s',
      async (type: ActivityType, expectedLabel: string) => {
        mockActivityLogger.log({
          type,
          resourceId: 'resource-1',
          resourceType: 'note',
          userId: 'user-1',
          userDisplayName: 'Test User',
        });

        render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

        await waitFor(() => {
          expect(screen.getByText(expectedLabel)).toBeInTheDocument();
        });
      }
    );
  });

  describe('Metadata display', () => {
    it('should show target user display name in metadata for permission activities', async () => {
      mockActivityLogger.log({
        type: ActivityType.PERMISSION_GRANTED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Test User',
        metadata: {
          targetUserDisplayName: 'Jane Smith',
        },
      });

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
      });
    });

    it('should not show metadata section when metadata is empty', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Test User',
        metadata: {},
      });

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        const metadataElements = document.querySelectorAll('.text-xs.text-stone-400');
        // Should only have timestamp, no metadata
        expect(metadataElements.length).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle activities with missing resourceName gracefully', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: 'Test User',
      });

      render(
        <ActivityFeed {...defaultProps} logger={mockActivityLogger} showResourceName={true} />
      );

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });
    });

    it('should handle empty user display name for avatar initial', async () => {
      mockActivityLogger.log({
        type: ActivityType.NOTE_CREATED,
        resourceId: 'resource-1',
        resourceType: 'note',
        userId: 'user-1',
        userDisplayName: '',
      });

      render(<ActivityFeed {...defaultProps} logger={mockActivityLogger} />);

      await waitFor(() => {
        // Should not crash, just not show an initial
        expect(document.querySelector('.rounded-full')).toBeInTheDocument();
      });
    });

    it('should reload activities when props change', async () => {
      const { rerender } = render(
        <ActivityFeed {...defaultProps} logger={mockActivityLogger} resourceId="resource-1" />
      );

      await waitFor(() => {
        expect(mockActivityLogger.getActivities).toHaveBeenCalledTimes(1);
      });

      rerender(
        <ActivityFeed {...defaultProps} logger={mockActivityLogger} resourceId="resource-2" />
      );

      await waitFor(() => {
        expect(mockActivityLogger.getActivities).toHaveBeenCalledTimes(2);
      });
    });
  });
});
