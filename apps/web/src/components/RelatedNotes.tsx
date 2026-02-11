// apps/web/src/components/RelatedNotes.tsx
'use client';

import React from 'react';
import type { RelatedNote } from '../lib/ai/notes/types';

interface RelatedNotesProps {
  notes: RelatedNote[];
  onNoteClick: (noteId: string) => void;
  maxVisible?: number;
  showEmpty?: boolean;
  emptyMessage?: string;
}

/**
 * RelatedNotes displays a sidebar of related/similar notes
 * Shows similarity scores and match reasons
 *
 * Design: Warm Editorial Minimalism
 * - Clean list layout
 * - Subtle similarity indicators
 * - Hover effects for interactivity
 */
export const RelatedNotes: React.FC<RelatedNotesProps> = ({
  notes,
  onNoteClick,
  maxVisible = 5,
  showEmpty = true,
  emptyMessage = 'No related notes found',
}) => {
  const visibleNotes = notes.slice(0, maxVisible);

  if (visibleNotes.length === 0 && showEmpty) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 text-center">
        <svg
          className="w-8 h-8 text-stone-300 mx-auto mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <p className="text-sm text-stone-500">{emptyMessage}</p>
      </div>
    );
  }

  if (visibleNotes.length === 0) {
    return null;
  }

  const getSimilarityColor = (score: number): string => {
    if (score >= 0.8) return 'text-emerald-600';
    if (score >= 0.6) return 'text-amber-600';
    if (score >= 0.4) return 'text-stone-500';
    return 'text-stone-400';
  };

  const getSimilarityBar = (score: number): string => {
    if (score >= 0.8) return 'bg-emerald-500';
    if (score >= 0.6) return 'bg-amber-500';
    if (score >= 0.4) return 'bg-stone-400';
    return 'bg-stone-300';
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span className="text-sm font-medium text-stone-700">Related Notes</span>
        </div>
        <span className="text-xs text-stone-500">{notes.length} found</span>
      </div>

      {/* Notes List */}
      <div className="divide-y divide-stone-100">
        {visibleNotes.map(({ note, similarityScore, matchReason, sharedKeywords }) => (
          <button
            key={note.id}
            onClick={() => onNoteClick(note.id)}
            className="w-full text-left p-4 hover:bg-stone-50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h4 className="text-sm font-medium text-stone-900 group-hover:text-amber-700 transition-colors truncate">
                  {note.title}
                </h4>

                {/* Match Reason */}
                <p className="text-xs text-stone-500 mt-1">{matchReason}</p>

                {/* Shared Keywords */}
                {sharedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {sharedKeywords.slice(0, 3).map(keyword => (
                      <span
                        key={keyword}
                        className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                    {sharedKeywords.length > 3 && (
                      <span className="text-[10px] text-stone-400">
                        +{sharedKeywords.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Date */}
                <p className="text-xs text-stone-400 mt-2">{formatDate(note.createdAt)}</p>
              </div>

              {/* Similarity Score */}
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs font-semibold ${getSimilarityColor(similarityScore)}`}>
                  {Math.round(similarityScore * 100)}%
                </span>
                <div className="w-12 h-1 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getSimilarityBar(similarityScore)} transition-all`}
                    style={{ width: `${similarityScore * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      {notes.length > maxVisible && (
        <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 text-center">
          <span className="text-xs text-stone-500">+{notes.length - maxVisible} more related</span>
        </div>
      )}
    </div>
  );
};

export default RelatedNotes;
