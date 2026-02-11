// apps/web/src/hooks/useNoteAnalysis.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Note } from '@notechain/data-models';
import type { NoteAnalysis, NoteAnalysisOptions } from '../lib/ai/notes/types';
import { getNoteIntelligence } from '../lib/ai/notes/NoteIntelligence';

interface UseNoteAnalysisOptions {
  enabled?: boolean;
  debounceMs?: number;
  onError?: (error: Error) => void;
}

interface UseNoteAnalysisResult {
  analysis: NoteAnalysis | null;
  isAnalyzing: boolean;
  error: Error | null;
  reanalyze: () => Promise<void>;
}

/**
 * Hook for analyzing note content
 * Automatically re-analyzes when note content changes
 *
 * @example
 * ```tsx
 * const { analysis, isAnalyzing } = useNoteAnalysis(note);
 *
 * return (
 *   <div>
 *     {isAnalyzing ? 'Analyzing...' : (
 *       <span>Reading time: {analysis?.readingTimeMinutes} min</span>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useNoteAnalysis(
  note: Note | null,
  analysisOptions: NoteAnalysisOptions = {},
  options: UseNoteAnalysisOptions = {}
): UseNoteAnalysisResult {
  const { enabled = true, debounceMs = 1000, onError } = options;

  const [analysis, setAnalysis] = useState<NoteAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const intelligenceRef = useRef(getNoteIntelligence());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentHashRef = useRef<string>('');

  const performAnalysis = useCallback(async () => {
    if (!note || !enabled) return;

    // Skip if content hasn't changed
    const contentHash = `${note.title}-${note.content}`;
    if (contentHash === lastContentHashRef.current && analysis) {
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await intelligenceRef.current.analyzeNote(note, analysisOptions);
      setAnalysis(result);
      lastContentHashRef.current = contentHash;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [note, enabled, analysisOptions, analysis, onError]);

  const reanalyze = useCallback(async () => {
    lastContentHashRef.current = '';
    await performAnalysis();
  }, [performAnalysis]);

  useEffect(() => {
    if (!enabled || !note) {
      setAnalysis(null);
      return;
    }

    // Debounce analysis
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performAnalysis();
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [note?.id, note?.title, note?.content, enabled, debounceMs, performAnalysis]);

  return {
    analysis,
    isAnalyzing,
    error,
    reanalyze,
  };
}

export default useNoteAnalysis;
