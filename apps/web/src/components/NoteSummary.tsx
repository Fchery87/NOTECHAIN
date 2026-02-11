// apps/web/src/components/NoteSummary.tsx
'use client';

import React, { useState } from 'react';
import type { NoteSummary as NoteSummaryType } from '../lib/ai/notes/types';

interface NoteSummaryComponentProps {
  summary: NoteSummaryType | null;
  isLoading?: boolean;
  defaultExpanded?: boolean;
  onRegenerate?: () => void;
  maxLength?: 'brief' | 'medium' | 'detailed';
  onLengthChange?: (length: 'brief' | 'medium' | 'detailed') => void;
}

/**
 * NoteSummary displays an AI-generated summary of note content
 * Supports multiple lengths and key points extraction
 *
 * Design: Warm Editorial Minimalism
 * - Collapsible sections
 * - Clean typography
 * - Subtle AI indicators
 */
export const NoteSummary: React.FC<NoteSummaryComponentProps> = ({
  summary,
  isLoading = false,
  defaultExpanded = true,
  onRegenerate,
  maxLength = 'medium',
  onLengthChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showKeyPoints, setShowKeyPoints] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
        <div className="flex items-center gap-2 animate-pulse">
          <div className="w-4 h-4 bg-stone-200 rounded" />
          <div className="h-4 bg-stone-200 rounded w-32" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-3 bg-stone-200 rounded w-full" />
          <div className="h-3 bg-stone-200 rounded w-5/6" />
          <div className="h-3 bg-stone-200 rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const getSummaryText = (): string => {
    switch (maxLength) {
      case 'brief':
        return summary.brief;
      case 'detailed':
        return summary.detailed;
      case 'medium':
      default:
        return summary.medium;
    }
  };

  const lengthOptions: Array<{ value: 'brief' | 'medium' | 'detailed'; label: string }> = [
    { value: 'brief', label: 'Brief' },
    { value: 'medium', label: 'Medium' },
    { value: 'detailed', label: 'Detailed' },
  ];

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 group"
          >
            <svg
              className={`w-4 h-4 text-amber-600 transition-transform ${
                isExpanded ? 'rotate-0' : '-rotate-90'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <span className="text-sm font-medium text-stone-700">AI Summary</span>
            <span className="text-xs text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full">AI</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Length selector */}
            <div className="flex items-center bg-stone-100 rounded-lg p-0.5">
              {lengthOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => onLengthChange?.(option.value)}
                  className={`
                    text-xs px-2 py-1 rounded-md transition-colors
                    ${
                      maxLength === option.value
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-700'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Regenerate button */}
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1.5 text-stone-400 hover:text-amber-600 transition-colors"
                title="Regenerate summary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Summary Text */}
          <p className="text-sm text-stone-700 leading-relaxed">{getSummaryText()}</p>

          {/* Key Points Toggle */}
          {summary.keyPoints.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowKeyPoints(!showKeyPoints)}
                className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${showKeyPoints ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                Key Points ({summary.keyPoints.length})
              </button>

              {showKeyPoints && (
                <ul className="mt-2 space-y-1.5 pl-4">
                  {summary.keyPoints.map((point: string, index: number) => (
                    <li key={index} className="text-sm text-stone-600 flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-xs text-stone-400">
              Generated {summary.generatedAt.toLocaleDateString()}
            </span>
            <span className="text-xs text-stone-400">
              {getSummaryText().split(/\s+/).length} words
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteSummary;
