import { VectorClock } from './VectorClock';
import { OperationTransformer } from './OperationTransformer';
import {
  CRDTOperation,
  CRDTOperationType,
  DocumentState,
  CursorPosition,
  CRDTEventMap,
  CRDTOptions,
  Conflict,
} from './types';

/**
 * MultiUserCRDT - Conflict-free Replicated Data Type for collaborative editing
 *
 * This implementation supports:
 * - Multi-user real-time synchronization
 * - Vector clocks for causality tracking
 * - Operational transformation for concurrent edits
 * - Eventual consistency guarantees
 * - Conflict detection and resolution
 */
export class MultiUserCRDT {
  private documentId: string;
  private content: string;
  private operations: CRDTOperation[];
  private vectorClock: VectorClock;
  private userId: string;
  private pendingOperations: CRDTOperation[];
  private options: Required<CRDTOptions>;
  private changeCallbacks: Array<(event: CRDTEventMap['change']) => void>;
  private conflictCallbacks: Array<(event: CRDTEventMap['conflict']) => void>;
  private cursorCallbacks: Array<(event: CRDTEventMap['cursor']) => void>;
  private conflicts: Conflict[];
  private operationIds: Set<string>;

  constructor(
    documentId: string,
    userId: string,
    initialContent: string = '',
    options: CRDTOptions = {}
  ) {
    this.documentId = documentId;
    this.userId = userId;
    this.content = initialContent;
    this.operations = [];
    this.vectorClock = new VectorClock();
    this.pendingOperations = [];
    this.conflicts = [];
    this.operationIds = new Set();

    this.options = {
      initialContent,
      maxOperationsHistory: 1000,
      enableConflictResolution: true,
      userPriority: 0,
      ...options,
    };

    this.changeCallbacks = [];
    this.conflictCallbacks = [];
    this.cursorCallbacks = [];
  }

  /**
   * Apply a local operation (created by this user)
   */
  applyLocalOperation(operation: CRDTOperation): void {
    // Update operation with current timestamp (if not already set)
    const updatedOp: CRDTOperation = {
      ...operation,
      userId: this.userId,
      timestamp: operation.timestamp || Date.now(),
      id: operation.id || `${this.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    // Check for duplicate
    if (this.operationIds.has(updatedOp.id)) {
      return;
    }

    // Track operation
    this.operations.push(updatedOp);
    this.operationIds.add(updatedOp.id);
    this.pendingOperations.push(updatedOp);

    // Sort operations deterministically
    this.operations.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return a.userId.localeCompare(b.userId);
    });

    // Rebuild content from scratch
    this.rebuildContent();

    // Increment vector clock
    this.vectorClock.increment(this.userId);

    // Trim history if needed
    this.trimOperationsHistory();

    // Notify listeners
    this.notifyChange([updatedOp]);
  }

  /**
   * Apply a remote operation (received from another user)
   * Returns true if operation was applied, false if it was already known
   */
  applyRemoteOperation(operation: CRDTOperation): boolean {
    // Check for duplicate
    if (this.operationIds.has(operation.id)) {
      return false;
    }

    // Track the operation first (before transformation)
    this.operations.push(operation);
    this.operationIds.add(operation.id);

    // Sort all operations deterministically by timestamp, then userId
    // This ensures consistent ordering across all clients
    this.operations.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return a.userId.localeCompare(b.userId);
    });

    // Rebuild content from scratch to ensure consistency
    this.rebuildContent();

    // Update vector clock
    this.vectorClock.increment(operation.userId);

    // Check for conflicts
    if (this.options.enableConflictResolution) {
      this.detectAndResolveConflicts(operation);
    }

    // Trim history if needed
    this.trimOperationsHistory();

    // Notify listeners
    this.notifyChange([operation]);

    return true;
  }

  /**
   * Transform a remote operation against local operations
   */
  private transformRemoteOperation(operation: CRDTOperation): CRDTOperation {
    // Get all operations that are concurrent with this one
    // An operation is concurrent if it's from a different user and not in the operation's history
    const concurrentOps = this.operations.filter(op => {
      return (
        op.userId !== operation.userId &&
        !operation.dependencies?.includes(op.id) &&
        op.id !== operation.id
      );
    });

    if (concurrentOps.length === 0) {
      return operation;
    }

    // Sort concurrent operations deterministically by timestamp, then userId
    // This ensures consistent ordering across all clients
    const sortedOps = [...concurrentOps].sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return a.userId.localeCompare(b.userId);
    });

    // Transform the operation against all concurrent operations in order
    return OperationTransformer.transformOperationAgainstOperations(operation, sortedOps);
  }

  /**
   * Apply an operation to the document content
   */
  private applyOperationToContent(operation: CRDTOperation): void {
    switch (operation.type) {
      case CRDTOperationType.INSERT:
        if (operation.content) {
          this.content =
            this.content.slice(0, operation.position) +
            operation.content +
            this.content.slice(operation.position);
        }
        break;

      case CRDTOperationType.DELETE:
        if (operation.length && operation.length > 0) {
          this.content =
            this.content.slice(0, operation.position) +
            this.content.slice(operation.position + operation.length);
        }
        break;

      case CRDTOperationType.RETAIN:
        // No content change
        break;

      case CRDTOperationType.FORMAT:
        // Format operations don't change content, only attributes
        break;

      default:
        console.warn(`Unknown operation type: ${(operation as any).type}`);
    }
  }

  /**
   * Detect and resolve conflicts for an operation
   */
  private detectAndResolveConflicts(operation: CRDTOperation): void {
    // Find conflicting operations
    const conflictingOps = this.operations.filter(op => {
      if (op.id === operation.id) return false;
      if (op.userId === operation.userId) return false;

      // Check for overlapping operations
      if (operation.type === CRDTOperationType.DELETE && op.type === CRDTOperationType.DELETE) {
        const op1End = operation.position + (operation.length || 0);
        const op2End = op.position + (op.length || 0);
        return operation.position < op2End && op.position < op1End;
      }

      if (operation.type === CRDTOperationType.INSERT && op.type === CRDTOperationType.DELETE) {
        const deleteEnd = op.position + (op.length || 0);
        return operation.position >= op.position && operation.position < deleteEnd;
      }

      return false;
    });

    if (conflictingOps.length > 0) {
      // Resolve conflict using timestamp-based priority
      const resolvedOp = this.resolveConflict(operation, conflictingOps);

      const conflict: Conflict = {
        operations: [operation, ...conflictingOps],
        position: operation.position,
        resolution: 'timestamp',
        resolvedOperation: resolvedOp,
      };

      this.conflicts.push(conflict);
      this.notifyConflict(conflict);
    }
  }

  /**
   * Resolve a conflict between operations
   */
  private resolveConflict(operation: CRDTOperation, conflicts: CRDTOperation[]): CRDTOperation {
    // Use timestamp-based resolution (earlier timestamp wins)
    // If timestamps are equal, use userId as tiebreaker
    const allOps = [operation, ...conflicts];

    return allOps.reduce((winner, current) => {
      if (current.timestamp < winner.timestamp) return current;
      if (current.timestamp === winner.timestamp && current.userId < winner.userId) {
        return current;
      }
      return winner;
    });
  }

  /**
   * Get current document content
   */
  getContent(): string {
    return this.content;
  }

  /**
   * Get all applied operations
   */
  getOperations(): CRDTOperation[] {
    return [...this.operations];
  }

  /**
   * Get current vector clock
   */
  getVectorClock(): VectorClock {
    return this.vectorClock.clone();
  }

  /**
   * Get pending operations (not yet acknowledged)
   */
  getPendingOperations(): CRDTOperation[] {
    return [...this.pendingOperations];
  }

  /**
   * Clear pending operations (after successful sync)
   */
  clearPendingOperations(): void {
    this.pendingOperations = [];
  }

  /**
   * Generate diff operations between this CRDT and another
   */
  generateDiff(otherCRDT: MultiUserCRDT): CRDTOperation[] {
    const otherClock = otherCRDT.getVectorClock();

    // Find operations that the other CRDT doesn't have
    return this.operations.filter(op => {
      const otherTimestamp = otherClock.get(op.userId);
      return op.timestamp > otherTimestamp;
    });
  }

  /**
   * Merge another CRDT's state into this one
   */
  merge(otherCRDT: MultiUserCRDT): void {
    const otherOperations = otherCRDT.getOperations();
    const otherClock = otherCRDT.getVectorClock();

    // Merge vector clocks
    this.vectorClock.merge(otherClock);

    // Apply missing operations
    for (const op of otherOperations) {
      if (!this.operationIds.has(op.id)) {
        this.applyRemoteOperation(op);
      }
    }
  }

  /**
   * Check if there are any conflicts
   */
  hasConflicts(): boolean {
    return this.conflicts.length > 0;
  }

  /**
   * Get all unresolved conflicts
   */
  getConflicts(): Conflict[] {
    return [...this.conflicts];
  }

  /**
   * Resolve all conflicts
   */
  resolveConflicts(): void {
    // Re-apply content with resolved operations
    this.rebuildContent();
    this.conflicts = [];
  }

  /**
   * Rebuild content from operations (for conflict resolution)
   */
  private rebuildContent(): void {
    // Sort operations by timestamp and userId for deterministic ordering
    const sortedOps = [...this.operations].sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return a.userId.localeCompare(b.userId);
    });

    // Reset content
    this.content = this.options.initialContent;

    // Re-apply all operations, transforming each against previous ones
    const appliedOps: CRDTOperation[] = [];
    for (const op of sortedOps) {
      // Transform this operation against all previously applied operations
      const transformedOp = OperationTransformer.transformOperationAgainstOperations(
        op,
        appliedOps
      );

      // Only apply if it's not a no-op
      if (
        transformedOp.type !== CRDTOperationType.DELETE ||
        (transformedOp.length && transformedOp.length > 0)
      ) {
        this.applyOperationToContent(transformedOp);
        appliedOps.push(transformedOp);
      }
    }
  }

  /**
   * Transform a cursor position based on operations from other users
   * Returns the equivalent position after remote operations have been applied
   */
  transformCursor(position: number, fromUserId: string): number {
    // Get all operations NOT from the specified user (i.e., remote operations)
    const remoteOps = this.operations.filter(op => op.userId !== fromUserId);

    // Transform position through all remote operations
    let transformedPosition = position;
    for (const op of remoteOps) {
      transformedPosition = OperationTransformer.transformCursorAgainstOperation(
        transformedPosition,
        op
      );
    }

    return transformedPosition;
  }

  /**
   * Update cursor position for a user
   */
  updateCursor(position: number, selection?: { from: number; to: number }): void {
    const cursor: CursorPosition = {
      userId: this.userId,
      position,
      selection,
      timestamp: Date.now(),
    };

    this.notifyCursor(cursor);
  }

  /**
   * Register change listener
   */
  onChange(callback: (event: CRDTEventMap['change']) => void): () => void {
    this.changeCallbacks.push(callback);
    return () => {
      const index = this.changeCallbacks.indexOf(callback);
      if (index > -1) {
        this.changeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register conflict listener
   */
  onConflict(callback: (event: CRDTEventMap['conflict']) => void): () => void {
    this.conflictCallbacks.push(callback);
    return () => {
      const index = this.conflictCallbacks.indexOf(callback);
      if (index > -1) {
        this.conflictCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register cursor listener
   */
  onCursor(callback: (event: CRDTEventMap['cursor']) => void): () => void {
    this.cursorCallbacks.push(callback);
    return () => {
      const index = this.cursorCallbacks.indexOf(callback);
      if (index > -1) {
        this.cursorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get document ID
   */
  getDocumentId(): string {
    return this.documentId;
  }

  /**
   * Get user ID
   */
  getUserId(): string {
    return this.userId;
  }

  /**
   * Get current document state
   */
  getState(): DocumentState {
    return {
      content: this.content,
      operations: [...this.operations],
      vectorClock: this.vectorClock.toJSON(),
      version: this.operations.length,
    };
  }

  /**
   * Set document state (for initialization from server)
   */
  setState(state: DocumentState): void {
    this.content = state.content;
    this.operations = [...state.operations];
    this.vectorClock = VectorClock.fromJSON(state.vectorClock);
    this.operationIds = new Set(state.operations.map(op => op.id));
  }

  /**
   * Trim operations history to prevent unbounded growth
   */
  private trimOperationsHistory(): void {
    if (this.operations.length > this.options.maxOperationsHistory) {
      // Remove oldest operations, but keep at least the last 100
      const toRemove = this.operations.length - this.options.maxOperationsHistory;
      const removedOps = this.operations.splice(0, toRemove);

      // Clean up operation IDs
      removedOps.forEach(op => {
        this.operationIds.delete(op.id);
      });
    }
  }

  /**
   * Notify change listeners
   */
  private notifyChange(operations: CRDTOperation[]): void {
    const event = {
      operations,
      content: this.content,
    };

    this.changeCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in change callback:', error);
      }
    });
  }

  /**
   * Notify conflict listeners
   */
  private notifyConflict(conflict: Conflict): void {
    const event = { conflict };

    this.conflictCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in conflict callback:', error);
      }
    });
  }

  /**
   * Notify cursor listeners
   */
  private notifyCursor(cursor: CursorPosition): void {
    const event = { cursor };

    this.cursorCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in cursor callback:', error);
      }
    });
  }
}
