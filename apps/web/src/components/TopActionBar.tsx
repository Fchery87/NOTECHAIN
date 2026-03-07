'use client';

import React from 'react';
import Link from 'next/link';

interface TopActionBarProps {
  pageTitle?: string;
  actions?: React.ReactNode;
  showBackButton?: boolean;
  backHref?: string;
}

export default function TopActionBar({
  pageTitle,
  actions,
  showBackButton,
  backHref,
}: TopActionBarProps) {
  return (
    <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-x-4 border-b border-stone-200 bg-white/80 px-4 backdrop-blur-md sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex items-center flex-1 gap-4">
        {/* Mobile menu button slot if needed in future, currently handled by bottom nav */}

        {showBackButton && (
          <Link
            href={backHref || '/dashboard'}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </Link>
        )}

        {pageTitle && (
          <div className="flex items-center">
            <h1 className="font-serif text-xl font-semibold text-stone-900 leading-tight">
              {pageTitle}
            </h1>
          </div>
        )}
      </div>

      {/* Search / Command Hint (Desktop) */}
      <div className="hidden md:flex items-center mr-4">
        <button
          onClick={() =>
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
          }
          className="flex items-center gap-2 text-xs text-stone-400 font-mono px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 transition-colors"
        >
          <SearchIcon className="w-3.5 h-3.5" />
          <span>⌘K</span>
        </button>
      </div>

      <div className="flex items-center gap-x-4 lg:gap-x-6">
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {/* Mobile Search Button */}
        <button
          className="md:hidden text-stone-500 p-2 hover:bg-stone-100 rounded-lg"
          onClick={() =>
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
          }
        >
          <SearchIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}
