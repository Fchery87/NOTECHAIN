'use client';

import { ReactNode } from 'react';
import AppHeader from './AppHeader';

interface AppLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  showBackButton?: boolean;
  backHref?: string;
  actions?: React.ReactNode;
  fullWidth?: boolean;
}

export default function AppLayout({
  children,
  pageTitle,
  showBackButton,
  backHref,
  actions,
  fullWidth = false,
}: AppLayoutProps) {
  const hasPageHeader = pageTitle || showBackButton;
  const headerHeight = hasPageHeader ? 'h-30' : 'h-16';

  return (
    <div className="min-h-screen bg-stone-50">
      <AppHeader
        pageTitle={pageTitle}
        showBackButton={showBackButton}
        backHref={backHref}
        actions={actions}
      />

      <main className={`pt-${headerHeight} pb-12`}>
        <div className={fullWidth ? 'w-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-rose-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">N</span>
              </div>
              <span className="font-serif text-sm font-medium text-stone-700">NoteChain</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-stone-500">
              <a href="/settings" className="hover:text-stone-900 transition-colors">
                Settings
              </a>
              <a href="/help" className="hover:text-stone-900 transition-colors">
                Help
              </a>
              <a href="/privacy" className="hover:text-stone-900 transition-colors">
                Privacy
              </a>
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-400">
              <svg
                className="w-4 h-4 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>End-to-end encrypted</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-400">
              © {new Date().getFullYear()} NoteChain. Your thoughts, encrypted, yours alone.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
