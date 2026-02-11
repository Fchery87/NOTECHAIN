'use client';

import { useState } from 'react';

const helpTopics = [
  {
    category: 'Getting Started',
    articles: [
      { title: 'Creating your first note', id: 'first-note' },
      { title: 'Understanding encryption', id: 'encryption' },
      { title: 'Sync across devices', id: 'sync' },
    ],
  },
  {
    category: 'Editor',
    articles: [
      { title: 'Formatting with Markdown', id: 'markdown' },
      { title: 'Using the AI assistant', id: 'ai' },
      { title: 'Adding tags', id: 'tags' },
    ],
  },
  {
    category: 'Security',
    articles: [
      { title: 'Recovery key backup', id: 'recovery' },
      { title: 'Changing your password', id: 'password' },
      { title: 'Two-factor authentication', id: '2fa' },
    ],
  },
  {
    category: 'Troubleshooting',
    articles: [
      { title: 'Sync issues', id: 'sync-issues' },
      { title: 'Performance tips', id: 'performance' },
      { title: 'Exporting your data', id: 'export' },
    ],
  },
];

export default function HelpCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  const filteredTopics = helpTopics
    .map(topic => ({
      ...topic,
      articles: topic.articles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter(topic => topic.articles.length > 0);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 w-12 h-12 bg-stone-900 text-stone-50 rounded-full shadow-lg hover:bg-stone-800 transition-all hover:scale-110 flex items-center justify-center"
        title="Help Center"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-96 max-h-[600px] overflow-hidden flex flex-col animate-fade-in">
        <div className="p-4 border-b border-stone-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-medium text-stone-900">Help Center</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search help articles..."
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5 text-stone-400"
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
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {selectedArticle ? (
            <div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-4 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>
              <h3 className="font-medium text-lg text-stone-900 mb-4">
                {helpTopics.flatMap(t => t.articles).find(a => a.id === selectedArticle)?.title}
              </h3>
              <p className="text-stone-600 leading-relaxed">
                This article content would be loaded from the documentation. For now, visit our docs
                at docs.notechain.app
              </p>
              <a
                href="https://docs.notechain.app"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
              >
                View full documentation
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTopics.map(topic => (
                <div key={topic.category}>
                  <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">
                    {topic.category}
                  </h3>
                  <ul className="space-y-1">
                    {topic.articles.map(article => (
                      <li key={article.id}>
                        <button
                          onClick={() => setSelectedArticle(article.id)}
                          className="w-full text-left px-3 py-2 rounded-lg text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors flex items-center justify-between group"
                        >
                          {article.title}
                          <svg
                            className="w-4 h-4 text-stone-300 group-hover:text-stone-400"
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
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="pt-4 border-t border-stone-100">
                <a
                  href="mailto:support@notechain.app"
                  className="flex items-center gap-3 p-3 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-amber-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-stone-900">Contact Support</p>
                    <p className="text-sm text-stone-500">Get help from our team</p>
                  </div>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
