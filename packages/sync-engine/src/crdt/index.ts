/**
 * CRDT Module - Conflict-free Replicated Data Types for Real-time Collaboration
 *
 * This module provides:
 * - VectorClock: Causality tracking for distributed operations
 * - OperationTransformer: Operational Transformation for concurrent edits
 * - MultiUserCRDT: Main CRDT implementation for collaborative text editing
 * - Types: TypeScript interfaces and enums for the CRDT system
 */

export { VectorClock } from './VectorClock';
export { OperationTransformer } from './OperationTransformer';
export { MultiUserCRDT } from './MultiUserCRDT';

export type {
  CRDTOperation,
  VectorClockMap,
  DocumentState,
  CursorPosition,
  SyncMessage,
  Conflict,
  CRDTEventMap,
  CRDTOptions,
  VectorClockComparison,
  TransformResult,
} from './types';

export { CRDTOperationType } from './types';
