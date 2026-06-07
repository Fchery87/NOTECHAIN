'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  searchCitedContext,
  type CitedContextEntityType,
  type CitedContextSearchResult,
} from '@/lib/search/citedContextSearch';

type SearchFilter = 'all' | 'notes' | 'meetings' | 'segments' | 'tasks';

const FILTER_TYPES: Record<SearchFilter, CitedContextEntityType[] | undefined> = {
  all: undefined,
  notes: ['note'],
  meetings: ['meeting'],
  segments: ['transcript_segment'],
  tasks: ['task'],
};

function getTypeIcon(type: CitedContextEntityType) {
  switch (type) {
    case 'note':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      );
    case 'meeting':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H7l-4 4v-4H5a2 2 0 01-2-2v-8a2 2 0 012-2h2m4-6h2a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 4v-4H3a2 2 0 01-2-2V4a2 2 0 012-2h8z"
          />
        </svg>
      );
    case 'transcript_segment':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h6m-6 4h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
          />
        </svg>
      );
    case 'task':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-6 9l2 2 4-4"
          />
        </svg>
      );
  }
}

function getTypeColor(type: CitedContextEntityType): string {
  switch (type) {
    case 'note':
      return 'bg-stone-100 text-stone-800';
    case 'meeting':
      return 'bg-rose-100 text-rose-800';
    case 'transcript_segment':
      return 'bg-orange-100 text-orange-800';
    case 'task':
      return 'bg-teal-100 text-teal-800';
  }
}

function getTypeLabel(type: CitedContextEntityType): string {
  switch (type) {
    case 'transcript_segment':
      return 'Transcript segment';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');
  const [results, setResults] = useState<CitedContextSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const runSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const nextResults = await searchCitedContext({
          query,
          types: FILTER_TYPES[activeFilter],
          limit: 30,
        });

        if (!isCancelled) {
          setResults(nextResults);
        }
      } catch (error) {
        console.error('Failed to search cited context:', error);
        if (!isCancelled) {
          setResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    runSearch();

    return () => {
      isCancelled = true;
    };
  }, [query, activeFilter]);

  return (
    <AppLayout pageTitle="Search">
      <div className="py-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search source-cited notes, meetings, transcript segments, and tasks..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm"
            />
          </div>
          <p className="mt-3 text-sm text-stone-500">
            Results include citations back to their encrypted local source.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {(['all', 'notes', 'meetings', 'segments', 'tasks'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter
                  ? 'bg-stone-900 text-stone-50'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
              type="button"
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
              Searching encrypted local context…
            </div>
          ) : results.length > 0 ? (
            <>
              <p className="text-sm text-stone-500 mb-4">
                {results.length} cited result{results.length !== 1 ? 's' : ''} found
              </p>
              {results.map(result => (
                <a
                  key={result.id}
                  href={result.citation.href}
                  className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(result.type)}`}
                    >
                      {getTypeIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-medium text-stone-900 truncate">{result.title}</h3>
                        <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                          {getTypeLabel(result.type)}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                          cites {getTypeLabel(result.citation.type).toLowerCase()}
                        </span>
                      </div>
                      <p className="text-sm text-stone-600 line-clamp-2">{result.content}</p>
                      {result.citation.quote && (
                        <blockquote className="mt-3 border-l-2 border-amber-300 pl-3 text-xs text-stone-500 line-clamp-2">
                          “{result.citation.quote}”
                        </blockquote>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-400">
                        <span>Modified {formatDate(result.updatedAt)}</span>
                        {result.citation.meetingId && (
                          <span>· Meeting {result.citation.meetingId}</span>
                        )}
                        {result.citation.transcriptSegmentId && (
                          <span>· Segment {result.citation.transcriptSegmentId}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-stone-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-stone-900 mb-2">No cited results found</h3>
              <p className="text-stone-600">
                {query
                  ? `No local citations matched “${query}”. Try different keywords.`
                  : 'Start typing to search notes, meetings, transcript segments, and tasks.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
