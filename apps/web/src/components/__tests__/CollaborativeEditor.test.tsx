/**
 * Tests for CollaborativeEditor components
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollaborationPresence } from '../CollaborationPresence';
import { CollaborationCursors } from '../CollaborationCursors';
import type { UserPresence } from '../../hooks/useCollaboration';

// Mock hooks
vi.mock('../../hooks/useCollaboration', () => ({
  useCollaboration: vi.fn(),
}));

describe('CollaborationPresence', () => {
  const mockLocalUser: UserPresence = {
    userId: 'user-1',
    displayName: 'Local User',
    color: '#f59e0b',
    status: 'active',
    lastSeen: Date.now(),
  };

  const mockRemoteUsers: UserPresence[] = [
    {
      userId: 'user-2',
      displayName: 'Alice',
      color: '#10b981',
      status: 'active',
      lastSeen: Date.now(),
    },
    {
      userId: 'user-3',
      displayName: 'Bob',
      color: '#3b82f6',
      status: 'idle',
      lastSeen: Date.now(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render local user avatar', () => {
    render(<CollaborationPresence users={[]} localUser={mockLocalUser} isConnected={true} />);

    // Should show local user's initial
    expect(screen.getByText('L')).toBeInTheDocument();
  });

  it('should render remote user avatars', () => {
    render(
      <CollaborationPresence users={mockRemoteUsers} localUser={mockLocalUser} isConnected={true} />
    );

    // Should show remote users' initials
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('should show connection status', () => {
    render(
      <CollaborationPresence
        users={[]}
        localUser={mockLocalUser}
        isConnected={true}
        showStatus={true}
      />
    );

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should show disconnected status', () => {
    render(
      <CollaborationPresence
        users={[]}
        localUser={mockLocalUser}
        isConnected={false}
        showStatus={true}
      />
    );

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('should show remaining count when users exceed maxVisible', () => {
    const manyUsers: UserPresence[] = Array.from({ length: 6 }, (_, i) => ({
      userId: `user-${i + 2}`,
      displayName: `User ${i + 2}`,
      color: '#f59e0b',
      status: 'active' as const,
      lastSeen: Date.now(),
    }));

    render(
      <CollaborationPresence
        users={manyUsers}
        localUser={mockLocalUser}
        isConnected={true}
        maxVisible={4}
      />
    );

    // Should show +2 for remaining users
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('should filter out offline users', () => {
    const usersWithOffline: UserPresence[] = [
      ...mockRemoteUsers,
      {
        userId: 'user-4',
        displayName: 'Offline User',
        color: '#8b5cf6',
        status: 'offline',
        lastSeen: Date.now(),
      },
    ];

    render(
      <CollaborationPresence
        users={usersWithOffline}
        localUser={mockLocalUser}
        isConnected={true}
      />
    );

    // Should not show offline user
    expect(screen.queryByText('O')).not.toBeInTheDocument();
  });

  it('should show editing count text', () => {
    render(
      <CollaborationPresence users={mockRemoteUsers} localUser={mockLocalUser} isConnected={true} />
    );

    expect(screen.getByText(/2 others editing/)).toBeInTheDocument();
  });

  it('should show single user editing text', () => {
    render(
      <CollaborationPresence
        users={[mockRemoteUsers[0]]}
        localUser={mockLocalUser}
        isConnected={true}
      />
    );

    expect(screen.getByText(/Alice is editing/)).toBeInTheDocument();
  });
});

describe('CollaborationCursors', () => {
  const mockEditorRef = {
    current: null,
  };

  const mockUsersWithCursors: UserPresence[] = [
    {
      userId: 'user-2',
      displayName: 'Alice',
      color: '#10b981',
      status: 'active',
      lastSeen: Date.now(),
      cursor: {
        userId: 'user-2',
        position: 10,
        timestamp: Date.now(),
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when no users have cursors', () => {
    const { container } = render(<CollaborationCursors users={[]} editorRef={mockEditorRef} />);

    expect(container.firstChild).toBeNull();
  });

  it('should not render for offline users', () => {
    const offlineUser: UserPresence[] = [
      {
        ...mockUsersWithCursors[0],
        status: 'offline',
      },
    ];

    const { container } = render(
      <CollaborationCursors users={offlineUser} editorRef={mockEditorRef} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render cursor overlay for users with cursors', () => {
    // Create a mock editor element
    const mockEditor = document.createElement('div');
    mockEditorRef.current = mockEditor;

    render(
      <CollaborationCursors
        users={mockUsersWithCursors}
        editorRef={mockEditorRef}
        showLabels={true}
      />
    );

    // Should render cursor container
    const cursorContainer = screen.getByText('Alice').closest('div');
    expect(cursorContainer).toBeInTheDocument();
  });
});
