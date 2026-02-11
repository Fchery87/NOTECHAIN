// apps/web/src/hooks/useRelatedNotes.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Note } from '@notechain/data-models';
import type { RelatedNote, RelatedNotesOptions } from '../lib/ai/notes/types';
import { getNoteIntelligence } from '../lib/ai/notes/NoteIntelligence';

interface UseRelatedNotesOptions {
  enabled?: boolean;
  allNotes: Note[];
  relatedOptions?: RelatedNotesOptions;
  onError?: (error: Error) => void;
}

interface UseRelatedNotesResult {
  relatedNotes: RelatedNote[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for finding related notes
 * Uses semantic similarity and content analysis
 *
 * @example
 * ```tsx
 * const { relatedNotes, isLoading } = useRelatedNotes({
 *   currentNote: note,
 *   allNotes: notes,
 *   relatedOptions: { maxResults: 5 }
 * });
 *
 * return (
 *   <RelatedNotes
 *     notes={relatedNotes}
 *     onNoteClick={(id) => router.push(`/notes/${id}`)}
 *   />
 * );
 * ```
 */
export function useRelatedNotes(
  currentNote: Note | null,
  options: UseRelatedNotesOptions
): UseRelatedNotesResult {
  const { enabled = true, allNotes, relatedOptions = {}, onError } = options;

  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const intelligenceRef = useRef(getNoteIntelligence());
  const isFirstLoadRef = useRef(true);

  const fetchRelatedNotes = useCallback(async () => {
    if (!currentNote || !enabled || allNotes.length === 0) {
      setRelatedNotes([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await intelligenceRef.current.findRelatedNotes(
        currentNote,
        allNotes.filter(n => n.id !== currentNote.id),
        relatedOptions
      );

      setRelatedNotes(results);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [currentNote, enabled, allNotes, relatedOptions, onError]);

  const refresh = useCallback(async () => {
    await fetchRelatedNotes();
  }, [fetchRelatedNotes]);

  useEffect(() => {
    if (!enabled) {
      setRelatedNotes([]);
      return;
    }

    fetchRelatedNotes();

    // Only load once on mount for performance
    isFirstLoadRef.current = false;
  }, [currentNote?.id, enabled, fetchRelatedNotes]);

  return {
    relatedNotes,
    isLoading,
    error,
    refresh,
  };
}

export default useRelatedNotes;
