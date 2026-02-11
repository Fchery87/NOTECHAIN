'use client';

import React from 'react';
import dynamic, { DynamicOptions, Loader } from 'next/dynamic';
import { ComponentType } from 'react';

/**
 * Code splitting configuration for Next.js dynamic imports
 *
 * This module provides utilities for lazy loading heavy components
 * to reduce initial bundle size and improve performance.
 */

/**
 * Standard loading timeout (ms)
 */
export const DEFAULT_LOADING_TIMEOUT = 10000;

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Number of retry attempts */
  retries?: number;
  /** Delay between retries (ms) */
  retryDelay?: number;
}

/**
 * Dynamic import options with retry logic
 */
export interface DynamicImportOptions<TProps> extends DynamicOptions<TProps> {
  /** Component name for debugging */
  componentName?: string;
  /** Retry configuration */
  retry?: RetryConfig;
}

/**
 * Create a lazy-loaded component with retry logic
 *
 * @example
 * ```tsx
 * const NoteEditor = createLazyComponent(
 *   () => import('./NoteEditor'),
 *   { componentName: 'NoteEditor' }
 * );
 * ```
 */
export function createLazyComponent<TProps>(
  loader: Loader<TProps>,
  options: DynamicImportOptions<TProps> = {}
): ComponentType<TProps> {
  const { componentName, retry = { retries: 3, retryDelay: 1000 }, ...dynamicOptions } = options;

  const loaderWithRetry = createRetryableLoader(loader, componentName, retry);

  return dynamic(loaderWithRetry, {
    ssr: false,
    ...dynamicOptions,
  });
}

/**
 * Create a retryable loader wrapper
 */
function createRetryableLoader<TProps>(
  loader: Loader<TProps>,
  componentName?: string,
  retry: RetryConfig = { retries: 3, retryDelay: 1000 }
): Loader<TProps> {
  const { retries = 3, retryDelay = 1000 } = retry;

  return async () => {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const loadedModule = await (loader as () => Promise<any>)();
        return loadedModule;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries - 1) {
          console.warn(
            `Failed to load ${componentName || 'component'} (attempt ${attempt + 1}/${retries}). Retrying...`
          );
          await delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    console.error(`Failed to load ${componentName || 'component'} after ${retries} attempts`);
    throw lastError;
  };
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Predefined lazy components for heavy features
 */

// AI Features - Load on demand
export const loadNoteIntelligence = () =>
  import('../ai/notes/NoteIntelligence').then(mod => ({
    default: mod.getNoteIntelligence,
  }));

// Editor Components - paths are relative from src/lib/performance to src/components
export const loadNoteEditor = () =>
  import('../../components/NoteEditor').then(mod => ({
    default: mod.NoteEditor,
  }));

export const loadNoteEditorWithSelection = () =>
  import('../../components/NoteEditorWithSelection').then(mod => ({
    default: mod.NoteEditorWithSelection,
  }));

// PDF Components
export const loadPDFViewer = () =>
  import('../../components/PDFViewer').then(mod => ({
    default: mod.PDFViewer,
  }));

// Calendar Components
export const loadCalendarView = () =>
  import('../../components/CalendarView').then(mod => ({
    default: mod.CalendarView,
  }));

// AI Intelligence Components
export const loadNoteSummary = () =>
  import('../../components/NoteSummary').then(mod => ({
    default: mod.NoteSummary,
  }));

export const loadRelatedNotes = () =>
  import('../../components/RelatedNotes').then(mod => ({
    default: mod.RelatedNotes,
  }));

export const loadAutoTags = () =>
  import('../../components/AutoTags').then(mod => ({
    default: mod.AutoTags,
  }));

export const loadLinkSuggestions = () =>
  import('../../components/LinkSuggestions').then(mod => ({
    default: mod.LinkSuggestions,
  }));

// Form Components
export const loadSignatureCapture = () =>
  import('../../components/SignatureCapture').then(mod => ({
    default: mod.SignatureCapture,
  }));

// Upgrade Prompt
export const loadProUpgradePrompt = () =>
  import('../../components/ProUpgradePrompt').then(mod => ({
    default: mod.ProUpgradePrompt,
  }));

/**
 * Preload a component before it's needed
 * Call this on user interactions (hover, focus) for perceived performance
 *
 * @example
 * ```tsx
 * <button
 *   onMouseEnter={() => preloadComponent(loadNoteEditor)}
 *   onClick={() => setShowEditor(true)}
 * >
 *   Open Editor
 * </button>
 * ```
 */
export function preloadComponent<T>(loader: () => Promise<T>): void {
  // Use requestIdleCallback for non-critical preloading
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      loader().catch(() => {
        // Silently fail - preloading is optional
      });
    });
  } else {
    // Fallback: preload after a short delay
    setTimeout(() => {
      loader().catch(() => {
        // Silently fail
      });
    }, 100);
  }
}

/**
 * Prefetch multiple components at once
 * Useful when navigating to a page with many lazy-loaded components
 */
export function prefetchComponents(loaders: ReadonlyArray<() => Promise<unknown>>): void {
  loaders.forEach(loader => preloadComponent(loader));
}

/**
 * Component chunk mapping for manual prefetching
 */
export const componentChunks = {
  editor: [loadNoteEditor, loadNoteEditorWithSelection],
  pdf: [loadPDFViewer],
  ai: [loadNoteIntelligence, loadNoteSummary, loadRelatedNotes, loadAutoTags, loadLinkSuggestions],
  calendar: [loadCalendarView],
  forms: [loadSignatureCapture],
} as const;

/**
 * Prefetch all components for a specific feature
 *
 * @example
 * ```tsx
 * // When user navigates to notes section
 * useEffect(() => {
 *   prefetchFeature('editor');
 * }, []);
 * ```
 */
export function prefetchFeature(feature: keyof typeof componentChunks): void {
  const loaders = componentChunks[feature];
  if (loaders) {
    prefetchComponents(loaders);
  }
}

/**
 * Create a preload trigger component
 * Wraps children with hover/focus handlers to preload components
 */
interface PreloadTriggerProps {
  children: React.ReactNode;
  loaders: ReadonlyArray<() => Promise<unknown>>;
}

export function PreloadTrigger({ children, loaders }: PreloadTriggerProps) {
  const handlePreload = () => {
    prefetchComponents(loaders);
  };

  return (
    <div onMouseEnter={handlePreload} onFocus={handlePreload}>
      {children}
    </div>
  );
}

/**
 * Error boundary fallback for dynamic imports
 */
export function DynamicImportError({ retry }: { retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-stone-50 rounded-xl">
      <p className="text-stone-600 mb-4">Failed to load component</p>
      <button
        onClick={retry}
        className="
          px-4 py-2
          bg-stone-900 text-stone-50
          font-medium rounded-lg
          hover:bg-stone-800
          transition-colors
        "
      >
        Retry
      </button>
    </div>
  );
}

export default {
  createLazyComponent,
  preloadComponent,
  prefetchComponents,
  prefetchFeature,
  componentChunks,
};
