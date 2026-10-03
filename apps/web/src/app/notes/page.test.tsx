import { beforeEach, describe, expect, test, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

interface TestNote {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
}

const notesMocks = vi.hoisted(() => ({
  user: { id: 'user-a', email: 'a@example.com' } as { id: string; email: string } | null,
  loadCachedNotes: vi.fn(),
  loadNotes: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/NoteEditor', () => ({ NoteEditor: () => <div /> }));
vi.mock('@/components/prdBuilder/PrdBuilderWizard', () => ({ PrdBuilderWizard: () => null }));

vi.mock('@/lib/supabase/UserProvider', () => ({
  useUser: () => ({ user: notesMocks.user }),
}));

vi.mock('@/lib/sync/useNotesSync', () => ({
  useNotesSync: () => ({
    loadCachedNotes: notesMocks.loadCachedNotes,
    loadNotes: notesMocks.loadNotes,
    syncCreateNote: vi.fn(),
    syncUpdateNote: vi.fn(),
    syncDeleteNote: vi.fn(),
    deleteLockedNotes: vi.fn(),
    subscribeToRemoteNoteChanges: () => () => {},
    isSyncEnabled: false,
    isEncryptionReady: true,
    isLoading: false,
    loadError: null,
  }),
}));

import NotesPage from './page';

const note = (id: string, title: string): TestNote => ({
  id,
  title,
  content: '<p>body</p>',
  updatedAt: new Date('2026-10-01'),
});

describe('NotesPage account switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notesMocks.user = { id: 'user-a', email: 'a@example.com' };
  });

  test("never shows the previous account's notes after a switch, even when its load finishes late", async () => {
    let finishLoadForA!: (notes: TestNote[]) => void;
    notesMocks.loadCachedNotes.mockResolvedValueOnce([note('a1', 'Account A note')]);
    notesMocks.loadNotes.mockReturnValueOnce(
      new Promise<TestNote[]>(resolve => {
        finishLoadForA = resolve;
      })
    );

    const { rerender } = render(<NotesPage />);
    expect((await screen.findAllByText('Account A note')).length).toBeGreaterThan(0);

    notesMocks.user = { id: 'user-b', email: 'b@example.com' };
    notesMocks.loadCachedNotes.mockResolvedValueOnce([]);
    notesMocks.loadNotes.mockResolvedValueOnce([note('b1', 'Account B note')]);
    rerender(<NotesPage />);

    await waitFor(() => expect(screen.queryByText('Account A note')).toBeNull());
    expect((await screen.findAllByText('Account B note')).length).toBeGreaterThan(0);

    await act(async () => {
      finishLoadForA([note('a1', 'Account A note'), note('a2', 'Another A note')]);
    });

    expect(screen.queryByText('Account A note')).toBeNull();
    expect(screen.queryByText('Another A note')).toBeNull();
    expect(screen.getAllByText('Account B note').length).toBeGreaterThan(0);
  });

  test('loads from the server once per account, not on every render', async () => {
    notesMocks.loadCachedNotes.mockResolvedValue([note('a1', 'Account A note')]);
    notesMocks.loadNotes.mockResolvedValue([note('a1', 'Account A note')]);

    const { rerender } = render(<NotesPage />);
    await screen.findAllByText('Account A note');
    rerender(<NotesPage />);
    rerender(<NotesPage />);

    expect(notesMocks.loadNotes).toHaveBeenCalledTimes(1);
  });
});
