'use client';

import { SyncDebugPanel } from '@/components/SyncDebugPanel';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl font-medium text-stone-900">NoteChain</span>
              <span className="text-xs text-stone-400">|</span>
              <span className="text-sm text-stone-600">Dashboard</span>
            </div>

            <nav className="flex items-center gap-6">
              <a
                href="/notes"
                className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
              >
                Notes
              </a>
              <a
                href="/todos"
                className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
              >
                Todos
              </a>
              <a
                href="/calendar"
                className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
              >
                Calendar
              </a>
              <a
                href="/pdfs"
                className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
              >
                PDFs
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Notes Card */}
          <a
            href="/notes"
            className="group block bg-white rounded-2xl shadow-sm border border-stone-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
              <svg
                className="w-6 h-6 text-amber-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-stone-900 mb-2">Notes</h2>
            <p className="text-sm text-stone-600">
              Create and manage your encrypted notes with AI assistance.
            </p>
          </a>

          {/* Todos Card */}
          <a
            href="/todos"
            className="group block bg-white rounded-2xl shadow-sm border border-stone-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
              <svg
                className="w-6 h-6 text-amber-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-stone-900 mb-2">Todos</h2>
            <p className="text-sm text-stone-600">Manage tasks with AI-powered prioritization.</p>
          </a>

          {/* Calendar Card */}
          <a
            href="/calendar"
            className="group block bg-white rounded-2xl shadow-sm border border-stone-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
              <svg
                className="w-6 h-6 text-amber-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-stone-900 mb-2">Calendar</h2>
            <p className="text-sm text-stone-600">View events and sync with external calendars.</p>
          </a>

          {/* PDFs Card */}
          <a
            href="/pdfs"
            className="group block bg-white rounded-2xl shadow-sm border border-stone-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
              <svg
                className="w-6 h-6 text-amber-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-stone-900 mb-2">PDFs</h2>
            <p className="text-sm text-stone-600">
              View, annotate, and sign PDF documents securely.
            </p>
          </a>

          {/* Search Card */}
          <a
            href="/search"
            className="group block bg-white rounded-2xl shadow-sm border border-stone-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
              <svg
                className="w-6 h-6 text-amber-700"
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
            <h2 className="text-lg font-medium text-stone-900 mb-2">Search</h2>
            <p className="text-sm text-stone-600">Search across all your encrypted content.</p>
          </a>

          {/* Settings Card */}
          <a
            href="/settings"
            className="group block bg-white rounded-2xl shadow-sm border border-stone-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
              <svg
                className="w-6 h-6 text-amber-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-stone-900 mb-2">Settings</h2>
            <p className="text-sm text-stone-600">Manage your account and encryption keys.</p>
          </a>
        </div>
      </main>

      {/* Sync Debug Panel - Development Tool */}
      <SyncDebugPanel />
    </div>
  );
}
