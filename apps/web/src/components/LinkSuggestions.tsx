// apps/web/src/components/LinkSuggestions.tsx
'use client';

import React, { useState } from 'react';
import type { LinkSuggestion } from '../lib/ai/notes/types';

interface LinkSuggestionsProps {
  suggestions: LinkSuggestion[];
  onAccept: (suggestion: LinkSuggestion) => void;
  onDismiss: (suggestion: LinkSuggestion) => void;
  onAcceptAll?: () => void;
  maxVisible?: number;
}

/**
 * LinkSuggestions displays AI-generated backlink suggestions
 * Allows users to accept or dismiss individual suggestions
 *
 * Design: Warm Editorial Minimalism
 * - Clean cards with subtle borders
 * - Warm amber accents for confidence indicators
 * - Clear hierarchy with confidence scores
 */
export const LinkSuggestions: React.FC<LinkSuggestionsProps> = ({
  suggestions,
  onAccept,
  onDismiss,
  onAcceptAll,
  maxVisible = 3,
}) => {
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleSuggestions = suggestions
    .filter(s => !dismissedIds.has(s.targetNoteId))
    .slice(0, maxVisible);

  if (visibleSuggestions.length === 0) {
    return null;
  }

  const handleDismiss = (suggestion: LinkSuggestion) => {
    setDismissedIds(prev => new Set(prev).add(suggestion.targetNoteId));
    onDismiss(suggestion);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-emerald-500';
    if (confidence >= 0.6) return 'bg-amber-500';
    return 'bg-stone-400';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
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
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <span className="text-sm font-medium text-stone-700">Suggested Links</span>
          <span className="text-xs text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full">AI</span>
        </div>
        {onAcceptAll && visibleSuggestions.length > 1 && (
          <button
            onClick={onAcceptAll}
            className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
          >
            Accept All
          </button>
        )}
      </div>

      {/* Suggestions List */}
      <div className="divide-y divide-stone-100">
        {visibleSuggestions.map(suggestion => (
          <div key={suggestion.targetNoteId} className="p-4 hover:bg-stone-50/50 transition-colors">
            <div className="flex items-start gap-3">
              {/* Confidence Indicator */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <div
                  className={`w-2 h-2 rounded-full ${getConfidenceColor(suggestion.confidence)}`}
                  title={`${getConfidenceLabel(suggestion.confidence)} confidence`}
                />
                <span className="text-[10px] text-stone-400 font-medium">
                  {Math.round(suggestion.confidence * 100)}%
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-stone-900 truncate">
                  {suggestion.targetNoteTitle}
                </h4>

                {/* Context Preview */}
                <p className="text-xs text-stone-600 mt-1 line-clamp-2">{suggestion.context}</p>

                {/* Reason */}
                <p className="text-xs text-stone-400 mt-1">{suggestion.reason}</p>

                {/* Expanded Details */}
                {expandedSuggestion === suggestion.targetNoteId && (
                  <div className="mt-2 p-2 bg-stone-100 rounded text-xs text-stone-600">
                    <p className="font-medium mb-1">Suggested link text:</p>
                    <code className="text-amber-700 bg-white px-1.5 py-0.5 rounded">
                      {suggestion.suggestedText}
                    </code>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => onAccept(suggestion)}
                    className="text-xs px-3 py-1.5 bg-stone-900 text-stone-50 rounded-md hover:bg-stone-800 transition-colors font-medium"
                  >
                    Add Link
                  </button>
                  <button
                    onClick={() => handleDismiss(suggestion)}
                    className="text-xs px-3 py-1.5 text-stone-500 hover:text-stone-700 transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() =>
                      setExpandedSuggestion(
                        expandedSuggestion === suggestion.targetNoteId
                          ? null
                          : suggestion.targetNoteId
                      )
                    }
                    className="text-xs text-stone-400 hover:text-stone-600 transition-colors ml-auto"
                  >
                    {expandedSuggestion === suggestion.targetNoteId ? 'Less' : 'More'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {suggestions.length > maxVisible && (
        <div className="px-4 py-2 bg-stone-50 border-t border-stone-200 text-center">
          <span className="text-xs text-stone-500">
            +{suggestions.length - maxVisible} more suggestions
          </span>
        </div>
      )}
    </div>
  );
};

export default LinkSuggestions;
