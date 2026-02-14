'use client';

import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';

// Mock search results
interface SearchResult {
  id: string;
  type: 'note' | 'todo' | 'pdf';
  title: string;
  content: string;
  updatedAt: Date;
}

const mockSearchData: SearchResult[] = [
  {
    id: '1',
    type: 'note',
    title: 'Project Ideas',
    content:
      'AI Features: Implement local LLM for note summarization and context-aware suggestions.',
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: '2',
    type: 'note',
    title: 'Meeting Notes - Team Sync',
    content: 'Attendees: Sarah, Mike, Alex. Agenda: Review Q1 goals, discuss new features.',
    updatedAt: new Date(Date.now() - 172800000),
  },
  {
    id: '3',
    type: 'todo',
    title: 'Complete NoteChain documentation',
    content: 'Write comprehensive docs for all features including encryption and AI.',
    updatedAt: new Date(),
  },
  {
    id: '4',
    type: 'todo',
    title: 'Review encryption implementation',
    content: 'High priority task - ensure all data is properly encrypted.',
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: '5',
    type: 'pdf',
    title: 'Project_Proposal.pdf',
    content: '12 pages • Project proposal document with encryption details.',
    updatedAt: new Date(Date.now() - 86400000 * 3),
  },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'notes' | 'todos' | 'pdfs'>('all');

  const filteredResults = useMemo(() => {
    let results = mockSearchData;

    // Filter by type
    if (activeFilter !== 'all') {
      results = results.filter(r => {
        if (activeFilter === 'notes') return r.type === 'note';
        if (activeFilter === 'todos') return r.type === 'todo';
        if (activeFilter === 'pdfs') return r.type === 'pdf';
        return true;
      });
    }

    // Filter by query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        r =>
          r.title.toLowerCase().includes(lowerQuery) || r.content.toLowerCase().includes(lowerQuery)
      );
    }

    return results;
  }, [query, activeFilter]);

  const getTypeIcon = (type: string) => {
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
      case 'todo':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        );
      case 'pdf':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'note':
        return 'bg-amber-100 text-amber-800';
      case 'todo':
        return 'bg-green-100 text-green-800';
      case 'pdf':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-stone-100 text-stone-800';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getResultLink = (result: SearchResult) => {
    switch (result.type) {
      case 'note':
        return '/notes';
      case 'todo':
        return '/todos';
      case 'pdf':
        return '/pdfs';
      default:
        return '#';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <AppLayout>
      <div className="py-6 max-w-4xl mx-auto">
        {/* Search Bar */}
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
              onChange={e => setQuery(e.target.value)}
              placeholder="Search your encrypted notes, todos, and documents..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          {(['all', 'notes', 'todos', 'pdfs'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter
                  ? 'bg-stone-900 text-stone-50'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="space-y-3">
          {filteredResults.length > 0 ? (
            <>
              <p className="text-sm text-stone-500 mb-4">
                {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} found
              </p>
              {filteredResults.map(result => (
                <a
                  key={result.id}
                  href={getResultLink(result)}
                  className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(result.type)}`}
                    >
                      {getTypeIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-stone-900 truncate">{result.title}</h3>
                        <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                          {getTypeLabel(result.type)}
                        </span>
                      </div>
                      <p className="text-sm text-stone-600 line-clamp-2">{result.content}</p>
                      <p className="text-xs text-stone-400 mt-2">
                        Modified {formatDate(result.updatedAt)}
                      </p>
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
              <h3 className="text-lg font-medium text-stone-900 mb-2">No results found</h3>
              <p className="text-stone-600">
                {query
                  ? `No matches for "${query}". Try different keywords.`
                  : 'Start typing to search your encrypted content.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
