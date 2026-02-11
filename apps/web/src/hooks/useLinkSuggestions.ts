// apps/web/src/hooks/useLinkSuggestions.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Note } from '@notechain/data-models';
import type { LinkSuggestion, LinkSuggestionOptions } from '../lib/ai/notes/types';
import { getNoteIntelligence } from '../lib/ai/notes/NoteIntelligence';

interface UseLinkSuggestionsOptions {
  enabled?: boolean;
  allNotes: Note[];
  suggestionOptions?: LinkSuggestionOptions;
  onError?: (error: Error) => void;
}

interface UseLinkSuggestionsResult {
  suggestions: LinkSuggestion[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  acceptSuggestion: (suggestion: LinkSuggestion) => void;
  dismissSuggestion: (suggestion: LinkSuggestion) => void;
  acceptAllSuggestions: () => void;
}

/**
 * Hook for getting AI-powered link suggestions
 * Suggests relevant backlinks based on content similarity
 *
 * @example
 * ```tsx
 * const { suggestions, isLoading, acceptSuggestion } = useLinkSuggestions({
 *   currentNote: note,
 *   allNotes: notes,
 * });
 *
 * return (
 *   <LinkSuggestions
 *     suggestions={suggestions}
 *     onAccept={(s) => acceptSuggestion(s)}
 *   />
 * );
 * ```
 */
export function useLinkSuggestions(
  currentNote: Note | null,
  options: UseLinkSuggestionsOptions
): UseLinkSuggestionsResult {
  const { enabled = true, allNotes, suggestionOptions = {}, onError } = options;

  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const intelligenceRef = useRef(getNoteIntelligence());

  const fetchSuggestions = useCallback(async () => {
    if (!currentNote || !enabled || allNotes.length === 0) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await intelligenceRef.current.suggestLinks(
        currentNote,
        allNotes.filter(n => n.id !== currentNote.id),
        suggestionOptions
      );

      // Filter out accepted and dismissed suggestions
      const filteredResults = results.filter(
        s => !acceptedIds.has(s.targetNoteId) && !dismissedIds.has(s.targetNoteId)
      );

      setSuggestions(filteredResults);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [currentNote, enabled, allNotes, suggestionOptions, acceptedIds, dismissedIds, onError]);

  const refresh = useCallback(async () => {
    await fetchSuggestions();
  }, [fetchSuggestions]);

  const acceptSuggestion = useCallback((suggestion: LinkSuggestion) => {
    setAcceptedIds(prev => new Set(prev).add(suggestion.targetNoteId));
    setSuggestions(prev => prev.filter(s => s.targetNoteId !== suggestion.targetNoteId));
  }, []);

  const dismissSuggestion = useCallback((suggestion: LinkSuggestion) => {
    setDismissedIds(prev => new Set(prev).add(suggestion.targetNoteId));
    setSuggestions(prev => prev.filter(s => s.targetNoteId !== suggestion.targetNoteId));
  }, []);

  const acceptAllSuggestions = useCallback(() => {
    const allIds = new Set(suggestions.map(s => s.targetNoteId));
    setAcceptedIds(prev => new Set([...prev, ...allIds]));
    setSuggestions([]);
  }, [suggestions]);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      return;
    }

    fetchSuggestions();
  }, [currentNote?.id, enabled, fetchSuggestions]);

  return {
    suggestions,
    isLoading,
    error,
    refresh,
    acceptSuggestion,
    dismissSuggestion,
    acceptAllSuggestions,
  };
}

export default useLinkSuggestions;
