'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { MeetingFollowUps } from '@/components/MeetingFollowUps';
import { SyncDebugPanel } from '@/components/SyncDebugPanel';
import { openCommandPalette } from '@/components/CommandPalette';
import {
  LockIcon,
  MeetingsIcon,
  NEW_NOTE_HREF,
  NotesIcon,
  PlusIcon,
  SearchIcon,
} from '@/components/appNav';
import { useUser } from '@/lib/supabase/UserProvider';
import { useNotesSync } from '@/lib/sync/useNotesSync';
import { localTaskAdapter, type Task } from '@/lib/tasks/taskAdapter';
import { noteHref, notePlainText } from '@/lib/notes/noteLinks';

interface RecentNote {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: Date;
}

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function relativeDay(date: Date) {
  const day = 86_400_000;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const diff = Math.floor((new Date(date).setHours(0, 0, 0, 0) - startOfToday) / day);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const priorityDot: Record<Task['priority'], string> = {
  critical: 'bg-rose-500',
  high: 'bg-amber-500',
  medium: 'bg-stone-400',
  low: 'bg-stone-300',
};

function SectionHeader({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="font-serif text-xl text-stone-900">{title}</h2>
      <Link
        href={href}
        className="text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
      >
        {label}
      </Link>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-stone-100" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const { loadCachedNotes, isEncryptionReady } = useNotesSync();
  const [recentNotes, setRecentNotes] = useState<RecentNote[] | null>(null);
  const [openTasks, setOpenTasks] = useState<Task[] | null>(null);
  const [now] = useState(() => new Date());

  const firstName =
    (user?.user_metadata?.given_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    user?.email?.split('@')[0];

  useEffect(() => {
    if (!isEncryptionReady) return;
    let cancelled = false;
    loadCachedNotes()
      .then(notes => {
        if (cancelled) return;
        setRecentNotes(
          [...notes]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 5)
            .map(note => ({
              id: note.id,
              title: note.title || 'Untitled',
              excerpt: notePlainText(note.content).slice(0, 160),
              updatedAt: note.updatedAt,
            }))
        );
      })
      .catch(() => !cancelled && setRecentNotes([]));
    return () => {
      cancelled = true;
    };
  }, [isEncryptionReady, loadCachedNotes]);

  useEffect(() => {
    let cancelled = false;
    localTaskAdapter
      .listTasks()
      .then(tasks => {
        if (cancelled) return;
        const open = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
        open.sort((a, b) => {
          const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return aDue - bDue;
        });
        setOpenTasks(open.slice(0, 6));
      })
      .catch(() => !cancelled && setOpenTasks([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppLayout pageTitle="Home">
      <header className="mb-10">
        <p className="text-sm text-stone-500">
          {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="mt-1 font-serif text-4xl font-medium tracking-[-0.02em] text-stone-900 md:text-5xl">
          {greeting(now)}
          {firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="mt-3 flex items-center gap-2 text-sm text-stone-500">
          <LockIcon className="h-4 w-4 text-amber-600" />
          End-to-end encrypted. Only you hold the key.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={NEW_NOTE_HREF}
            className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-stone-50 transition-all duration-300 hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20"
          >
            <PlusIcon className="h-4 w-4" />
            New note
          </Link>
          <Link
            href="/meetings"
            className="inline-flex items-center gap-2 rounded-lg bg-stone-100 px-4 py-2.5 text-sm font-medium text-stone-800 transition-all duration-300 hover:bg-stone-200"
          >
            <MeetingsIcon className="h-4 w-4" />
            Capture a meeting
          </Link>
          <button
            type="button"
            onClick={openCommandPalette}
            className="inline-flex items-center gap-2 rounded-lg bg-stone-100 px-4 py-2.5 text-sm font-medium text-stone-800 transition-all duration-300 hover:bg-stone-200"
          >
            <SearchIcon className="h-4 w-4" />
            Search
            <kbd className="rounded border border-stone-300/70 px-1 font-mono text-[10px] text-stone-500">
              ⌘K
            </kbd>
          </button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <SectionHeader title="Recent notes" href="/notes" label="All notes" />
          <div className="overflow-hidden rounded-2xl border border-stone-200/70 bg-white">
            {recentNotes === null ? (
              <RowSkeleton />
            ) : recentNotes.length === 0 ? (
              <div className="p-8 text-center">
                <NotesIcon className="mx-auto h-6 w-6 text-stone-300" />
                <p className="mt-3 text-sm font-medium text-stone-700">No notes yet</p>
                <p className="mt-1 text-sm text-stone-500">
                  Press <kbd className="rounded border border-stone-200 px-1 font-mono">C</kbd>{' '}
                  anywhere to start one.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {recentNotes.map(note => (
                  <li key={note.id}>
                    <Link
                      href={noteHref(note.id)}
                      className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-stone-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-stone-900 group-hover:text-amber-800">
                          {note.title}
                        </p>
                        {note.excerpt && (
                          <p className="mt-0.5 line-clamp-1 text-sm text-stone-500">
                            {note.excerpt}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 pt-0.5 text-xs text-stone-400">
                        {relativeDay(note.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="lg:col-span-2">
          <SectionHeader title="Open tasks" href="/tasks" label="All tasks" />
          <div className="overflow-hidden rounded-2xl border border-stone-200/70 bg-white">
            {openTasks === null ? (
              <RowSkeleton />
            ) : openTasks.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-stone-700">You&apos;re all caught up</p>
                <p className="mt-1 text-sm text-stone-500">
                  Tasks from notes and meetings will collect here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {openTasks.map(task => {
                  const overdue =
                    task.dueDate &&
                    new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
                  return (
                    <li key={task.id}>
                      <Link
                        href="/tasks"
                        className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-stone-50"
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${priorityDot[task.priority] ?? 'bg-stone-300'}`}
                          title={`${task.priority} priority`}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-stone-800">
                          {task.title}
                        </span>
                        {task.dueDate && (
                          <span
                            className={`shrink-0 text-xs ${overdue ? 'font-medium text-rose-600' : 'text-stone-400'}`}
                          >
                            {relativeDay(task.dueDate)}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="mt-10">
        <MeetingFollowUps />
      </div>

      <p className="mt-2 text-sm text-stone-400">
        Also in your workspace:{' '}
        <Link href="/pdfs" className="font-medium text-stone-600 hover:text-stone-900">
          PDFs
        </Link>
      </p>

      {process.env.NODE_ENV !== 'production' && <SyncDebugPanel />}
    </AppLayout>
  );
}
