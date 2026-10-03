'use client';

import React from 'react';
import Link from 'next/link';
import { openCommandPalette } from './CommandPalette';
import { ArrowLeftIcon, NoteChainMark, SearchIcon } from './appNav';

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
    <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-x-4 border-b border-stone-200/70 bg-white/80 px-4 backdrop-blur-md sm:px-6 md:h-16 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {showBackButton ? (
          <Link
            href={backHref || '/dashboard'}
            className="-ml-1.5 flex items-center gap-1 rounded-lg p-1.5 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Back</span>
          </Link>
        ) : (
          <Link href="/dashboard" className="md:hidden" aria-label="Home">
            <NoteChainMark className="h-7 w-7" />
          </Link>
        )}

        {pageTitle && (
          <h1 className="truncate font-serif text-xl font-medium leading-tight text-stone-900">
            {pageTitle}
          </h1>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <button
          type="button"
          aria-label="Search"
          className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 md:hidden"
          onClick={openCommandPalette}
        >
          <SearchIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
