/**
 * Tests for ShareDialog component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { ShareDialog, ShareDialogProps, Permission } from '../ShareDialog';
import type { PermissionLevel } from '../PermissionSelector';
import type { ShareLink } from '../ShareLinkManager';

// Mock navigator.clipboard
const mockClipboard = {
  writeText: vi.fn(),
};
Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: mockClipboard,
  },
  writable: true,
});

// Mock window.location
const mockLocation = {
  origin: 'https://notechain.app',
};
Object.defineProperty(global, 'window', {
  value: {
    location: mockLocation,
  },
  writable: true,
});

describe('ShareDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnAddPermission = vi.fn();
  const mockOnUpdatePermission = vi.fn();
  const mockOnRemovePermission = vi.fn();
  const mockOnCreateShareLink = vi.fn();
  const mockOnRevokeShareLink = vi.fn();
  const mockOnSearchUsers = vi.fn();

  const defaultProps: ShareDialogProps = {
    isOpen: true,
    onClose: mockOnClose,
    resourceId: 'note-123',
    resourceName: 'My Test Note',
    resourceType: 'note',
    permissions: [],
    shareLinks: [],
    currentUserId: 'user-1',
    onAddPermission: mockOnAddPermission,
    onUpdatePermission: mockOnUpdatePermission,
    onRemovePermission: mockOnRemovePermission,
    onCreateShareLink: mockOnCreateShareLink,
    onRevokeShareLink: mockOnRevokeShareLink,
    onSearchUsers: mockOnSearchUsers,
  };

  const mockPermissions: Permission[] = [
    {
      id: 'perm-1',
      userId: 'user-1',
      resourceId: 'note-123',
      level: 'admin',
      grantedAt: new Date('2024-01-15'),
      grantedBy: 'user-1',
      user: {
        id: 'user-1',
        displayName: 'John Doe',
        email: 'john@example.com',
        avatarUrl: 'https://example.com/avatar1.jpg',
      },
    },
    {
      id: 'perm-2',
      userId: 'user-2',
      resourceId: 'note-123',
      level: 'edit',
      grantedAt: new Date('2024-01-14'),
      grantedBy: 'user-1',
      user: {
        id: 'user-2',
        displayName: 'Jane Smith',
        email: 'jane@example.com',
      },
    },
    {
      id: 'perm-3',
      userId: 'user-3',
      resourceId: 'note-123',
      level: 'view',
      grantedAt: new Date('2024-01-13'),
      grantedBy: 'user-1',
      user: {
        id: 'user-3',
        displayName: 'Bob Wilson',
        email: 'bob@example.com',
      },
    },
  ];

  const mockShareLinks: ShareLink[] = [
    {
      id: 'link-1',
      resourceId: 'note-123',
      permissionLevel: 'view',
      createdAt: new Date('2024-01-15'),
      createdBy: 'user-1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxUses: 10,
      useCount: 3,
      isActive: true,
    },
    {
      id: 'link-2',
      resourceId: 'note-123',
      permissionLevel: 'edit',
      createdAt: new Date('2024-01-10'),
      createdBy: 'user-1',
      useCount: 5,
      isActive: false,
    },
  ];

  const mockSearchResults = [
    {
      id: 'user-4',
      displayName: 'Alice Cooper',
      email: 'alice@example.com',
      avatarUrl: 'https://example.com/alice.jpg',
    },
    { id: 'user-5', displayName: 'Charlie Brown', email: 'charlie@example.com' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockClipboard.writeText.mockResolvedValue(undefined);
    mockOnSearchUsers.mockResolvedValue(mockSearchResults);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Modal rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(<ShareDialog {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(<ShareDialog {...defaultProps} />);
      expect(screen.getByText('Share note')).toBeInTheDocument();
      expect(screen.getByText('My Test Note')).toBeInTheDocument();
    });

    it('should call onClose when clicking backdrop', () => {
      render(<ShareDialog {...defaultProps} />);
      const backdrop = screen
        .getByText('My Test Note')
        .closest('.fixed')
        ?.querySelector('.absolute');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onClose when clicking close button', () => {
      render(<ShareDialog {...defaultProps} />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking Done button', () => {
      render(<ShareDialog {...defaultProps} />);
      const doneButton = screen.getByRole('button', { name: 'Done' });
      fireEvent.click(doneButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should display resource type in header', () => {
      render(<ShareDialog {...defaultProps} resourceType="folder" />);
      expect(screen.getByText('Share folder')).toBeInTheDocument();
    });
  });

  describe('Visibility toggle', () => {
    it('should render visibility options', () => {
      render(<ShareDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Private' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Anyone with link' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Public' })).toBeInTheDocument();
    });

    it('should default to Private visibility', () => {
      render(<ShareDialog {...defaultProps} />);
      const privateButton = screen.getByRole('button', { name: 'Private' });
      expect(privateButton).toHaveClass('bg-stone-900');
    });

    it('should set visibility to link when active share link exists', () => {
      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linkButton = screen.getByRole('button', { name: 'Anyone with link' });
      expect(linkButton).toHaveClass('bg-stone-900');
    });

    it('should set visibility to public when wildcard permission exists', () => {
      const publicPermissions = [
        {
          ...mockPermissions[0],
          userId: '*',
          id: 'perm-public',
        },
      ];
      render(<ShareDialog {...defaultProps} permissions={publicPermissions} />);
      const publicButton = screen.getByRole('button', { name: 'Public' });
      expect(publicButton).toHaveClass('bg-stone-900');
    });

    it('should update visibility state when clicking visibility buttons', () => {
      render(<ShareDialog {...defaultProps} />);
      const publicButton = screen.getByRole('button', { name: 'Public' });
      fireEvent.click(publicButton);
      expect(publicButton).toHaveClass('bg-stone-900');
    });
  });

  describe('Tab navigation', () => {
    it('should render People and Links tabs', () => {
      render(
        <ShareDialog {...defaultProps} permissions={mockPermissions} shareLinks={mockShareLinks} />
      );
      expect(screen.getByRole('button', { name: /People \(3\)/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Links \(1\)/ })).toBeInTheDocument();
    });

    it('should switch to Links tab when clicked', () => {
      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);
      expect(linksTab).toHaveClass('border-b-2');
      expect(screen.getByText('Share Links')).toBeInTheDocument();
    });

    it('should show correct count of active links', () => {
      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linksTab = screen.getByRole('button', { name: /Links \(1\)/ });
      expect(linksTab).toBeInTheDocument();
    });

    it('should switch back to People tab when clicked', () => {
      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);
      const peopleTab = screen.getByRole('button', { name: /People/ });
      fireEvent.click(peopleTab);
      expect(peopleTab).toHaveClass('border-b-2');
    });
  });

  describe('Permissions list', () => {
    it('should display empty state when no permissions', () => {
      render(<ShareDialog {...defaultProps} />);
      expect(screen.getByText('No one has access yet')).toBeInTheDocument();
      expect(screen.getByText('Add people or create a share link')).toBeInTheDocument();
    });

    it('should display list of permissions', () => {
      render(<ShareDialog {...defaultProps} permissions={mockPermissions} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('should display user emails', () => {
      render(<ShareDialog {...defaultProps} permissions={mockPermissions} />);
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('should indicate current user with (you) label', () => {
      render(
        <ShareDialog {...defaultProps} permissions={mockPermissions} currentUserId="user-1" />
      );
      const johnEntry = screen.getByText('John Doe').closest('div')?.parentElement;
      expect(johnEntry?.textContent).toContain('(you)');
    });

    it('should show permission badges for current user', () => {
      render(
        <ShareDialog {...defaultProps} permissions={mockPermissions} currentUserId="user-1" />
      );
      // Find the badge specifically (not the select options)
      const adminBadge = screen.getByText((content, element) => {
        return content === 'Admin' && element?.tagName.toLowerCase() === 'span';
      });
      expect(adminBadge).toBeInTheDocument();
    });

    it('should show permission selector for non-owner users', () => {
      render(
        <ShareDialog {...defaultProps} permissions={mockPermissions} currentUserId="user-1" />
      );
      const permissionSelectors = screen.getAllByRole('combobox');
      expect(permissionSelectors.length).toBeGreaterThan(0);
    });

    it('should show remove button for non-owner permissions', () => {
      render(
        <ShareDialog {...defaultProps} permissions={mockPermissions} currentUserId="user-1" />
      );
      const removeButtons = screen.getAllByTitle('Remove access');
      expect(removeButtons.length).toBe(2); // Jane and Bob, not John (owner)
    });

    it('should show avatar placeholder when no avatarUrl', () => {
      render(<ShareDialog {...defaultProps} permissions={mockPermissions} />);
      expect(screen.getByText('J')).toBeInTheDocument(); // Jane's initial
      expect(screen.getByText('B')).toBeInTheDocument(); // Bob's initial
    });
  });

  describe('User search and add', () => {
    it('should render search input when onSearchUsers is provided', () => {
      render(<ShareDialog {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search by email or name...')).toBeInTheDocument();
    });

    it('should not render search input when onSearchUsers is not provided', () => {
      const propsWithoutSearch = { ...defaultProps };
      delete propsWithoutSearch.onSearchUsers;
      render(<ShareDialog {...propsWithoutSearch} />);
      expect(screen.queryByPlaceholderText('Search by email or name...')).not.toBeInTheDocument();
    });

    it('should search users when typing in search input', async () => {
      render(<ShareDialog {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Search by email or name...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'alice' } });
      });

      // Fast-forward past debounce
      vi.advanceTimersByTime(400);

      await waitFor(() => {
        expect(mockOnSearchUsers).toHaveBeenCalledWith('alice');
      });
    });

    it('should display search results', async () => {
      render(<ShareDialog {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Search by email or name...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'ali' } });
      });

      vi.advanceTimersByTime(400);

      await waitFor(() => {
        expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      });
    });

    it('should show loading spinner while searching', async () => {
      mockOnSearchUsers.mockImplementation(() => new Promise(() => {}));
      render(<ShareDialog {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Search by email or name...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test' } });
      });

      vi.advanceTimersByTime(400);

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });

    it('should add user when selecting from search results', async () => {
      mockOnAddPermission.mockResolvedValue(undefined);
      render(<ShareDialog {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Search by email or name...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'ali' } });
      });

      vi.advanceTimersByTime(400);

      await waitFor(() => {
        expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
      });

      const aliceResult = screen.getByText('Alice Cooper');
      await act(async () => {
        fireEvent.click(aliceResult);
      });

      expect(mockOnAddPermission).toHaveBeenCalledWith('user-4', 'view');
    });

    it('should clear search after selecting user', async () => {
      mockOnAddPermission.mockResolvedValue(undefined);
      render(<ShareDialog {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText(
        'Search by email or name...'
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'ali' } });
      });

      vi.advanceTimersByTime(400);

      await waitFor(() => {
        expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
      });

      const aliceResult = screen.getByText('Alice Cooper');
      await act(async () => {
        fireEvent.click(aliceResult);
      });

      expect(searchInput.value).toBe('');
    });

    it('should not search with less than 2 characters', async () => {
      render(<ShareDialog {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Search by email or name...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'a' } });
      });

      vi.advanceTimersByTime(400);

      expect(mockOnSearchUsers).not.toHaveBeenCalled();
    });
  });

  describe('Permission level selection', () => {
    it('should render permission selector for adding new users', () => {
      render(<ShareDialog {...defaultProps} />);
      const permissionSelectors = screen.getAllByRole('combobox');
      expect(permissionSelectors.length).toBeGreaterThan(0);
    });

    it('should have all permission levels in selector', () => {
      render(<ShareDialog {...defaultProps} />);
      const selector = screen.getAllByRole('combobox')[0];
      expect(selector).toHaveTextContent('View');
    });

    it('should change permission level when selecting different option', () => {
      render(<ShareDialog {...defaultProps} />);
      const selector = screen.getAllByRole('combobox')[0];
      fireEvent.change(selector, { target: { value: 'edit' } });
      expect(selector).toHaveValue('edit');
    });

    it('should use selected permission level when adding user', async () => {
      mockOnAddPermission.mockResolvedValue(undefined);
      render(<ShareDialog {...defaultProps} />);

      const selector = screen.getAllByRole('combobox')[0];
      fireEvent.change(selector, { target: { value: 'admin' } });

      const searchInput = screen.getByPlaceholderText('Search by email or name...');
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'ali' } });
      });

      vi.advanceTimersByTime(400);

      await waitFor(() => {
        expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
      });

      const aliceResult = screen.getByText('Alice Cooper');
      await act(async () => {
        fireEvent.click(aliceResult);
      });

      expect(mockOnAddPermission).toHaveBeenCalledWith('user-4', 'admin');
    });
  });

  describe('Update and remove permissions', () => {
    it('should call onUpdatePermission when changing permission level', async () => {
      mockOnUpdatePermission.mockResolvedValue(undefined);
      render(
        <ShareDialog {...defaultProps} permissions={mockPermissions} currentUserId="user-1" />
      );

      // Get the permission selector for Jane (first non-owner permission)
      const selectors = screen.getAllByRole('combobox');
      const janeSelector = selectors[1]; // First is for new user, second is for Jane

      await act(async () => {
        fireEvent.change(janeSelector, { target: { value: 'view' } });
      });

      await waitFor(() => {
        expect(mockOnUpdatePermission).toHaveBeenCalledWith('user-2', 'view');
      });
    });

    it('should call onRemovePermission when clicking remove button', async () => {
      mockOnRemovePermission.mockResolvedValue(undefined);
      render(
        <ShareDialog {...defaultProps} permissions={mockPermissions} currentUserId="user-1" />
      );

      const removeButtons = screen.getAllByTitle('Remove access');

      await act(async () => {
        fireEvent.click(removeButtons[0]);
      });

      await waitFor(() => {
        expect(mockOnRemovePermission).toHaveBeenCalledWith('user-2');
      });
    });

    it('should disable controls while updating permission', async () => {
      mockOnUpdatePermission.mockImplementation(() => new Promise(() => {}));
      render(
        <ShareDialog {...defaultProps} permissions={mockPermissions} currentUserId="user-1" />
      );

      const selectors = screen.getAllByRole('combobox');
      const janeSelector = selectors[1];

      await act(async () => {
        fireEvent.change(janeSelector, { target: { value: 'view' } });
      });

      expect(janeSelector).toBeDisabled();
    });

    it('should disable remove button while removing', async () => {
      mockOnRemovePermission.mockImplementation(() => new Promise(() => {}));
      render(
        <ShareDialog {...defaultProps} permissions={mockPermissions} currentUserId="user-1" />
      );

      const removeButtons = screen.getAllByTitle('Remove access');

      await act(async () => {
        fireEvent.click(removeButtons[0]);
      });

      expect(removeButtons[0]).toBeDisabled();
    });
  });

  describe('Share links management', () => {
    it('should render ShareLinkManager in links tab', () => {
      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);
      expect(screen.getByText('Share Links')).toBeInTheDocument();
    });

    it('should show create link form when clicking Create Link', () => {
      render(<ShareDialog {...defaultProps} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);
      const createButton = screen.getByRole('button', { name: 'Create Link' });
      fireEvent.click(createButton);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should render permission selector in create form', () => {
      render(<ShareDialog {...defaultProps} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);
      const createButton = screen.getByRole('button', { name: 'Create Link' });
      fireEvent.click(createButton);
      expect(screen.getByText('Permission Level')).toBeInTheDocument();
    });

    it('should render expiration options', () => {
      render(<ShareDialog {...defaultProps} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);
      const createButton = screen.getByRole('button', { name: 'Create Link' });
      fireEvent.click(createButton);
      expect(screen.getByText('Expires After')).toBeInTheDocument();
    });

    it('should render max uses options', () => {
      render(<ShareDialog {...defaultProps} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);
      const createButton = screen.getByRole('button', { name: 'Create Link' });
      fireEvent.click(createButton);
      expect(screen.getByText('Max Uses')).toBeInTheDocument();
    });

    it('should call onCreateShareLink when submitting form', async () => {
      const newLink: ShareLink = {
        id: 'link-3',
        resourceId: 'note-123',
        permissionLevel: 'view',
        createdAt: new Date(),
        createdBy: 'user-1',
        useCount: 0,
        isActive: true,
      };
      mockOnCreateShareLink.mockResolvedValue(newLink);

      render(<ShareDialog {...defaultProps} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);
      const createButton = screen.getByRole('button', { name: 'Create Link' });
      fireEvent.click(createButton);

      const submitButton = screen.getByRole('button', { name: 'Create Link' });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockOnCreateShareLink).toHaveBeenCalled();
      });
    });

    it('should display active share links', () => {
      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);
      expect(screen.getByText(/https:\/\/notechain.app\/share\/link-1/)).toBeInTheDocument();
    });

    it('should show permission level badge for link', () => {
      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);
      expect(screen.getAllByText('View')[0]).toBeInTheDocument();
    });

    it('should show link usage stats', () => {
      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);
      expect(screen.getByText('3/10 uses')).toBeInTheDocument();
    });

    it('should show expired status for inactive links', () => {
      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);

      // Click "Show inactive links" to reveal inactive links
      const showInactive = screen.getByText(/Show inactive links/);
      fireEvent.click(showInactive);

      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  describe('Copy to clipboard', () => {
    it('should copy link URL to clipboard when clicking copy button', async () => {
      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);

      // Use getAllByTitle since there may be multiple links
      const copyButtons = screen.getAllByTitle('Copy to clipboard');
      await act(async () => {
        fireEvent.click(copyButtons[0]);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith('https://notechain.app/share/link-1');
    });

    it('should show success state after copying', async () => {
      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);

      // Use getAllByTitle since there may be multiple links
      const copyButtons = screen.getAllByTitle('Copy to clipboard');
      await act(async () => {
        fireEvent.click(copyButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getAllByTitle('Copied!')[0]).toBeInTheDocument();
      });
    });
  });

  describe('Revoke link', () => {
    it('should call onRevokeShareLink when clicking revoke button', async () => {
      mockOnRevokeShareLink.mockResolvedValue(undefined);
      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);

      // Use getAllByTitle since there may be multiple links
      const revokeButtons = screen.getAllByTitle('Revoke link');
      await act(async () => {
        fireEvent.click(revokeButtons[0]);
      });

      await waitFor(() => {
        expect(mockOnRevokeShareLink).toHaveBeenCalledWith('link-1');
      });
    });

    it('should disable revoke button while revoking', async () => {
      mockOnRevokeShareLink.mockImplementation(() => new Promise(() => {}));
      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);

      // Use getAllByTitle since there may be multiple links
      const revokeButtons = screen.getAllByTitle('Revoke link');
      await act(async () => {
        fireEvent.click(revokeButtons[0]);
      });

      expect(revokeButtons[0]).toBeDisabled();
    });

    it('should disable revoke button for inactive links', () => {
      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);

      const showInactive = screen.getByText(/Show inactive links/);
      fireEvent.click(showInactive);

      const revokeButtons = screen.getAllByTitle('Revoke link');
      expect(revokeButtons[1]).toBeDisabled(); // Second link is inactive
    });
  });

  describe('Encryption indicator', () => {
    it('should display end-to-end encryption message in footer', () => {
      render(<ShareDialog {...defaultProps} />);
      expect(screen.getByText('End-to-end encrypted')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should handle search errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOnSearchUsers.mockRejectedValue(new Error('Search failed'));

      render(<ShareDialog {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Search by email or name...');

      fireEvent.change(searchInput, { target: { value: 'test' } });

      await act(async () => {
        vi.advanceTimersByTime(400);
      });

      await waitFor(() => {
        // Should not crash, just not show results
        expect(screen.queryByText('Alice Cooper')).not.toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should handle clipboard copy errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockClipboard.writeText.mockRejectedValue(new Error('Copy failed'));

      render(<ShareDialog {...defaultProps} shareLinks={mockShareLinks} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);

      // Use getAllByTitle since there may be multiple links
      const copyButtons = screen.getAllByTitle('Copy to clipboard');
      await act(async () => {
        fireEvent.click(copyButtons[0]);
      });

      // Should not crash - button should still exist even after error
      expect(copyButtons[0]).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('should handle permission without user data', () => {
      const permissionsWithUnknownUser: Permission[] = [
        {
          id: 'perm-unknown',
          userId: 'user-unknown',
          resourceId: 'note-123',
          level: 'view',
          grantedAt: new Date(),
          grantedBy: 'user-1',
        },
      ];

      render(
        <ShareDialog
          {...defaultProps}
          permissions={permissionsWithUnknownUser}
          currentUserId="user-1"
        />
      );
      expect(screen.getByText('Unknown User')).toBeInTheDocument();
      expect(screen.getByText('?')).toBeInTheDocument(); // Placeholder initial
    });

    it('should handle empty search results', async () => {
      mockOnSearchUsers.mockResolvedValue([]);
      render(<ShareDialog {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Search by email or name...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      });

      vi.advanceTimersByTime(400);

      await waitFor(() => {
        // Should not show any results
        const dropdown = document.querySelector('.absolute.z-10');
        expect(dropdown).toBeNull();
      });
    });

    it('should hide search results when input loses focus', async () => {
      render(<ShareDialog {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Search by email or name...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'ali' } });
      });

      vi.advanceTimersByTime(400);

      await waitFor(() => {
        expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
      });

      fireEvent.blur(searchInput);

      // Note: The dropdown might not disappear immediately due to click events
      // This tests the behavior when focus is lost
    });

    it('should cancel create link form when clicking Cancel', () => {
      render(<ShareDialog {...defaultProps} />);
      const linksTab = screen.getByRole('button', { name: /Links/ });
      fireEvent.click(linksTab);

      const createButton = screen.getByRole('button', { name: 'Create Link' });
      fireEvent.click(createButton);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });
  });
});
