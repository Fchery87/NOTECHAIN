'use client';

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AppLayout from '@/components/AppLayout';
import { NoteEditor } from '@/components/NoteEditor';

import { NoteCard, type NoteCollaborator } from '@notechain/ui-components';
import { useNotesSync } from '@/lib/sync/useNotesSync';
import { useUser } from '@/lib/supabase/UserProvider';

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
  ownerId: string;
  ownerName: string;
  collaborators: NoteCollaborator[];
}

export default function NotesPage() {
  const { user } = useUser();
  const {
    loadNotes,
    syncCreateNote,
    syncUpdateNote,
    syncDeleteNote,
    isSyncEnabled,
    isEncryptionReady,
    isLoading,
    loadError,
  } = useNotesSync();

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [_showShareDialog, setShowShareDialog] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const currentUser = {
    id: user?.id || 'user-1',
    displayName: user?.email?.split('@')[0] || 'You',
    avatarUrl: undefined,
  };

  // Load notes from Supabase on mount when encryption is ready
  useEffect(() => {
    if (!isEncryptionReady || !user?.id || hasLoaded) return;

    const load = async () => {
      const loaded = await loadNotes();
      const mapped: Note[] = loaded.map(n => ({
        ...n,
        ownerId: user?.id || '',
        ownerName: currentUser.displayName,
        collaborators: [],
      }));
      setNotes(mapped);
      if (mapped.length > 0) {
        setSelectedNoteId(mapped[0].id);
      }
      setHasLoaded(true);
    };

    load();
  }, [isEncryptionReady, hasLoaded, loadNotes, user?.id, currentUser.displayName]);

  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

  // ── Handlers ──

  const handleNoteSelect = useCallback((noteId: string) => {
    setSelectedNoteId(noteId);
  }, []);

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

  const handleCreateNote = useCallback(async () => {
    const noteId = uuidv4();
    const newNote: Note = {
      id: noteId,
      title: 'New Note',
      content: '',
      updatedAt: new Date(),
      ownerId: currentUser.id,
      ownerName: currentUser.displayName,
      collaborators: [],
    };

    setNotes(prev => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);

    if (isSyncEnabled) {
      await syncCreateNote({
        title: newNote.title,
        content: newNote.content,
      });
    }
  }, [syncCreateNote, isSyncEnabled, currentUser.id, currentUser.displayName]);

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
        }
        return remaining;
      });

      if (isSyncEnabled) {
        await syncDeleteNote(noteId);
      }
    },
    [notes, selectedNoteId, syncDeleteNote, isSyncEnabled]
  );

  // Edit from card — just select it
  const handleEditNote = useCallback((noteId: string) => {
    setSelectedNoteId(noteId);
  }, []);

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

  const handleShare = useCallback(() => {
    setShowShareDialog(true);
  }, []);

  const _handleShareClose = useCallback(() => {
    setShowShareDialog(false);
  }, []);

  // ── Header actions ──

  const headerActions = (
    <div className="flex items-center gap-2">
      {notes.length > 0 && (
        <button
          onClick={() => {
            if (isMultiSelectMode) {
              handleCancelSelect();
            } else {
              setIsMultiSelectMode(true);
              setSelectedIds(new Set());
            }
          }}
          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
            isMultiSelectMode
              ? 'bg-stone-200 text-stone-700 hover:bg-stone-300'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          {isMultiSelectMode ? 'Cancel' : 'Select'}
        </button>
      )}
      <button
        onClick={handleCreateNote}
        className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 transition-colors"
      >
        + New Note
      </button>
    </div>
  );

  return (
    <AppLayout pageTitle="Notes" actions={headerActions}>
      <div className="py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              {/* Search + multi-select toolbar */}
              <div className="p-4 border-b border-stone-200">
                {isMultiSelectMode ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        {selectedIds.size === notes.length ? 'Deselect all' : 'Select all'}
                      </button>
                      <span className="text-sm text-stone-400">{selectedIds.size} selected</span>
                    </div>
                    <button
                      onClick={handleBulkDelete}
                      disabled={selectedIds.size === 0}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Search notes..."
                    className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                )}
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block w-6 h-6 border-2 border-stone-300 border-t-amber-500 rounded-full animate-spin" />
                    <p className="mt-3 text-sm text-stone-400">Decrypting notes…</p>
                  </div>
                ) : loadError ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-red-500">{loadError}</p>
                  </div>
                ) : notes.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-stone-400">
                      No notes yet. Create one to get started.
                    </p>
                  </div>
                ) : (
                  notes.map(note => (
                    <NoteCard
                      key={note.id}
                      id={note.id}
                      title={note.title}
                      content={note.content}
                      updatedAt={note.updatedAt}
                      ownerName={note.ownerName}
                      collaborators={note.collaborators}
                      currentUserId={currentUser.id}
                      onClick={handleNoteSelect}
                      isSelected={selectedNoteId === note.id}
                      onEdit={handleEditNote}
                      onDelete={handleDeleteNote}
                      isSelectable={isMultiSelectMode}
                      isChecked={selectedIds.has(note.id)}
                      onToggleSelect={handleToggleSelect}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedNote ? (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 min-h-[600px]">
                <div className="p-4 border-b border-stone-200 flex items-center gap-3">
                  <input
                    type="text"
                    value={selectedNote.title}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder="Note title..."
                    className="flex-1 text-xl font-medium bg-transparent border-none focus:outline-none placeholder:text-stone-400"
                  />
                  <button
                    onClick={() => handleDeleteNote(selectedNote.id)}
                    title="Delete note"
                    className="shrink-0 p-2 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
                <div className="p-4">
                  <NoteEditor
                    noteId={selectedNote.id}
                    content={selectedNote.content}
                    onChange={handleContentChange}
                    placeholder="Start writing your encrypted note..."
                    minHeight="500px"
                    userId={currentUser.id}
                    displayName={currentUser.displayName}
                    collaborators={selectedNote.collaborators}
                    onShare={handleShare}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 min-h-[600px] flex items-center justify-center">
                <p className="text-stone-400">
                  {notes.length === 0
                    ? 'Create your first note to get started'
                    : 'Select a note to start editing'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
