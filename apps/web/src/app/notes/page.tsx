'use client';

import { useState, useCallback } from 'react';
import { NoteEditor } from '@/components/NoteEditor';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { useNotesSync } from '@/lib/sync/useNotesSync';

// Mock notes data
interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
}

const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Project Ideas',
    content:
      '<h2>AI Features</h2><p>Implement local LLM for note summarization and context-aware suggestions.</p><h2>Encryption</h2><p>Ensure all data is encrypted client-side before storage.</p>',
    updatedAt: new Date(Date.now() - 86400000), // 1 day ago
  },
  {
    id: '2',
    title: 'Meeting Notes - Team Sync',
    content:
      '<p><strong>Attendees:</strong> Sarah, Mike, Alex</p><p><strong>Agenda:</strong></p><ul><li>Review Q1 goals</li><li>Discuss new features</li><li>Timeline planning</li></ul>',
    updatedAt: new Date(Date.now() - 172800000), // 2 days ago
  },
  {
    id: '3',
    title: 'Research: End-to-End Encryption',
    content:
      '<p>Key points about XSalsa20-Poly1305:</p><ul><li>256-bit keys</li><li>Authenticated encryption</li><li>Fast performance</li></ul>',
    updatedAt: new Date(),
  },
];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(mockNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(mockNotes[0].id);

  // Sync integration
  const { syncCreateNote, syncUpdateNote, isSyncEnabled } = useNotesSync();

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  const handleNoteSelect = useCallback((noteId: string) => {
    setSelectedNoteId(noteId);
  }, []);

  const handleContentChange = useCallback(
    async (content: string) => {
      if (!selectedNote) return;

      const updatedNote = { ...selectedNote, content, updatedAt: new Date() };
      setNotes(prev => prev.map(note => (note.id === selectedNote.id ? updatedNote : note)));

      // Sync the update
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

      // Sync the update
      if (isSyncEnabled) {
        await syncUpdateNote(updatedNote);
      }
    },
    [selectedNote, syncUpdateNote, isSyncEnabled]
  );

  const handleCreateNote = useCallback(async () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'New Note',
      content: '',
      updatedAt: new Date(),
    };

    setNotes(prev => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);

    // Sync the creation
    if (isSyncEnabled) {
      await syncCreateNote({
        title: newNote.title,
        content: newNote.content,
      });
    }
  }, [syncCreateNote, isSyncEnabled]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <a href="/dashboard" className="font-serif text-2xl font-medium text-stone-900">
                NoteChain
              </a>
              <span className="text-stone-300">/</span>
              <span className="text-lg text-stone-700">Notes</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Sync Status Indicator */}
              <SyncStatusIndicator />

              <button
                onClick={handleCreateNote}
                className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 transition-colors"
              >
                + New Note
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes List */}
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
                  <button
                    key={note.id}
                    onClick={() => handleNoteSelect(note.id)}
                    className={`w-full text-left p-4 border-b border-stone-100 last:border-b-0 transition-colors ${
                      selectedNoteId === note.id
                        ? 'bg-amber-50 border-amber-200'
                        : 'hover:bg-stone-50'
                    }`}
                  >
                    <h3 className="font-medium text-stone-900 truncate">
                      {note.title || 'Untitled Note'}
                    </h3>
                    <p className="text-sm text-stone-500 mt-1">{formatDate(note.updatedAt)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Editor */}
          <div className="lg:col-span-2">
            {selectedNote ? (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 min-h-[600px]">
                <div className="p-4 border-b border-stone-200">
                  <input
                    type="text"
                    value={selectedNote.title}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder="Note title..."
                    className="w-full text-xl font-medium bg-transparent border-none focus:outline-none placeholder:text-stone-400"
                  />
                </div>
                <div className="p-4">
                  <NoteEditor
                    content={selectedNote.content}
                    onChange={handleContentChange}
                    placeholder="Start writing your encrypted note..."
                    minHeight="500px"
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
      </main>
    </div>
  );
}
