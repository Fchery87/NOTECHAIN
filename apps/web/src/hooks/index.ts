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

// Voice Input Hooks
export { useVoiceInput } from './useVoiceInput';
export type { UseVoiceInputOptions, UseVoiceInputReturn } from './useVoiceInput';

// Collaboration Hooks
export { useWebSocket } from './useWebSocket';
export type {
  ConnectionState,
  WebSocketOptions,
  WebSocketMessage,
  UseWebSocketReturn,
} from './useWebSocket';
export { useCollaboration } from './useCollaboration';
export type {
  UserPresence,
  CollaborationOptions,
  UseCollaborationReturn,
  CRDTOperation,
  CursorPosition,
  VectorClockMap,
  DocumentState,
  SyncMessage,
  CRDTOperationType,
} from './useCollaboration';
