'use client';

import AppLayout from '@/components/AppLayout';
import { MeetingFollowUps } from '@/components/MeetingFollowUps';
import { SyncDebugPanel } from '@/components/SyncDebugPanel';
import { isSharedSpacesSurfaceEnabled } from '@/lib/launchScope';

export default function DashboardPage() {
  return (
    <AppLayout pageTitle="Dashboard">
      <div className="py-8 max-w-5xl mx-auto">
        <div className="mb-10 text-center md:text-left">
          <h1 className="font-serif text-3xl md:text-4xl text-stone-900 mb-3 tracking-tight">
            Welcome back
          </h1>
          <p className="text-stone-500">What would you like to focus on today?</p>
        </div>

        <MeetingFollowUps />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Notes Card */}
          <a
            href="/notes"
            className="group block bg-white rounded-3xl border border-stone-100 p-8 hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300"
          >
            <div className="w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg
                className="w-5 h-5 text-stone-900 group-hover:text-amber-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-stone-900 mb-2">Notes</h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              Create and manage your encrypted notes with AI assistance.
            </p>
          </a>

          {/* Tasks Card */}
          <a
            href="/tasks"
            className="group block bg-white rounded-3xl border border-stone-100 p-8 hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300"
          >
            <div className="w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg
                className="w-5 h-5 text-stone-900 group-hover:text-amber-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-stone-900 mb-2">Tasks</h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              Manage tasks with AI-powered prioritization.
            </p>
          </a>

          {/* Calendar Card */}
          <a
            href="/calendar"
            className="group block bg-white rounded-3xl border border-stone-100 p-8 hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300"
          >
            <div className="w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg
                className="w-5 h-5 text-stone-900 group-hover:text-amber-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-stone-900 mb-2">Calendar</h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              View events and sync with external calendars.
            </p>
          </a>

          {/* PDFs Card */}
          <a
            href="/pdfs"
            className="group block bg-white rounded-3xl border border-stone-100 p-8 hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300"
          >
            <div className="w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg
                className="w-5 h-5 text-stone-900 group-hover:text-amber-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-stone-900 mb-2">PDFs</h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              View, annotate, and sign PDF documents securely.
            </p>
          </a>

          {/* Graph Card */}
          <a
            href="/graph"
            className="group block bg-white rounded-3xl border border-stone-100 p-8 hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300"
          >
            <div className="w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg
                className="w-5 h-5 text-stone-900 group-hover:text-amber-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-stone-900 mb-2">Knowledge Map</h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              Explore source-cited context across notes, meetings, and tasks.
            </p>
          </a>

          {isSharedSpacesSurfaceEnabled() && (
            <a
              href="/teams"
              className="group block bg-white rounded-3xl border border-stone-100 p-8 hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300"
            >
              <div className="w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-5 h-5 text-stone-900 group-hover:text-amber-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-stone-900 mb-2">Shared Spaces</h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                Preview trust-gated encrypted collaboration spaces.
              </p>
            </a>
          )}
        </div>
      </div>

      {/* Sync Debug Panel - Development Tool */}
      <SyncDebugPanel />
    </AppLayout>
  );
}
