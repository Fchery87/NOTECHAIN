/**
 * CRDT Types for Multi-User Real-time Collaboration
 *
 * Core type definitions for Conflict-free Replicated Data Types
 * supporting collaborative text editing with operational transformation.
 */

/**
 * Operation types for text transformations
 */
export enum CRDTOperationType {
  INSERT = 'INSERT',
  DELETE = 'DELETE',
  RETAIN = 'RETAIN',
  FORMAT = 'FORMAT',
}

/**
 * Single operation in the CRDT system
 */
export interface CRDTOperation {
  /** Type of operation */
  type: CRDTOperationType;
  /** Position in document where operation applies */
  position: number;
  /** Content to insert (for INSERT operations) */
  content?: string;
  /** Length to retain/delete (for RETAIN/DELETE operations) */
  length?: number;
  /** Formatting attributes (for FORMAT operations) */
  attributes?: Record<string, any>;
  /** User who created this operation */
  userId: string;
  /** Lamport timestamp for ordering */
  timestamp: number;
  /** Unique operation ID */
  id: string;
  /** Parent operation IDs this operation depends on */
  dependencies?: string[];
}

/**
 * Vector clock for tracking causality between operations
 * Maps userId to their latest timestamp
 */
export interface VectorClockMap {
  [userId: string]: number;
}

/**
 * Document state snapshot
 */
export interface DocumentState {
  /** Current document content */
  content: string;
  /** All applied operations */
  operations: CRDTOperation[];
  /** Vector clock at this state */
  vectorClock: VectorClockMap;
  /** Document version */
  version: number;
}

/**
 * Cursor position for a user
 */
export interface CursorPosition {
  /** User who owns this cursor */
  userId: string;
  /** Cursor position in document (character index) */
  position: number;
  /** Selection range (optional) */
  selection?: {
    /** Start of selection */
    from: number;
    /** End of selection */
    to: number;
  };
  /** Last update timestamp */
  timestamp: number;
}

/**
 * Sync message for network transmission
 */
export interface SyncMessage {
  /** Message type */
  type: 'operation' | 'cursor' | 'state' | 'sync_request' | 'sync_response';
  /** Document ID */
  documentId: string;
  /** Sender user ID */
  userId: string;
  /** Operation data (if type is 'operation') */
  operation?: CRDTOperation;
  /** Cursor data (if type is 'cursor') */
  cursor?: CursorPosition;
  /** Document state (if type is 'state' or 'sync_response') */
  state?: DocumentState;
  /** Vector clock for sync requests */
  vectorClock?: VectorClockMap;
  /** Timestamp */
  timestamp: number;
}

/**
 * Conflict information
 */
export interface Conflict {
  /** Conflicting operations */
  operations: CRDTOperation[];
  /** Position where conflict occurs */
  position: number;
  /** Resolution strategy applied */
  resolution: 'timestamp' | 'user_priority' | 'manual';
  /** Resolved operation */
  resolvedOperation: CRDTOperation;
}

/**
 * CRDT event types
 */
export interface CRDTEventMap {
  change: { operations: CRDTOperation[]; content: string };
  conflict: { conflict: Conflict };
  cursor: { cursor: CursorPosition };
  sync: { vectorClock: VectorClockMap };
}

/**
 * CRDT configuration options
 */
export interface CRDTOptions {
  /** Initial document content */
  initialContent?: string;
  /** Maximum operations to keep in history */
  maxOperationsHistory?: number;
  /** Enable conflict resolution */
  enableConflictResolution?: boolean;
  /** User priority for conflict resolution (lower = higher priority) */
  userPriority?: number;
}

/**
 * Comparison result between vector clocks
 */
export type VectorClockComparison = 'before' | 'after' | 'concurrent' | 'equal';

/**
 * Transform result containing transformed operations
 */
export interface TransformResult {
  operation1: CRDTOperation;
  operation2: CRDTOperation;
}
