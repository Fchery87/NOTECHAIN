// apps/web/src/components/AutoTags.tsx
'use client';

import React, { useState } from 'react';
import type { AutoTag } from '../lib/ai/notes/types';

interface AutoTagsProps {
  suggestions: AutoTag[];
  existingTags: string[];
  onAddTag: (tag: string) => void;
  onAddAll?: () => void;
  maxVisible?: number;
  showConfidence?: boolean;
}

/**
 * AutoTags displays AI-generated tag suggestions
 * Allows users to add individual tags or all at once
 *
 * Design: Warm Editorial Minimalism
 * - Pill-style tag buttons
 * - Warm amber accents
 * - Confidence badges
 */
export const AutoTags: React.FC<AutoTagsProps> = ({
  suggestions,
  existingTags,
  onAddTag,
  onAddAll,
  maxVisible = 6,
  showConfidence = true,
}) => {
  const [addedTags, setAddedTags] = useState<Set<string>>(new Set());

  // Filter out already added and existing tags
  const availableSuggestions = suggestions.filter(
    tag =>
      !addedTags.has(tag.name) &&
      !existingTags.some(existing => existing.toLowerCase() === tag.name.toLowerCase())
  );

  const visibleSuggestions = availableSuggestions.slice(0, maxVisible);

  if (visibleSuggestions.length === 0) {
    return null;
  }

  const handleAddTag = (tagName: string) => {
    setAddedTags(prev => new Set(prev).add(tagName));
    onAddTag(tagName);
  };

  const handleAddAll = () => {
    visibleSuggestions.forEach(tag => {
      setAddedTags(prev => new Set(prev).add(tag.name));
    });
    onAddAll?.();
  };

  const getSourceIcon = (source: AutoTag['source']): string => {
    switch (source) {
      case 'keyword':
        return '🔑';
      case 'entity':
        return '🏷️';
      case 'category':
        return '📂';
      case 'ai':
        return '✨';
      default:
        return '🏷️';
    }
  };

  const getConfidenceStyles = (confidence: number): string => {
    if (confidence >= 0.8) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
    if (confidence >= 0.5) {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    }
    return 'bg-stone-100 text-stone-600 border-stone-200';
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
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <span className="text-sm font-medium text-stone-700">Suggested Tags</span>
          <span className="text-xs text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full">AI</span>
        </div>
        {onAddAll && visibleSuggestions.length > 1 && (
          <button
            onClick={handleAddAll}
            className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
          >
            Add All
          </button>
        )}
      </div>

      {/* Tags Grid */}
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {visibleSuggestions.map(tag => (
            <button
              key={tag.name}
              onClick={() => handleAddTag(tag.name)}
              className={`
                group inline-flex items-center gap-1.5 px-3 py-1.5 
                rounded-full border transition-all duration-200
                hover:shadow-sm hover:scale-105 active:scale-95
                ${getConfidenceStyles(tag.confidence)}
              `}
              title={`${getSourceIcon(tag.source)} ${tag.source} • ${Math.round(
                tag.confidence * 100
              )}% confidence`}
            >
              <span className="text-sm opacity-70">{getSourceIcon(tag.source)}</span>
              <span className="text-sm font-medium">{tag.name}</span>
              {showConfidence && (
                <span className="text-xs opacity-60 ml-0.5">
                  {Math.round(tag.confidence * 100)}%
                </span>
              )}

              {/* Add icon on hover */}
              <svg
                className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          ))}
        </div>

        {/* More suggestions hint */}
        {availableSuggestions.length > maxVisible && (
          <p className="text-xs text-stone-400 mt-3 text-center">
            +{availableSuggestions.length - maxVisible} more suggestions available
          </p>
        )}
      </div>

      {/* Categories hint */}
      {visibleSuggestions.some(t => t.category) && (
        <div className="px-4 py-2 bg-stone-50 border-t border-stone-200">
          <div className="flex items-center gap-4 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <span>🔑</span> Keyword
            </span>
            <span className="flex items-center gap-1">
              <span>🏷️</span> Entity
            </span>
            <span className="flex items-center gap-1">
              <span>📂</span> Category
            </span>
            <span className="flex items-center gap-1">
              <span>✨</span> AI Generated
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoTags;
