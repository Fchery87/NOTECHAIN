'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/lib/supabase/UserProvider';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { isSharedSpacesSurfaceEnabled } from '@/lib/launchScope';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/notes', label: 'Notes', icon: NotesIcon },
  { href: '/tasks', label: 'Tasks', icon: TasksIcon },
  { href: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { href: '/meetings', label: 'Meetings', icon: MeetingsIcon },
  ...(isSharedSpacesSurfaceEnabled()
    ? [{ href: '/teams', label: 'Shared Spaces', icon: TeamsIcon }]
    : []),
  { href: '/graph', label: 'Knowledge Map', icon: GraphIcon },
];

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}

function NotesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function TasksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function MeetingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function TeamsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function GraphIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default function WorkspaceSidebar() {
  const pathname = usePathname();
  const { user, isAdmin } = useUser();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const userDisplayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.given_name ||
    user?.email?.split('@')[0] ||
    'User';

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 md:flex flex-col bg-[#0a0a0a] border-r border-stone-800 text-stone-300">
      {/* Logo & Workspace Context */}
      <div className="h-16 flex items-center px-4 shrink-0 border-b border-stone-800/60">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 group px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors w-full"
        >
          <div className="relative w-8 h-8 shrink-0">
            <svg
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full transition-transform duration-300 group-hover:scale-105"
            >
              <rect
                x="2"
                y="2"
                width="36"
                height="36"
                rx="8"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white"
              />
              <path
                d="M12 14C12 12.8954 12.8954 12 14 12H20V20H12V14Z"
                fill="currentColor"
                className="text-amber-500"
              />
              <path
                d="M22 12H26C27.1046 12 28 12.8954 28 14V20H22V12Z"
                fill="currentColor"
                className="text-stone-400"
              />
              <path
                d="M12 22H20V28H14C12.8954 28 12 27.1046 12 26V22Z"
                fill="currentColor"
                className="text-stone-400"
              />
              <path
                d="M22 22H28V26C28 27.1046 27.1046 28 26 28H22V22Z"
                fill="currentColor"
                className="text-rose-500"
              />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-serif text-sm font-medium text-white truncate">NoteChain</span>
            <span className="text-[10px] text-stone-500 uppercase tracking-widest font-mono">
              Personal Space
            </span>
          </div>
        </Link>
      </div>

      {/* Global Actions */}
      <div className="px-4 py-4 space-y-2 shrink-0">
        <button
          className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-stone-300 rounded-lg text-sm font-medium transition-all group border border-white/5 hover:border-white/10"
          onClick={() =>
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
          }
        >
          <SearchIcon className="w-4 h-4 text-stone-500 group-hover:text-stone-300 transition-colors" />
          <span>Search...</span>
          <div className="ml-auto flex items-center gap-0.5 opacity-50 text-xs font-mono">
            <span className="text-[10px]">⌘</span>K
          </div>
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 bg-white text-black hover:bg-stone-200 rounded-lg text-sm font-medium transition-all group">
          <PlusIcon className="w-4 h-4" />
          <span>New Note</span>
          <div className="ml-auto flex items-center gap-0.5 opacity-50 text-xs font-mono">C</div>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
        <div className="text-[10px] uppercase font-mono tracking-widest text-stone-500 mb-2 px-3">
          Home
        </div>
        <nav className="space-y-1 mb-6">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'text-stone-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] ${active ? 'text-amber-500' : 'text-stone-500'}`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sync Status / Info */}
        <div className="mt-8 px-3">
          <SyncStatusIndicator />
        </div>
      </div>

      {/* User Footer */}
      <div className="shrink-0 p-4 border-t border-stone-800/60">
        <div className="flex items-center gap-3 group hover:bg-white/5 px-2 py-2 rounded-lg transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-700 to-stone-900 border border-stone-700 flex items-center justify-center text-white text-xs font-medium shrink-0">
            {getInitials(userDisplayName)}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium text-stone-200 truncate">{userDisplayName}</span>
            <span className="text-xs text-stone-500 truncate">{user?.email || 'Settings'}</span>
          </div>
          <SettingsIcon className="w-4 h-4 text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {isAdmin && (
          <Link
            href="/admin"
            className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
          >
            <ShieldIcon className="w-3.5 h-3.5" />
            Admin Dashboard
          </Link>
        )}
      </div>
    </aside>
  );
}
