'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotesSync } from '@/lib/sync/useNotesSync';
import { noteHref, notePlainText } from '@/lib/notes/noteLinks';
import {
  appNavItems,
  NEW_NOTE_HREF,
  NotesIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  type IconProps,
} from './appNav';

const OPEN_EVENT = 'notechain:open-command-palette';

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

interface PaletteItem {
  id: string;
  group: 'Actions' | 'Go to' | 'Notes';
  title: string;
  subtitle?: string;
  href: string;
  shortcut?: string;
  icon: (p: IconProps) => React.ReactElement;
}

const commandItems: PaletteItem[] = [
  {
    id: 'new-note',
    group: 'Actions',
    title: 'New note',
    href: NEW_NOTE_HREF,
    shortcut: 'C',
    icon: PlusIcon,
  },
  ...appNavItems.map(item => ({
    id: item.href,
    group: 'Go to' as const,
    title: item.label,
    href: item.href,
    shortcut: `G ${item.jumpKey.toUpperCase()}`,
    icon: item.icon,
  })),
  { id: '/settings', group: 'Go to', title: 'Settings', href: '/settings', icon: SettingsIcon },
];

/**
 * Global keyboard layer: ⌘K / Ctrl+K toggles the palette, `C` starts a note,
 * and `G` followed by a nav key jumps to that page.
 */
export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let pendingJump: number | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(open => !open);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      const key = e.key.toLowerCase();
      if (pendingJump !== null) {
        window.clearTimeout(pendingJump);
        pendingJump = null;
        const target = appNavItems.find(item => item.jumpKey === key);
        if (target) {
          e.preventDefault();
          router.push(target.href);
        }
        return;
      }
      if (key === 'g') {
        pendingJump = window.setTimeout(() => (pendingJump = null), 1200);
      } else if (key === 'c') {
        e.preventDefault();
        router.push(NEW_NOTE_HREF);
      }
    };
    const handleOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener(OPEN_EVENT, handleOpen);
    return () => {
      if (pendingJump !== null) window.clearTimeout(pendingJump);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener(OPEN_EVENT, handleOpen);
    };
  }, [router]);

  if (!isOpen) return null;

  return (
    <PaletteDialog
      onClose={() => setIsOpen(false)}
      onSelect={href => {
        setIsOpen(false);
        router.push(href);
      }}
    />
  );
}

function PaletteDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (href: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [notes, setNotes] = useState<PaletteItem[] | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { loadCachedNotes, isEncryptionReady } = useNotesSync();

  useEffect(() => {
    if (!isEncryptionReady) return;
    let cancelled = false;
    loadCachedNotes()
      .then(loaded => {
        if (cancelled) return;
        setNotes(
          [...loaded]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map(note => ({
              id: `note:${note.id}`,
              group: 'Notes' as const,
              title: note.title || 'Untitled',
              subtitle: notePlainText(note.content).slice(0, 140),
              href: noteHref(note.id),
              icon: NotesIcon,
            }))
        );
      })
      .catch(() => !cancelled && setNotes([]));
    return () => {
      cancelled = true;
    };
  }, [isEncryptionReady, loadCachedNotes]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...commandItems, ...(notes ?? []).slice(0, 5)];
    const matches = (item: PaletteItem) =>
      item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q);
    return [...(notes ?? []).filter(matches).slice(0, 8), ...commandItems.filter(matches)];
  }, [query, notes]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (items.length === 0 ? 0 : (i + 1) % items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length));
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing && items[activeIndex]) {
      e.preventDefault();
      onSelect(items[activeIndex].href);
    }
  };

  let lastGroup: PaletteItem['group'] | null = null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh] sm:pt-[18vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onKeyDown={handleKeyDown}
    >
      <div
        className="fixed inset-0 animate-palette-backdrop bg-stone-900/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl animate-palette-in overflow-hidden rounded-2xl bg-white shadow-2xl shadow-stone-900/20 ring-1 ring-stone-200">
        <div className="flex items-center border-b border-stone-100 px-4">
          <SearchIcon className="mr-3 h-5 w-5 shrink-0 text-stone-400" />
          <input
            autoFocus
            className="w-full bg-transparent py-4 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus-visible:outline-none"
            placeholder="Search notes or jump to…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-activedescendant={items[activeIndex] ? `cmd-${activeIndex}` : undefined}
          />
          <kbd className="ml-3 shrink-0 rounded border border-stone-200 px-1.5 py-0.5 font-mono text-[10px] text-stone-400">
            ESC
          </kbd>
        </div>

        <div
          ref={listRef}
          id="command-palette-results"
          role="listbox"
          className="max-h-[min(24rem,60vh)] overflow-y-auto p-2"
        >
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-stone-500">
              {notes === null ? 'Decrypting your notes…' : `Nothing matches “${query}”.`}
            </div>
          ) : (
            items.map((item, index) => {
              const Icon = item.icon;
              const showHeader = item.group !== lastGroup;
              lastGroup = item.group;
              const active = index === activeIndex;
              return (
                <div key={item.id}>
                  {showHeader && (
                    <div className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400 first:pt-1">
                      {item.group === 'Notes' && !query ? 'Recent notes' : item.group}
                    </div>
                  )}
                  <button
                    type="button"
                    id={`cmd-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={active}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => onSelect(item.href)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus:outline-none ${
                      active ? 'bg-stone-100 text-stone-900' : 'text-stone-700'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? 'text-amber-600' : 'text-stone-400'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.title}</span>
                      {item.subtitle && (
                        <span className="block truncate text-xs text-stone-500">
                          {item.subtitle}
                        </span>
                      )}
                    </span>
                    {item.shortcut && (
                      <kbd className="shrink-0 rounded border border-stone-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-stone-400">
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-stone-100 bg-stone-50/70 px-4 py-2 text-[11px] text-stone-400">
          <span>
            <kbd className="font-mono">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> open
          </span>
          <span className="ml-auto flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Searched on this device. Nothing leaves it.
          </span>
        </div>
      </div>
    </div>
  );
}
