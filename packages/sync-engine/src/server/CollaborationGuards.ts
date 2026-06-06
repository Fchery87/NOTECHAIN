import type { CRDTOperation } from './types';

export type DocumentAccessAction = 'read' | 'write' | 'join';

export interface DocumentAccessContext {
  userId: string;
  documentId: string;
  action: DocumentAccessAction;
}

export type DocumentAccessValidator = (
  context: DocumentAccessContext
) => Promise<boolean> | boolean;

export interface StoredCollaborationOperation {
  documentId: string;
  operation: CRDTOperation;
  vectorClock: Record<string, number>;
  userId: string;
  timestamp: number;
}

export interface CollaborationOperationHistoryStore {
  append(record: StoredCollaborationOperation): Promise<void> | void;
  getOperations(
    documentId: string,
    sinceVectorClock?: Record<string, number>
  ): Promise<StoredCollaborationOperation[]> | StoredCollaborationOperation[];
  getCurrentVectorClock(
    documentId: string
  ): Promise<Record<string, number>> | Record<string, number>;
}

export const allowAllDocumentAccess: DocumentAccessValidator = () => true;

export async function assertDocumentAccess(
  validator: DocumentAccessValidator,
  context: DocumentAccessContext
): Promise<void> {
  const allowed = await validator(context);
  if (!allowed) {
    throw new Error(`Not authorized to ${context.action} document`);
  }
}

function isOperationAfterVectorClock(
  record: StoredCollaborationOperation,
  sinceVectorClock?: Record<string, number>
): boolean {
  if (!sinceVectorClock) return true;

  const nodeId = record.operation.nodeId || record.userId;
  const operationTime =
    record.vectorClock[nodeId] ?? record.operation.timestamp ?? record.timestamp;
  const sinceTime = sinceVectorClock[nodeId] ?? 0;
  return operationTime > sinceTime;
}

export class InMemoryCollaborationOperationHistoryStore implements CollaborationOperationHistoryStore {
  private operationsByDocument = new Map<string, StoredCollaborationOperation[]>();

  append(record: StoredCollaborationOperation): void {
    const existing = this.operationsByDocument.get(record.documentId) ?? [];
    existing.push(record);
    this.operationsByDocument.set(record.documentId, existing);
  }

  getOperations(
    documentId: string,
    sinceVectorClock?: Record<string, number>
  ): StoredCollaborationOperation[] {
    return (this.operationsByDocument.get(documentId) ?? []).filter(record =>
      isOperationAfterVectorClock(record, sinceVectorClock)
    );
  }

  getCurrentVectorClock(documentId: string): Record<string, number> {
    const vectorClock: Record<string, number> = {};

    for (const record of this.operationsByDocument.get(documentId) ?? []) {
      for (const [nodeId, value] of Object.entries(record.vectorClock)) {
        vectorClock[nodeId] = Math.max(vectorClock[nodeId] ?? 0, value);
      }

      const nodeId = record.operation.nodeId || record.userId;
      if (record.vectorClock[nodeId] === undefined) {
        vectorClock[nodeId] = Math.max(
          vectorClock[nodeId] ?? 0,
          record.operation.timestamp ?? record.timestamp
        );
      }
    }

    return vectorClock;
  }

  clear(): void {
    this.operationsByDocument.clear();
  }
}
