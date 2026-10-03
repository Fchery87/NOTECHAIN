'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/lib/supabase/UserProvider';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { openCommandPalette } from './CommandPalette';
import {
  appNavItems,
  getInitials,
  isNavActive,
  LockIcon,
  NEW_NOTE_HREF,
  NoteChainMark,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
} from './appNav';

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-auto rounded border border-stone-200 bg-white px-1.5 py-px font-mono text-[10px] text-stone-400">
      {children}
    </kbd>
  );
}

export default function WorkspaceSidebar() {
  const pathname = usePathname();
  const { user, isAdmin } = useUser();

  const userDisplayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.given_name ||
    user?.email?.split('@')[0] ||
    'User';

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-stone-200/80 bg-stone-100/70 md:flex">
      <div className="flex h-16 shrink-0 items-center px-4">
        <Link
          href="/dashboard"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-stone-200/50"
        >
          <NoteChainMark className="h-8 w-8 shrink-0" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-serif text-[17px] font-medium leading-tight text-stone-900">
              NoteChain
            </span>
            <span className="flex items-center gap-1 text-[11px] text-stone-500">
              <LockIcon className="h-3 w-3 text-amber-600" />
              Personal space
            </span>
          </div>
        </Link>
      </div>

      <div className="shrink-0 space-y-1.5 px-3 pb-4">
        <Link
          href={NEW_NOTE_HREF}
          className="flex w-full items-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-stone-50 transition-all duration-300 hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20"
        >
          <PlusIcon className="h-4 w-4" />
          New note
          <kbd className="ml-auto rounded border border-white/15 px-1.5 py-px font-mono text-[10px] text-stone-400">
            C
          </kbd>
        </Link>
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-200/50 hover:text-stone-900"
        >
          <SearchIcon className="h-4 w-4" />
          Search
          <Kbd>⌘K</Kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Main">
        {appNavItems.map(item => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                active
                  ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/70'
                  : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] ${active ? 'text-amber-600' : 'text-stone-400'}`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-stone-200/80 p-3">
        <div className="px-3">
          <SyncStatusIndicator />
        </div>
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-rose-600 transition-colors hover:bg-rose-50"
          >
            <ShieldIcon className="h-3.5 w-3.5" />
            Admin dashboard
          </Link>
        )}
        <Link
          href="/settings"
          className={`group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors ${
            isNavActive(pathname, '/settings') ? 'bg-white shadow-sm' : 'hover:bg-stone-200/50'
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-400 text-xs font-medium text-white">
            {getInitials(userDisplayName)}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-stone-800">{userDisplayName}</span>
            <span className="truncate text-xs text-stone-500">{user?.email || 'Settings'}</span>
          </div>
          <SettingsIcon className="h-4 w-4 text-stone-400 transition-colors group-hover:text-stone-700" />
        </Link>
      </div>
    </aside>
  );
}
