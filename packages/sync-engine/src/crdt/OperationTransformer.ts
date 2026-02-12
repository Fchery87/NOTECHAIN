import { CRDTOperation, CRDTOperationType, TransformResult } from './types';

/**
 * Operational Transformation (OT) implementation for CRDTs.
 *
 * OT transforms operations so they can be applied in different orders
 * while maintaining consistency. This is essential for real-time
 * collaborative editing where users may generate operations concurrently.
 */
export class OperationTransformer {
  /**
   * Transform two insert operations against each other
   * When two users insert at the same position, we need to adjust positions
   */
  static transformInsertAgainstInsert(op1: CRDTOperation, op2: CRDTOperation): TransformResult {
    if (op1.position < op2.position) {
      // op1 is before op2, op2's position needs to shift
      return {
        operation1: op1,
        operation2: {
          ...op2,
          position: op2.position + (op1.content?.length || 1),
        },
      };
    } else if (op1.position > op2.position) {
      // op2 is before op1, op1's position needs to shift
      return {
        operation1: {
          ...op1,
          position: op1.position + (op2.content?.length || 1),
        },
        operation2: op2,
      };
    } else {
      // Same position - use timestamp-based tiebreaker to ensure consistency
      if (op1.timestamp < op2.timestamp) {
        return {
          operation1: op1,
          operation2: {
            ...op2,
            position: op2.position + (op1.content?.length || 1),
          },
        };
      } else if (op1.timestamp > op2.timestamp) {
        return {
          operation1: {
            ...op1,
            position: op1.position + (op2.content?.length || 1),
          },
          operation2: op2,
        };
      } else {
        // Same timestamp - use userId as tiebreaker for deterministic ordering
        if (op1.userId < op2.userId) {
          return {
            operation1: op1,
            operation2: {
              ...op2,
              position: op2.position + (op1.content?.length || 1),
            },
          };
        } else {
          return {
            operation1: {
              ...op1,
              position: op1.position + (op2.content?.length || 1),
            },
            operation2: op2,
          };
        }
      }
    }
  }

  /**
   * Transform an insert operation against a delete operation
   */
  static transformInsertAgainstDelete(
    insertOp: CRDTOperation,
    deleteOp: CRDTOperation
  ): CRDTOperation {
    const deleteEnd = deleteOp.position + (deleteOp.length || 0);

    if (insertOp.position < deleteOp.position) {
      // Insert is before delete - no change needed
      return insertOp;
    } else if (insertOp.position >= deleteEnd) {
      // Insert is after delete - shift position back
      return {
        ...insertOp,
        position: insertOp.position - (deleteOp.length || 0),
      };
    } else {
      // Insert is within deleted range - shift to start of deletion
      return {
        ...insertOp,
        position: deleteOp.position,
      };
    }
  }

  /**
   * Transform a delete operation against an insert operation
   */
  static transformDeleteAgainstInsert(
    deleteOp: CRDTOperation,
    insertOp: CRDTOperation
  ): CRDTOperation | null {
    const deleteEnd = deleteOp.position + (deleteOp.length || 0);
    const insertLength = insertOp.content?.length || 0;

    if (deleteEnd <= insertOp.position) {
      // Delete is entirely before insert - no change
      return deleteOp;
    } else if (deleteOp.position >= insertOp.position) {
      // Delete is after insert - shift position forward
      return {
        ...deleteOp,
        position: deleteOp.position + insertLength,
      };
    } else {
      // Insert is within delete range - adjust delete length
      return {
        ...deleteOp,
        length: (deleteOp.length || 0) + insertLength,
      };
    }
  }

  /**
   * Transform two delete operations against each other
   */
  static transformDeleteAgainstDelete(
    op1: CRDTOperation,
    op2: CRDTOperation
  ): CRDTOperation | null {
    const op1End = op1.position + (op1.length || 0);
    const op2End = op2.position + (op2.length || 0);

    if (op1End <= op2.position) {
      // op1 is entirely before op2 - no change
      return op1;
    } else if (op2End <= op1.position) {
      // op2 is entirely before op1 - shift position
      return {
        ...op1,
        position: op1.position - (op2.length || 0),
      };
    } else {
      // Overlapping deletes - adjust the range
      const newStart = Math.min(op1.position, op2.position);
      const newEnd = Math.max(op1End, op2End) - (op2.length || 0);
      const newLength = Math.max(0, newEnd - newStart);

      if (newLength === 0) {
        return null; // Completely eliminated
      }

      return {
        ...op1,
        position: newStart,
        length: newLength,
      };
    }
  }

  /**
   * Transform a cursor position against an operation
   * Returns the new cursor position after the operation is applied
   */
  static transformCursorAgainstOperation(cursorPosition: number, operation: CRDTOperation): number {
    switch (operation.type) {
      case CRDTOperationType.INSERT: {
        if (cursorPosition >= operation.position) {
          return cursorPosition + (operation.content?.length || 0);
        }
        return cursorPosition;
      }

      case CRDTOperationType.DELETE: {
        const deleteEnd = operation.position + (operation.length || 0);

        if (cursorPosition <= operation.position) {
          // Cursor is before or at delete start - no change
          return cursorPosition;
        } else if (cursorPosition >= deleteEnd) {
          // Cursor is after delete end - shift back
          return cursorPosition - (operation.length || 0);
        } else {
          // Cursor is within deleted range - move to delete start
          return operation.position;
        }
      }

      case CRDTOperationType.RETAIN:
        // Retain doesn't change cursor
        return cursorPosition;

      case CRDTOperationType.FORMAT:
        // Format doesn't change cursor position
        return cursorPosition;

      default:
        return cursorPosition;
    }
  }

  /**
   * Transform a selection range against an operation
   */
  static transformSelectionAgainstOperation(
    from: number,
    to: number,
    operation: CRDTOperation
  ): { from: number; to: number } {
    return {
      from: this.transformCursorAgainstOperation(from, operation),
      to: this.transformCursorAgainstOperation(to, operation),
    };
  }

  /**
   * Compose multiple operations into a single operation
   * This is an optimization to reduce the number of operations
   */
  static composeOperations(operations: CRDTOperation[]): CRDTOperation[] {
    if (operations.length <= 1) {
      return operations;
    }

    const composed: CRDTOperation[] = [];
    let currentOp: CRDTOperation | null = null;

    for (const op of operations) {
      if (!currentOp) {
        currentOp = { ...op };
        continue;
      }

      // Try to merge with current operation
      if (
        currentOp.type === CRDTOperationType.INSERT &&
        op.type === CRDTOperationType.INSERT &&
        currentOp.position + (currentOp.content?.length || 0) === op.position &&
        currentOp.userId === op.userId
      ) {
        // Merge consecutive inserts from same user
        currentOp.content = (currentOp.content || '') + (op.content || '');
      } else if (
        currentOp.type === CRDTOperationType.DELETE &&
        op.type === CRDTOperationType.DELETE &&
        currentOp.position === op.position + (op.length || 0)
      ) {
        // Merge consecutive deletes at same position
        currentOp.position = op.position;
        currentOp.length = (currentOp.length || 0) + (op.length || 0);
      } else {
        // Can't merge, push current and start new
        composed.push(currentOp);
        currentOp = { ...op };
      }
    }

    if (currentOp) {
      composed.push(currentOp);
    }

    return composed;
  }

  /**
   * Simplify operations by removing redundant ones
   * e.g., insert followed by delete of same content
   */
  static simplifyOperations(operations: CRDTOperation[]): CRDTOperation[] {
    const simplified: CRDTOperation[] = [];

    for (const op of operations) {
      if (op.type === CRDTOperationType.RETAIN) {
        // Skip retain operations - they're just markers
        continue;
      }

      if (op.type === CRDTOperationType.DELETE && op.length === 0) {
        // Skip empty deletes
        continue;
      }

      if (op.type === CRDTOperationType.INSERT && !op.content) {
        // Skip empty inserts
        continue;
      }

      // Check if this operation cancels the previous one
      const prevOp = simplified[simplified.length - 1];
      if (prevOp) {
        if (
          prevOp.type === CRDTOperationType.INSERT &&
          op.type === CRDTOperationType.DELETE &&
          prevOp.position === op.position &&
          prevOp.content?.length === op.length
        ) {
          // Insert followed by delete of same content - remove both
          simplified.pop();
          continue;
        }
      }

      simplified.push(op);
    }

    return simplified;
  }

  /**
   * Transform an operation against a list of operations
   * This is used when applying a remote operation that was created
   * based on an older document state
   */
  static transformOperationAgainstOperations(
    operation: CRDTOperation,
    againstOperations: CRDTOperation[]
  ): CRDTOperation {
    let transformed = { ...operation };

    for (const againstOp of againstOperations) {
      switch (transformed.type) {
        case CRDTOperationType.INSERT:
          if (againstOp.type === CRDTOperationType.INSERT) {
            const result = this.transformInsertAgainstInsert(transformed, againstOp);
            transformed = result.operation1;
          } else if (againstOp.type === CRDTOperationType.DELETE) {
            transformed = this.transformInsertAgainstDelete(transformed, againstOp);
          }
          break;

        case CRDTOperationType.DELETE:
          if (againstOp.type === CRDTOperationType.INSERT) {
            const result = this.transformDeleteAgainstInsert(transformed, againstOp);
            if (result === null) {
              return { ...transformed, length: 0 }; // Mark as no-op
            }
            transformed = result;
          } else if (againstOp.type === CRDTOperationType.DELETE) {
            const result = this.transformDeleteAgainstDelete(transformed, againstOp);
            if (result === null) {
              return { ...transformed, length: 0 }; // Mark as no-op
            }
            transformed = result;
          }
          break;
      }
    }

    return transformed;
  }
}
