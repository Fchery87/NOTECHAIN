import type { ServerWebSocket } from 'bun';

export interface CRDTOperation {
  type: 'insert' | 'delete' | 'update';
  timestamp: number;
  nodeId: string;
  position?: number;
  value?: unknown;
  elementId?: string;
}

export interface UserConnection {
  userId: string;
  socket: ServerWebSocket<unknown>;
  documentId?: string;
  connectedAt: Date;
}

export interface DocumentRoom {
  documentId: string;
  connections: Set<UserConnection>;
}

export enum MessageType {
  JOIN_DOCUMENT = 'JOIN_DOCUMENT',
  LEAVE_DOCUMENT = 'LEAVE_DOCUMENT',
  OPERATION = 'OPERATION',
  CURSOR_POSITION = 'CURSOR_POSITION',
  SELECTION = 'SELECTION',
  PRESENCE = 'PRESENCE',
  SYNC_REQUEST = 'SYNC_REQUEST',
  SYNC_RESPONSE = 'SYNC_RESPONSE',
}

export interface BaseMessage {
  type: MessageType;
  documentId?: string;
  userId: string;
  timestamp: number;
}

export interface JoinDocumentMessage extends BaseMessage {
  type: MessageType.JOIN_DOCUMENT;
  documentId: string;
}

export interface LeaveDocumentMessage extends BaseMessage {
  type: MessageType.LEAVE_DOCUMENT;
  documentId: string;
}

export interface OperationMessage extends BaseMessage {
  type: MessageType.OPERATION;
  documentId: string;
  operation: CRDTOperation;
  vectorClock: Record<string, number>;
}

export interface CursorPositionMessage extends BaseMessage {
  type: MessageType.CURSOR_POSITION;
  documentId: string;
  position: { x: number; y: number };
  selection?: { start: number; end: number };
}

export interface SelectionMessage extends BaseMessage {
  type: MessageType.SELECTION;
  documentId: string;
  selection: { start: number; end: number };
}

export interface PresenceMessage extends BaseMessage {
  type: MessageType.PRESENCE;
  status: 'active' | 'idle' | 'offline';
}

export interface SyncRequestMessage extends BaseMessage {
  type: MessageType.SYNC_REQUEST;
  documentId: string;
  sinceVectorClock?: Record<string, number>;
}

export interface SyncResponseMessage extends BaseMessage {
  type: MessageType.SYNC_RESPONSE;
  documentId: string;
  operations: CRDTOperation[];
  currentVectorClock: Record<string, number>;
}

export type CollaborationMessage =
  | JoinDocumentMessage
  | LeaveDocumentMessage
  | OperationMessage
  | CursorPositionMessage
  | SelectionMessage
  | PresenceMessage
  | SyncRequestMessage
  | SyncResponseMessage;

export interface VectorClock {
  [replicaId: string]: number;
}
