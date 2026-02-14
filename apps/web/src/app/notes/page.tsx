'use client';

import { useState, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { NoteEditor } from '@/components/NoteEditor';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { NoteCard, type NoteCollaborator } from '@notechain/ui-components';
import { useNotesSync } from '@/lib/sync/useNotesSync';

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
  ownerId: string;
  ownerName: string;
  collaborators: NoteCollaborator[];
}

const CURRENT_USER = {
  id: 'user-1',
  displayName: 'John Doe',
  avatarUrl: undefined,
};

const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Project Ideas',
    content:
      '<h2>AI Features</h2><p>Implement local LLM for note summarization and context-aware suggestions.</p><h2>Encryption</h2><p>Ensure all data is encrypted client-side before storage.</p>',
    updatedAt: new Date(Date.now() - 86400000),
    ownerId: 'user-1',
    ownerName: 'John Doe',
    collaborators: [
      { id: 'user-2', displayName: 'Alice Smith', permissionLevel: 'edit' },
      { id: 'user-3', displayName: 'Bob Wilson', permissionLevel: 'view' },
    ],
  },
  {
    id: '2',
    title: 'Meeting Notes - Team Sync',
    content:
      '<p><strong>Attendees:</strong> Sarah, Mike, Alex</p><p><strong>Agenda:</strong></p><ul><li>Review Q1 goals</li><li>Discuss new features</li><li>Timeline planning</li></ul>',
    updatedAt: new Date(Date.now() - 172800000),
    ownerId: 'user-1',
    ownerName: 'John Doe',
    collaborators: [],
  },
  {
    id: '3',
    title: 'Research: End-to-End Encryption',
    content:
      '<p>Key points about XSalsa20-Poly1305:</p><ul><li>256-bit keys</li><li>Authenticated encryption</li><li>Fast performance</li></ul>',
    updatedAt: new Date(),
    ownerId: 'user-2',
    ownerName: 'Alice Smith',
    collaborators: [{ id: 'user-1', displayName: 'John Doe', permissionLevel: 'edit' }],
  },
];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(mockNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(mockNotes[0].id);
  const [_showShareDialog, setShowShareDialog] = useState(false);

  const { syncCreateNote, syncUpdateNote, isSyncEnabled } = useNotesSync();

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  const userPermission =
    selectedNote?.collaborators.find(c => c.id === CURRENT_USER.id)?.permissionLevel ||
    (selectedNote?.ownerId === CURRENT_USER.id ? 'admin' : 'view');

  const canEdit = userPermission === 'edit' || userPermission === 'admin';

  const handleNoteSelect = useCallback((noteId: string) => {
    setSelectedNoteId(noteId);
  }, []);

  const handleContentChange = useCallback(
    async (content: string) => {
      if (!selectedNote || !canEdit) return;

      const updatedNote = { ...selectedNote, content, updatedAt: new Date() };
      setNotes(prev => prev.map(note => (note.id === selectedNote.id ? updatedNote : note)));

      if (isSyncEnabled) {
        await syncUpdateNote(updatedNote);
      }
    },
    [selectedNote, syncUpdateNote, isSyncEnabled, canEdit]
  );

  const handleTitleChange = useCallback(
    async (title: string) => {
      if (!selectedNote || !canEdit) return;

      const updatedNote = { ...selectedNote, title, updatedAt: new Date() };
      setNotes(prev => prev.map(note => (note.id === selectedNote.id ? updatedNote : note)));

      if (isSyncEnabled) {
        await syncUpdateNote(updatedNote);
      }
    },
    [selectedNote, syncUpdateNote, isSyncEnabled, canEdit]
  );

  const handleCreateNote = useCallback(async () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'New Note',
      content: '',
      updatedAt: new Date(),
      ownerId: CURRENT_USER.id,
      ownerName: CURRENT_USER.displayName,
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
  }, [syncCreateNote, isSyncEnabled]);

  const handleShare = useCallback(() => {
    setShowShareDialog(true);
  }, []);

  const _handleShareClose = useCallback(() => {
    setShowShareDialog(false);
  }, []);

  const headerActions = (
    <>
      <SyncStatusIndicator />
      <button
        onClick={handleCreateNote}
        className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 transition-colors"
      >
        + New Note
      </button>
    </>
  );

  return (
    <AppLayout pageTitle="Notes" actions={headerActions}>
      <div className="py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="p-4 border-b border-stone-200">
                <input
                  type="text"
                  placeholder="Search notes..."
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {notes.map(note => (
                  <NoteCard
                    key={note.id}
                    id={note.id}
                    title={note.title}
                    content={note.content}
                    updatedAt={note.updatedAt}
                    ownerName={note.ownerName}
                    collaborators={note.collaborators}
                    currentUserId={CURRENT_USER.id}
                    onClick={handleNoteSelect}
                    isSelected={selectedNoteId === note.id}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedNote ? (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 min-h-[600px]">
                <div className="p-4 border-b border-stone-200">
                  <input
                    type="text"
                    value={selectedNote.title}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder="Note title..."
                    disabled={!canEdit}
                    className={`w-full text-xl font-medium bg-transparent border-none focus:outline-none placeholder:text-stone-400 ${
                      !canEdit ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
                <div className="p-4">
                  <NoteEditor
                    content={selectedNote.content}
                    onChange={handleContentChange}
                    placeholder="Start writing your encrypted note..."
                    minHeight="500px"
                    userId={CURRENT_USER.id}
                    displayName={CURRENT_USER.displayName}
                    collaborators={selectedNote.collaborators}
                    onShare={canEdit ? handleShare : undefined}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 min-h-[600px] flex items-center justify-center">
                <p className="text-stone-400">Select a note to start editing</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
