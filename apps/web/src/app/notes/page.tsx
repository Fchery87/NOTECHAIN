'use client';

import { Suspense, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import AppLayout from '@/components/AppLayout';
import { NoteEditor } from '@/components/NoteEditor';
import { PrdBuilderWizard } from '@/components/prdBuilder/PrdBuilderWizard';
import { noteHref, notePlainText } from '@/lib/notes/noteLinks';
import { ArrowLeftIcon, LockIcon, PlusIcon, SearchIcon } from '@/components/appNav';

import { NoteCard, type NoteCollaborator } from '@notechain/ui-components';
import { useNotesSync } from '@/lib/sync/useNotesSync';
import { LOCKED_NOTE_TITLE } from '@/lib/sync/noteSyncOperations';
import {
  applyRemoteNoteDelete,
  applyRemoteNoteUpsert,
  removeIdFromSet,
} from '@/lib/sync/remoteNoteApply';
import { useUser } from '@/lib/supabase/UserProvider';
import { markdownToNoteHtml } from '@/lib/prdBuilder/prdBuilder';

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
  ownerId: string;
  ownerName: string;
  collaborators: NoteCollaborator[];
  version?: number;
}

function formatEdited(date: Date) {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return 'Edited just now';
  if (minutes < 60) return `Edited ${minutes} min ago`;
  return `Edited ${new Date(date).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export default function NotesPage() {
  return (
    <Suspense fallback={null}>
      <NotesWorkspace />
    </Suspense>
  );
}

function NotesWorkspace() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNoteId = searchParams.get('id');
  const wantsNewNote = searchParams.get('new') === '1';
  const {
    loadCachedNotes,
    loadNotes,
    syncCreateNote,
    syncUpdateNote,
    syncDeleteNote,
    deleteLockedNotes,
    subscribeToRemoteNoteChanges,
    isSyncEnabled,
    isEncryptionReady,
    isLoading,
    loadError,
  } = useNotesSync();

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [prdBuilderNotes, setPrdBuilderNotes] = useState<Note[] | null>(null);
  const [query, setQuery] = useState('');
  const [mobilePane, setMobilePane] = useState<'list' | 'editor'>('list');
  const titleRef = useRef<HTMLInputElement>(null);
  const focusTitleOnSelect = useRef(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Locked notes state
  const [lockedNoteIds, setLockedNoteIds] = useState<Set<string>>(new Set());
  const [showLockedNotes, setShowLockedNotes] = useState(false);

  const currentUser = {
    id: user?.id || 'user-1',
    displayName: user?.email?.split('@')[0] || 'You',
    avatarUrl: undefined,
  };

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load cached notes first, then refresh from Supabase when encryption is ready.
  // `loadedForUser` (a ref, not state) stops the effect from cancelling its own
  // refresh, and `loadSeq` drops results from an older session, so a late load
  // for a previous account can never replace the current account's notes.
  const loadedForUser = useRef<string | null>(null);
  const loadSeq = useRef(0);
  useEffect(() => {
    const clearWorkspace = () => {
      setHasLoaded(false);
      setNotes(prev => (prev.length > 0 ? [] : prev));
      setSelectedNoteId(null);
      setLockedNoteIds(prev => (prev.size > 0 ? new Set() : prev));
      setSelectedIds(prev => (prev.size > 0 ? new Set() : prev));
    };

    if (!isEncryptionReady || !user?.id) {
      loadedForUser.current = null;
      loadSeq.current += 1;
      clearWorkspace();
      return;
    }
    if (loadedForUser.current === user.id) return;
    // Switching straight from one account to another: never show the old notes.
    if (loadedForUser.current !== null) clearWorkspace();
    loadedForUser.current = user.id;
    const seq = ++loadSeq.current;
    const isCurrent = () => isMounted.current && seq === loadSeq.current;

    const applyLoadedNotes = (
      loaded: Array<Omit<Note, 'ownerId' | 'ownerName' | 'collaborators'>>
    ) => {
      if (!isCurrent()) return;

      // Identify locked notes (those with key mismatch placeholder)
      const lockedIds = new Set<string>();
      const normalNotes: Note[] = [];

      for (const n of loaded) {
        if (n.title === LOCKED_NOTE_TITLE) {
          lockedIds.add(n.id);
        }

        normalNotes.push({
          ...n,
          ownerId: user?.id || '',
          ownerName: currentUser.displayName,
          collaborators: [],
        });
      }

      setLockedNoteIds(lockedIds);
      setNotes(normalNotes);

      setSelectedNoteId(current => {
        if (current && normalNotes.some(note => note.id === current)) {
          return current;
        }

        const firstNormal = normalNotes.find(n => !lockedIds.has(n.id));
        return firstNormal?.id ?? normalNotes[0]?.id ?? null;
      });
    };

    const load = async () => {
      try {
        const cached = await loadCachedNotes();
        if (cached.length > 0) {
          applyLoadedNotes(cached);
        }

        const refreshed = await loadNotes();
        applyLoadedNotes(refreshed);
      } finally {
        if (isCurrent()) setHasLoaded(true);
      }
    };

    load();
  }, [isEncryptionReady, loadCachedNotes, loadNotes, user?.id, currentUser.displayName]);

  // Apply note changes that arrive from another browser session/device.
  useEffect(() => {
    if (!isSyncEnabled || !isEncryptionReady) return;

    return subscribeToRemoteNoteChanges(change => {
      if (change.operationType === 'delete') {
        setNotes(prev => {
          const remaining = applyRemoteNoteDelete(prev, change.noteId);
          setSelectedNoteId(current =>
            current === change.noteId ? (remaining[0]?.id ?? null) : current
          );
          return remaining;
        });
        setLockedNoteIds(prev => removeIdFromSet(prev, change.noteId));
        setSelectedIds(prev => removeIdFromSet(prev, change.noteId));
        return;
      }

      if (!change.note) return;

      const remoteNote: Note = {
        ...change.note,
        ownerId: user?.id || '',
        ownerName: currentUser.displayName,
        collaborators: [],
      };

      setLockedNoteIds(prev => {
        const next = new Set(prev);
        next.delete(remoteNote.id);
        return next;
      });

      setNotes(prev => applyRemoteNoteUpsert(prev, remoteNote, change.version));
    });
  }, [
    isSyncEnabled,
    isEncryptionReady,
    subscribeToRemoteNoteChanges,
    user?.id,
    currentUser.displayName,
  ]);

  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

  const visibleNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...notes].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    if (!q) return sorted;
    return sorted.filter(
      note =>
        note.title.toLowerCase().includes(q) ||
        notePlainText(note.content).toLowerCase().includes(q)
    );
  }, [notes, query]);

  // ── Handlers ──

  const handleNoteSelect = useCallback(
    (noteId: string) => {
      setSelectedNoteId(noteId);
      setMobilePane('editor');
      router.replace(noteHref(noteId), { scroll: false });
    },
    [router]
  );

  const handleContentChange = useCallback(
    async (content: string) => {
      if (!selectedNote) return;

      const updatedNote = { ...selectedNote, content, updatedAt: new Date() };
      setNotes(prev => prev.map(note => (note.id === selectedNote.id ? updatedNote : note)));

      if (isSyncEnabled) {
        await syncUpdateNote(updatedNote);
      }
    },
    [selectedNote, syncUpdateNote, isSyncEnabled]
  );

  const handleTitleChange = useCallback(
    async (title: string) => {
      if (!selectedNote) return;

      const updatedNote = { ...selectedNote, title, updatedAt: new Date() };
      setNotes(prev => prev.map(note => (note.id === selectedNote.id ? updatedNote : note)));

      if (isSyncEnabled) {
        await syncUpdateNote(updatedNote);
      }
    },
    [selectedNote, syncUpdateNote, isSyncEnabled]
  );

  const createNoteWithContent = useCallback(
    async (title: string, content: string) => {
      const noteId = uuidv4();
      const newNote: Note = {
        id: noteId,
        title,
        content,
        updatedAt: new Date(),
        ownerId: currentUser.id,
        ownerName: currentUser.displayName,
        collaborators: [],
      };

      setNotes(prev => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
      setMobilePane('editor');
      setQuery('');
      router.replace(noteHref(noteId), { scroll: false });

      if (isSyncEnabled) {
        await syncCreateNote(
          {
            title: newNote.title,
            content: newNote.content,
          },
          noteId
        );
      }
    },
    [syncCreateNote, isSyncEnabled, currentUser.id, currentUser.displayName, router]
  );

  const handleCreateNote = useCallback(async () => {
    focusTitleOnSelect.current = true;
    await createNoteWithContent('', '');
  }, [createNoteWithContent]);

  // `/notes?new=1` (sidebar, palette, `C` shortcut) opens a fresh note once notes have loaded.
  const consumedNewNoteRequest = useRef(false);
  useEffect(() => {
    if (!wantsNewNote) {
      consumedNewNoteRequest.current = false;
      return;
    }
    if (hasLoaded && !consumedNewNoteRequest.current) {
      consumedNewNoteRequest.current = true;
      handleCreateNote();
    }
  }, [wantsNewNote, hasLoaded, handleCreateNote]);

  // `/notes?id=…` (palette results, dashboard links) opens that note.
  const requestedNoteExists = notes.some(note => note.id === requestedNoteId);
  useEffect(() => {
    if (requestedNoteId && requestedNoteExists) {
      setSelectedNoteId(requestedNoteId);
      setMobilePane('editor');
    }
  }, [requestedNoteId, requestedNoteExists]);

  useEffect(() => {
    if (focusTitleOnSelect.current && selectedNoteId) {
      focusTitleOnSelect.current = false;
      titleRef.current?.focus();
    }
  }, [selectedNoteId]);

  // Single-note delete (from card action or editor header)
  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      const note = notes.find(n => n.id === noteId);
      const confirmed = window.confirm(`Delete "${note?.title || 'Untitled'}"?`);
      if (!confirmed) return;

      setNotes(prev => {
        const remaining = prev.filter(n => n.id !== noteId);
        if (selectedNoteId === noteId) {
          setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
          setMobilePane('list');
        }
        return remaining;
      });

      if (isSyncEnabled) {
        await syncDeleteNote(noteId);
      }
    },
    [notes, selectedNoteId, syncDeleteNote, isSyncEnabled]
  );

  // Multi-select toggle
  const handleToggleSelect = useCallback((noteId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  }, []);

  // Select all / deselect all
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === notes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notes.map(n => n.id)));
    }
  }, [selectedIds.size, notes]);

  // Bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Delete ${selectedIds.size} note${selectedIds.size > 1 ? 's' : ''}?`
    );
    if (!confirmed) return;

    const idsToDelete = Array.from(selectedIds);

    setNotes(prev => {
      const remaining = prev.filter(n => !selectedIds.has(n.id));
      if (selectedNoteId && selectedIds.has(selectedNoteId)) {
        setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
    setSelectedIds(new Set());
    setIsMultiSelectMode(false);

    if (isSyncEnabled) {
      for (const id of idsToDelete) {
        await syncDeleteNote(id);
      }
    }
  }, [selectedIds, selectedNoteId, syncDeleteNote, isSyncEnabled]);

  // Cancel multi-select
  const handleCancelSelect = useCallback(() => {
    setSelectedIds(new Set());
    setIsMultiSelectMode(false);
  }, []);

  const getPrdBuilderSourceNotes = useCallback(() => {
    const selectedNotes =
      isMultiSelectMode && selectedIds.size > 0
        ? notes.filter(note => selectedIds.has(note.id) && !lockedNoteIds.has(note.id))
        : selectedNote && !lockedNoteIds.has(selectedNote.id)
          ? [selectedNote]
          : [];

    return selectedNotes;
  }, [isMultiSelectMode, selectedIds, notes, lockedNoteIds, selectedNote]);

  const handleOpenPrdBuilder = useCallback(() => {
    const sourceNotes = getPrdBuilderSourceNotes();

    if (sourceNotes.length === 0) {
      alert('Select at least one unlocked note before creating a PRD.');
      return;
    }

    setPrdBuilderNotes(sourceNotes);
  }, [getPrdBuilderSourceNotes]);

  const handleSavePrdAsNote = useCallback(
    async (title: string, markdown: string) => {
      await createNoteWithContent(title, markdownToNoteHtml(markdown));
      setIsMultiSelectMode(false);
      setSelectedIds(new Set());
    },
    [createNoteWithContent]
  );

  // Delete all locked/undecryptable notes
  const handleDeleteLockedNotes = useCallback(async () => {
    if (lockedNoteIds.size === 0) return;

    const confirmed = window.confirm(
      `Delete ${lockedNoteIds.size} locked note${lockedNoteIds.size > 1 ? 's' : ''} from the database?\n\n` +
        'These notes cannot be decrypted with your current encryption key. ' +
        'They will be permanently removed.'
    );
    if (!confirmed) return;

    const idsToDelete = Array.from(lockedNoteIds);
    const result = await deleteLockedNotes(idsToDelete);

    if (result.success) {
      // Remove locked notes from local state
      setNotes(prev => prev.filter(n => !lockedNoteIds.has(n.id)));
      setLockedNoteIds(new Set());
      setShowLockedNotes(false);
      if (selectedNoteId && lockedNoteIds.has(selectedNoteId)) {
        const remaining = notes.filter(n => !lockedNoteIds.has(n.id));
        setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
      }
    } else {
      alert(`Failed to delete locked notes: ${result.error || 'Unknown error'}`);
    }
  }, [lockedNoteIds, deleteLockedNotes, selectedNoteId, notes]);

  // ── Header actions ──

  const quietButton =
    'px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  const headerActions = (
    <div className="flex items-center gap-1">
      {lockedNoteIds.size > 0 && (
        <button
          onClick={() => setShowLockedNotes(!showLockedNotes)}
          className={`${quietButton} flex items-center gap-1.5 ${showLockedNotes ? 'bg-amber-50 text-amber-800' : ''}`}
          title={`${lockedNoteIds.size} locked note${lockedNoteIds.size > 1 ? 's' : ''} found`}
        >
          <LockIcon className="h-4 w-4" />
          {lockedNoteIds.size} locked
        </button>
      )}
      {notes.length > 0 && (
        <button
          onClick={() => {
            if (isMultiSelectMode) {
              handleCancelSelect();
            } else {
              setIsMultiSelectMode(true);
              setSelectedIds(new Set());
              setMobilePane('list');
            }
          }}
          className={`${quietButton} hidden sm:block`}
        >
          {isMultiSelectMode ? 'Done' : 'Select'}
        </button>
      )}
      {notes.length > 0 && (
        <button
          onClick={handleOpenPrdBuilder}
          disabled={getPrdBuilderSourceNotes().length === 0}
          className={`${quietButton} hidden sm:block`}
        >
          Create PRD
        </button>
      )}
      <button
        onClick={handleCreateNote}
        className="ml-1 flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-stone-50 transition-all duration-300 hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20"
      >
        <PlusIcon className="h-4 w-4" />
        <span className="hidden sm:inline">New note</span>
      </button>
    </div>
  );

  const listPane = (
    <section
      aria-label="Notes"
      className={`${mobilePane === 'list' ? 'flex' : 'hidden'} min-h-0 w-full flex-col border-stone-200/80 bg-white lg:flex lg:w-80 lg:shrink-0 lg:border-r xl:w-96`}
    >
      <div className="border-b border-stone-200/70 p-3">
        {isMultiSelectMode ? (
          <div className="flex h-9 items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="text-sm font-medium text-amber-700 hover:text-amber-800"
              >
                {selectedIds.size === notes.length ? 'Deselect all' : 'Select all'}
              </button>
              <span className="text-sm text-stone-400">{selectedIds.size} selected</span>
            </div>
            <button
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        ) : (
          <label className="relative block">
            <span className="sr-only">Search notes</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setQuery('')}
              placeholder="Search notes"
              className="h-9 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all duration-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus-visible:outline-none"
            />
          </label>
        )}
      </div>

      {showLockedNotes && lockedNoteIds.size > 0 && (
        <div className="border-b border-stone-200 bg-amber-50/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <LockIcon className="h-4 w-4 text-amber-600" />
              {lockedNoteIds.size} locked note{lockedNoteIds.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleDeleteLockedNotes}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              Delete all
            </button>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            These notes were encrypted with a different key and cannot be decrypted.
          </p>
        </div>
      )}

      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {isLoading && notes.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-amber-500" />
            <p className="mt-3 text-sm text-stone-400">Decrypting notes…</p>
          </div>
        ) : loadError ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
          </div>
        ) : notes.length === 0 ? (
          <p className="p-8 text-center text-sm text-stone-400">No notes yet.</p>
        ) : visibleNotes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-stone-500">No notes match “{query}”.</p>
            <button
              onClick={() => setQuery('')}
              className="mt-2 text-sm font-medium text-amber-700 hover:text-amber-800"
            >
              Clear search
            </button>
          </div>
        ) : (
          visibleNotes.map(note => (
            <NoteCard
              key={note.id}
              id={note.id}
              title={note.title}
              content={note.content}
              updatedAt={note.updatedAt}
              ownerName={note.collaborators.length > 0 ? note.ownerName : undefined}
              collaborators={note.collaborators}
              currentUserId={currentUser.id}
              onClick={handleNoteSelect}
              isSelected={selectedNoteId === note.id}
              onEdit={handleNoteSelect}
              onDelete={handleDeleteNote}
              isSelectable={isMultiSelectMode}
              isChecked={selectedIds.has(note.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))
        )}
      </div>

      {notes.length > 0 && (
        <div className="border-t border-stone-200/70 px-4 py-2 text-xs text-stone-400">
          {query ? `${visibleNotes.length} of ${notes.length}` : notes.length} note
          {notes.length === 1 ? '' : 's'}
        </div>
      )}
    </section>
  );

  const editorPane = (
    <section
      aria-label="Editor"
      className={`${mobilePane === 'editor' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-1 flex-col bg-white lg:flex`}
    >
      {selectedNote ? (
        <div className="custom-scrollbar flex-1 overflow-y-auto">
          <article
            key={selectedNote.id}
            className="mx-auto max-w-3xl animate-fade-in px-5 py-6 sm:px-10 md:py-10"
          >
            <div className="mb-6 flex items-center justify-between gap-3 text-xs text-stone-400">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobilePane('list')}
                  className="-ml-1.5 flex items-center gap-1 rounded-md p-1 text-sm text-stone-500 hover:bg-stone-100 lg:hidden"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Notes
                </button>
                <span>{formatEdited(selectedNote.updatedAt)}</span>
                <span className="hidden items-center gap-1 sm:flex">
                  <LockIcon className="h-3.5 w-3.5 text-amber-600" />
                  End-to-end encrypted
                </span>
              </div>
              <button
                onClick={() => handleDeleteNote(selectedNote.id)}
                title="Delete note"
                aria-label="Delete note"
                className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>

            <input
              ref={titleRef}
              type="text"
              value={selectedNote.title}
              onChange={e => handleTitleChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (document.querySelector('.ProseMirror') as HTMLElement | null)?.focus();
                }
              }}
              placeholder="Untitled"
              aria-label="Note title"
              className="mb-2 w-full border-none bg-transparent font-serif text-3xl font-medium tracking-[-0.02em] text-stone-900 placeholder:text-stone-300 focus:outline-none focus-visible:outline-none md:text-4xl"
            />

            <NoteEditor
              noteId={selectedNote.id}
              content={selectedNote.content}
              onChange={handleContentChange}
              placeholder="Start writing. Everything is encrypted on this device before it syncs."
              minHeight="40vh"
              userId={currentUser.id}
              displayName={currentUser.displayName}
              collaborators={selectedNote.collaborators}
            />
          </article>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          {notes.length === 0 && !isLoading ? (
            <div className="max-w-sm animate-fade-in">
              <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <LockIcon className="h-6 w-6" />
              </div>
              <h2 className="font-serif text-3xl text-stone-900">A quiet place to think</h2>
              <p className="mt-3 leading-relaxed text-stone-500">
                Notes are encrypted on this device before they sync. Only you hold the key.
              </p>
              <button
                onClick={handleCreateNote}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2.5 font-medium text-stone-50 transition-all duration-300 hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20"
              >
                <PlusIcon className="h-4 w-4" />
                Write your first note
              </button>
              <p className="mt-4 text-xs text-stone-400">
                Tip: press <kbd className="rounded border border-stone-200 px-1 font-mono">C</kbd>{' '}
                anywhere to start a note
              </p>
            </div>
          ) : (
            <p className="text-stone-400">Select a note to start editing</p>
          )}
        </div>
      )}
    </section>
  );

  return (
    <AppLayout pageTitle="Notes" actions={headerActions} fullWidth>
      {prdBuilderNotes && (
        <PrdBuilderWizard
          sourceNotes={prdBuilderNotes}
          onClose={() => setPrdBuilderNotes(null)}
          onSaveAsNote={handleSavePrdAsNote}
        />
      )}
      <div className="flex h-full min-h-0">
        {listPane}
        {editorPane}
      </div>
    </AppLayout>
  );
}
