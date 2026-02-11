// apps/web/src/hooks/index.ts
/**
 * React Hooks for NoteChain
 *
 * Custom hooks for AI-powered features, data fetching, and state management.
 */

// AI Intelligence Hooks
export { useNoteAnalysis } from './useNoteAnalysis';
export { useLinkSuggestions } from './useLinkSuggestions';
export { useRelatedNotes } from './useRelatedNotes';

// Re-export feature gate hook
export { useFeatureGate } from './useFeatureGate';

// Performance Hooks
export {
  useIntersectionObserver,
  useInfiniteScroll,
  useLazyLoad,
  useVisibility,
  useScrollSpy,
} from './useIntersectionObserver';
export { useVirtualScroll, useVirtualizedList, useWindowVirtualizer } from './useVirtualScroll';
export {
  usePerformanceMonitor,
  usePerformanceMark,
  useLongTaskObserver,
  useResourceTiming,
  useNetworkStatus,
} from './usePerformanceMonitor';
