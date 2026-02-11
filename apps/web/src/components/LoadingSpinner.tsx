'use client';

import React, { memo } from 'react';

/**
 * Loading spinner size options
 */
type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Loading spinner variant options
 */
type SpinnerVariant = 'default' | 'inline' | 'fullscreen' | 'skeleton';

/**
 * Loading spinner props
 */
interface LoadingSpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  text?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Size mapping for spinner
 */
const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4',
};

/**
 * LoadingSpinner component - Accessible loading indicator
 *
 * @example
 * ```tsx
 * <LoadingSpinner size="md" text="Loading notes..." />
 * ```
 */
export const LoadingSpinner = memo(function LoadingSpinner({
  size = 'md',
  variant = 'default',
  text,
  className = '',
  'aria-label': ariaLabel = 'Loading',
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={`
        ${sizeClasses[size]}
        border-stone-200 border-t-stone-900
        rounded-full animate-spin
        ${className}
      `}
      role="status"
      aria-label={ariaLabel}
    />
  );

  if (variant === 'fullscreen') {
    return (
      <div
        className="
          fixed inset-0 z-50
          flex flex-col items-center justify-center
          bg-stone-50/90 backdrop-blur-sm
        "
        role="alert"
        aria-busy="true"
        aria-live="polite"
      >
        {spinner}
        {text && <p className="mt-4 text-stone-600 font-medium animate-pulse-soft">{text}</p>}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
        {spinner}
        {text && <span className="text-sm text-stone-600">{text}</span>}
      </span>
    );
  }

  if (variant === 'skeleton') {
    return <SkeletonLoader text={text} />;
  }

  // Default variant
  return (
    <div
      className="flex flex-col items-center justify-center p-8"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      {spinner}
      {text && <p className="mt-3 text-sm text-stone-500">{text}</p>}
    </div>
  );
});

/**
 * Skeleton loader for content placeholders
 * Follows NoteChain design system
 */
interface SkeletonLoaderProps {
  text?: string;
  rows?: number;
  className?: string;
}

export const SkeletonLoader = memo(function SkeletonLoader({
  text,
  rows = 3,
  className = '',
}: SkeletonLoaderProps) {
  return (
    <div
      className={`space-y-3 animate-pulse ${className}`}
      role="status"
      aria-busy="true"
      aria-label={text || 'Loading content'}
    >
      {text && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-stone-200 rounded-full" />
          <div className="h-4 bg-stone-200 rounded w-32" />
        </div>
      )}

      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="
            bg-stone-100 rounded-xl h-20
            border border-stone-200/50
          "
        />
      ))}

      <span className="sr-only">{text || 'Loading'}</span>
    </div>
  );
});

/**
 * Card skeleton for note/task cards
 */
interface CardSkeletonProps {
  count?: number;
}

export const CardSkeleton = memo(function CardSkeleton({ count = 3 }: CardSkeletonProps) {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading cards">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="
            p-4 bg-white rounded-xl
            border border-stone-200
            animate-pulse
          "
        >
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-stone-200 rounded mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-stone-200 rounded w-3/4" />
              <div className="h-3 bg-stone-100 rounded w-1/2" />
              <div className="flex items-center gap-2 mt-2">
                <div className="h-5 bg-stone-100 rounded-full w-16" />
                <div className="h-5 bg-stone-100 rounded-full w-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * Editor skeleton for rich text editor loading state
 */
export const EditorSkeleton = memo(function EditorSkeleton() {
  return (
    <div
      className="
        flex flex-col gap-3
        bg-white border border-stone-200 rounded-xl
        overflow-hidden
      "
      role="status"
      aria-busy="true"
      aria-label="Loading editor"
    >
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-1 p-2 bg-stone-50 border-b border-stone-200 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-8 h-8 bg-stone-200 rounded-lg" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="p-6 space-y-3 animate-pulse">
        <div className="h-6 bg-stone-100 rounded w-3/4" />
        <div className="h-4 bg-stone-100 rounded w-full" />
        <div className="h-4 bg-stone-100 rounded w-5/6" />
        <div className="h-4 bg-stone-100 rounded w-4/5" />
        <div className="h-20 bg-stone-100 rounded w-full mt-4" />
      </div>

      {/* Footer skeleton */}
      <div className="flex justify-between px-6 py-3 border-t border-stone-200 animate-pulse">
        <div className="h-3 bg-stone-200 rounded w-20" />
        <div className="h-3 bg-stone-200 rounded w-16" />
      </div>
    </div>
  );
});

/**
 * PDF viewer skeleton
 */
export const PDFSkeleton = memo(function PDFSkeleton() {
  return (
    <div
      className="
        flex flex-col h-full
        bg-stone-50 rounded-xl
        border border-stone-200
      "
      role="status"
      aria-busy="true"
      aria-label="Loading PDF"
    >
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200 animate-pulse">
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-20 h-8 bg-stone-200 rounded-lg" />
          ))}
        </div>
        <div className="w-8 h-8 bg-stone-200 rounded-lg" />
      </div>

      {/* PDF content skeleton */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-[600px] h-[800px] bg-white shadow-xl rounded animate-pulse">
          <div className="h-full bg-stone-100 rounded" />
        </div>
      </div>
    </div>
  );
});

export default LoadingSpinner;
