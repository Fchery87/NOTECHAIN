'use client';

/**
 * Dynamic Component Exports
 *
 * This module exports lazy-loaded versions of heavy components.
 * Use these instead of direct imports for better performance.
 *
 * @example
 * ```tsx
 * import { NoteEditor } from './components/dynamic';
 *
 * function Page() {
 *   return <NoteEditor content={content} onChange={handleChange} />;
 * }
 * ```
 */

import dynamic from 'next/dynamic';
import { EditorSkeleton, PDFSkeleton, CardSkeleton } from './LoadingSpinner';

// Note Editor - Heavy component with TipTap dependencies
export const NoteEditor = dynamic(() => import('./NoteEditor').then(mod => mod.NoteEditor), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

// Note Editor with Selection - Even heavier
export const NoteEditorWithSelection = dynamic(
  () => import('./NoteEditorWithSelection').then(mod => mod.NoteEditorWithSelection),
  {
    ssr: false,
    loading: () => <EditorSkeleton />,
  }
);

// PDF Viewer - Heavy PDF library dependencies
export const PDFViewer = dynamic(() => import('./PDFViewer').then(mod => mod.PDFViewer), {
  ssr: false,
  loading: () => <PDFSkeleton />,
});

// Calendar View - Complex calendar component
export const CalendarView = dynamic(() => import('./CalendarView').then(mod => mod.CalendarView), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-stone-100 rounded-xl animate-pulse" aria-label="Loading calendar" />
  ),
});

// AI Components - Loaded on demand
export const NoteSummary = dynamic(() => import('./NoteSummary').then(mod => mod.NoteSummary), {
  ssr: false,
  loading: () => (
    <div className="p-4 bg-stone-50 rounded-xl animate-pulse">
      <div className="h-4 bg-stone-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-stone-200 rounded w-1/2" />
    </div>
  ),
});

export const RelatedNotes = dynamic(() => import('./RelatedNotes').then(mod => mod.RelatedNotes), {
  ssr: false,
  loading: () => <CardSkeleton count={3} />,
});

export const AutoTags = dynamic(() => import('./AutoTags').then(mod => mod.AutoTags), {
  ssr: false,
  loading: () => (
    <div className="flex gap-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="w-16 h-6 bg-stone-200 rounded-full animate-pulse" />
      ))}
    </div>
  ),
});

export const LinkSuggestions = dynamic(
  () => import('./LinkSuggestions').then(mod => mod.LinkSuggestions),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-10 bg-stone-100 rounded-lg animate-pulse" />
        ))}
      </div>
    ),
  }
);

// Form Components
export const SignatureCapture = dynamic(
  () => import('./SignatureCapture').then(mod => mod.SignatureCapture),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-48 bg-stone-100 rounded-xl border-2 border-dashed border-stone-300 animate-pulse" />
    ),
  }
);

// Upgrade Prompt
export const ProUpgradePrompt = dynamic(
  () => import('./ProUpgradePrompt').then(mod => mod.ProUpgradePrompt),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 bg-gradient-to-br from-amber-50 to-rose-50 rounded-2xl animate-pulse">
        <div className="h-6 bg-stone-200 rounded w-1/2 mb-4" />
        <div className="h-4 bg-stone-200 rounded w-3/4" />
      </div>
    ),
  }
);

// Re-export types
export type { NoteEditorProps } from './NoteEditor';
export type { PDFViewerProps } from './PDFViewer';
