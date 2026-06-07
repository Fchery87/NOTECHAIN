'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Listen for Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(open => !open);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] sm:pt-[25vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-xl mx-4 transform overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-stone-200 transition-all">
        {/* Input */}
        <div className="relative border-b border-stone-100 flex items-center px-4 py-4">
          <SearchIcon className="h-5 w-5 text-amber-500 mr-3 shrink-0" />
          <input
            ref={inputRef}
            className="w-full bg-transparent text-stone-900 placeholder:text-stone-400 focus:outline-none sm:text-lg"
            placeholder="Search notes, jump to page, or run a command..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="ml-3 shrink-0 text-xs font-mono text-stone-400">ESC</div>
        </div>

        {/* Results Stream (Simulated for foundation) */}
        <div className="max-h-96 overflow-y-auto py-2">
          {!query && (
            <div className="px-4 py-2">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">
                Jump to
              </div>
              <ul className="space-y-1">
                <CommandItem
                  onClick={() => handleAction('/dashboard')}
                  icon={<HomeIcon />}
                  title="Dashboard"
                  shortcut="G H"
                />
                <CommandItem
                  onClick={() => handleAction('/notes')}
                  icon={<NotesIcon />}
                  title="Notes"
                  shortcut="G N"
                />
                <CommandItem
                  onClick={() => handleAction('/tasks')}
                  icon={<TasksIcon />}
                  title="Tasks"
                  shortcut="G T"
                />
              </ul>
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2 mt-4">
                Actions
              </div>
              <ul className="space-y-1">
                <CommandItem
                  onClick={() => handleAction('/notes/new')}
                  icon={<PlusIcon />}
                  title="Create new Note"
                  shortcut="C"
                />
                <CommandItem
                  onClick={() => handleAction('/settings')}
                  icon={<SettingsIcon />}
                  title="Settings"
                />
              </ul>
            </div>
          )}
          {query && (
            <div className="px-4 py-12 text-center text-sm text-stone-500">
              No results found for "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommandItem({
  onClick,
  icon,
  title,
  shortcut,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  shortcut?: string;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors focus:bg-stone-100 focus:outline-none"
      >
        <div className="text-stone-400">{icon}</div>
        <span className="font-medium text-left flex-1">{title}</span>
        {shortcut && (
          <span className="text-xs font-mono text-stone-400 bg-white px-1.5 py-0.5 rounded border border-stone-200 shadow-sm">
            {shortcut}
          </span>
        )}
      </button>
    </li>
  );
}

// Icons
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

function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  );
}
