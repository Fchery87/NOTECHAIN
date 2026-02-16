/**
 * useCollaboration Hook
 *
 * Main collaboration interface for real-time document editing.
 * Integrates with TipTap editor and handles CRDT operations.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocket, ConnectionState } from './useWebSocket';

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
  type: CRDTOperationType;
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, unknown>;
  userId: string;
  timestamp: number;
  id: string;
  dependencies?: string[];
}

/**
 * Vector clock for tracking causality between operations
 */
export interface VectorClockMap {
  [userId: string]: number;
}

/**
 * Cursor position for a user
 */
export interface CursorPosition {
  userId: string;
  position: number;
  selection?: {
    from: number;
    to: number;
  };
  timestamp: number;
}

/**
 * Document state snapshot
 */
export interface DocumentState {
  content: string;
  operations: CRDTOperation[];
  vectorClock: VectorClockMap;
  version: number;
}

/**
 * Sync message for network transmission
 */
export interface SyncMessage {
  type: 'operation' | 'cursor' | 'state' | 'sync_request' | 'sync_response';
  documentId: string;
  userId: string;
  operation?: CRDTOperation;
  cursor?: CursorPosition;
  state?: DocumentState;
  vectorClock?: VectorClockMap;
  timestamp: number;
}

/**
 * WebSocket message types for collaboration
 */
export interface WebSocketMessage {
  type: string;
  documentId?: string;
  userId?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface OperationMessage extends WebSocketMessage {
  type: 'OPERATION';
  documentId: string;
  userId: string;
  timestamp: number;
  operation: CRDTOperation;
  vectorClock?: VectorClockMap;
}

export interface CursorPositionMessage extends WebSocketMessage {
  type: 'CURSOR_POSITION';
  userId: string;
  position?: { x: number; y: number };
  selection?: { start: number; end: number };
}

export interface PresenceMessage extends WebSocketMessage {
  type: 'PRESENCE';
  userId: string;
  status: 'active' | 'idle' | 'offline';
  displayName?: string;
  avatarUrl?: string;
  color?: string;
}

export interface SyncResponseMessage extends WebSocketMessage {
  type: 'SYNC_RESPONSE';
  operations?: CRDTOperation[];
  currentVectorClock?: VectorClockMap;
}

export interface UserListMessage extends WebSocketMessage {
  type: 'USER_LIST';
  users: Array<{
    userId: string;
    displayName?: string;
    avatarUrl?: string;
    color?: string;
    status?: 'active' | 'idle' | 'offline';
    lastSeen?: number;
    cursor?: CursorPosition;
  }>;
}

/**
 * Type guard for OperationMessage
 */
function isOperationMessage(message: WebSocketMessage): message is OperationMessage {
  return message.type === 'OPERATION' && 'operation' in message;
}

/**
 * Type guard for CursorPositionMessage
 */
function isCursorPositionMessage(message: WebSocketMessage): message is CursorPositionMessage {
  return message.type === 'CURSOR_POSITION';
}

/**
 * Type guard for PresenceMessage
 */
function isPresenceMessage(message: WebSocketMessage): message is PresenceMessage {
  return message.type === 'PRESENCE';
}

/**
 * Type guard for SyncResponseMessage
 */
function isSyncResponseMessage(message: WebSocketMessage): message is SyncResponseMessage {
  return message.type === 'SYNC_RESPONSE';
}

/**
 * Type guard for UserListMessage
 */
function isUserListMessage(message: WebSocketMessage): message is UserListMessage {
  return message.type === 'USER_LIST' && 'users' in message;
}

export interface UserPresence {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  color: string;
  cursor?: CursorPosition;
  status: 'active' | 'idle' | 'offline';
  lastSeen: number;
}

export interface CollaborationOptions {
  /** Document ID to collaborate on */
  documentId: string;
  /** Current user ID */
  userId: string;
  /** Current user display name */
  displayName?: string;
  /** Current user avatar URL */
  avatarUrl?: string;
  /** User's permission level */
  permissionLevel: 'view' | 'comment' | 'edit' | 'admin';
  /** WebSocket server URL */
  wsUrl?: string;
  /** JWT token for authentication */
  token?: string;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UseCollaborationReturn {
  /** Connection state */
  connectionState: ConnectionState;
  /** Whether connected */
  isConnected: boolean;
  /** Users currently editing this document */
  connectedUsers: UserPresence[];
  /** Current user's presence */
  localPresence: UserPresence;
  /** Pending operations to be applied */
  pendingOperations: CRDTOperation[];
  /** Send a CRDT operation */
  sendOperation: (operation: CRDTOperation) => void;
  /** Update cursor position */
  updateCursor: (position: CursorPosition) => void;
  /** Update selection range */
  updateSelection: (selection: { from: number; to: number }) => void;
  /** Request document sync */
  requestSync: (sinceVectorClock?: VectorClockMap) => void;
  /** Update user presence status */
  updatePresence: (status: 'active' | 'idle' | 'offline') => void;
  /** Leave the document */
  leaveDocument: () => void;
  /** Last error */
  error: Error | null;
  /** Subscribe to remote operations */
  onRemoteOperation: (handler: (operation: CRDTOperation) => void) => () => void;
  /** Subscribe to cursor updates */
  onCursorUpdate: (handler: (userId: string, cursor: CursorPosition) => void) => () => void;
  /** Subscribe to user join events */
  onUserJoin: (handler: (user: UserPresence) => void) => () => void;
  /** Subscribe to user leave events */
  onUserLeave: (handler: (userId: string) => void) => () => void;
}

// User colors for cursor/presence display
const USER_COLORS = [
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#84cc16', // lime
];

function getColorForUserId(userId: string): string {
  // Generate consistent color based on user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

const DEFAULT_WS_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001`
    : 'ws://localhost:3001';

export function useCollaboration(options: CollaborationOptions): UseCollaborationReturn {
  const {
    documentId,
    userId,
    displayName = 'Anonymous',
    avatarUrl,
    permissionLevel,
    wsUrl = DEFAULT_WS_URL,
    token,
    debug = false,
  } = options;

  const [connectedUsers, setConnectedUsers] = useState<UserPresence[]>([]);
  const [pendingOperations, setPendingOperations] = useState<CRDTOperation[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const operationHandlersRef = useRef<Set<(operation: CRDTOperation) => void>>(new Set());
  const cursorHandlersRef = useRef<Set<(userId: string, cursor: CursorPosition) => void>>(
    new Set()
  );
  const userJoinHandlersRef = useRef<Set<(user: UserPresence) => void>>(new Set());
  const userLeaveHandlersRef = useRef<Set<(userId: string) => void>>(new Set());
  const vectorClockRef = useRef<VectorClockMap>({});

  const localPresence: UserPresence = {
    userId,
    displayName,
    avatarUrl,
    color: getColorForUserId(userId),
    status: 'active',
    lastSeen: Date.now(),
  };

  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) {
        console.log('[useCollaboration]', ...args);
      }
    },
    [debug]
  );

  const {
    connectionState,
    isConnected,
    send,
    subscribe,
    error: wsError,
  } = useWebSocket({
    url: wsUrl,
    token,
    autoConnect: true,
    debug,
  });

  // Update error state
  useEffect(() => {
    if (wsError) {
      setError(wsError);
    }
  }, [wsError]);

  // Join document when connected
  useEffect(() => {
    if (isConnected && documentId) {
      log('Joining document:', documentId);
      send({
        type: 'JOIN_DOCUMENT',
        documentId,
        userId,
        timestamp: Date.now(),
        displayName,
        avatarUrl,
        color: localPresence.color,
      });
    }

    return () => {
      if (isConnected && documentId) {
        log('Leaving document:', documentId);
        send({
          type: 'LEAVE_DOCUMENT',
          documentId,
          userId,
          timestamp: Date.now(),
        });
      }
    };
  }, [isConnected, documentId, userId, displayName, avatarUrl, localPresence.color, send, log]);

  // Subscribe to WebSocket messages
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Handle operations
    unsubscribers.push(
      subscribe('OPERATION', message => {
        if (!isOperationMessage(message)) return;
        const { operation, vectorClock, userId: opUserId } = message;
        if (opUserId !== userId && operation) {
          log('Received operation:', operation);
          setPendingOperations(prev => [...prev, operation]);
          operationHandlersRef.current.forEach(handler => handler(operation));

          // Update vector clock
          if (vectorClock) {
            vectorClockRef.current = {
              ...vectorClockRef.current,
              ...vectorClock,
            };
          }
        }
      })
    );

    // Handle cursor updates
    unsubscribers.push(
      subscribe('CURSOR_POSITION', message => {
        if (!isCursorPositionMessage(message)) return;
        const { userId: cursorUserId, position, selection } = message;
        if (cursorUserId !== userId) {
          log('Received cursor update:', cursorUserId, position);

          const cursor: CursorPosition = {
            userId: cursorUserId,
            position: position?.x ?? 0,
            selection: selection ? { from: selection.start, to: selection.end } : undefined,
            timestamp: Date.now(),
          };

          setConnectedUsers(users =>
            users.map(u => (u.userId === cursorUserId ? { ...u, cursor } : u))
          );

          cursorHandlersRef.current.forEach(handler => handler(cursorUserId, cursor));
        }
      })
    );

    // Handle presence updates
    unsubscribers.push(
      subscribe('PRESENCE', message => {
        if (!isPresenceMessage(message)) return;
        const {
          userId: presenceUserId,
          status,
          displayName: name,
          avatarUrl: avatar,
          color,
        } = message;
        log('Received presence:', presenceUserId, status);

        setConnectedUsers(users => {
          const existingIndex = users.findIndex(u => u.userId === presenceUserId);

          if (status === 'offline') {
            // Remove user
            const newUsers = users.filter(u => u.userId !== presenceUserId);
            userLeaveHandlersRef.current.forEach(handler => handler(presenceUserId));
            return newUsers;
          }

          const userPresence: UserPresence = {
            userId: presenceUserId,
            displayName: name || 'Anonymous',
            avatarUrl: avatar,
            color: color || getColorForUserId(presenceUserId),
            status: status || 'active',
            lastSeen: Date.now(),
          };

          if (existingIndex >= 0) {
            // Update existing user
            const newUsers = [...users];
            newUsers[existingIndex] = { ...newUsers[existingIndex], ...userPresence };
            return newUsers;
          } else {
            // Add new user
            userJoinHandlersRef.current.forEach(handler => handler(userPresence));
            return [...users, userPresence];
          }
        });
      })
    );

    // Handle sync responses
    unsubscribers.push(
      subscribe('SYNC_RESPONSE', message => {
        if (!isSyncResponseMessage(message)) return;
        const { operations, currentVectorClock } = message;
        log('Received sync response:', operations?.length, 'operations');

        if (operations && operations.length > 0) {
          setPendingOperations(prev => [...prev, ...operations]);
          operations.forEach((op: CRDTOperation) => {
            operationHandlersRef.current.forEach(handler => handler(op));
          });
        }

        if (currentVectorClock) {
          vectorClockRef.current = currentVectorClock;
        }
      })
    );

    // Handle user list on join
    unsubscribers.push(
      subscribe('USER_LIST', message => {
        if (!isUserListMessage(message)) return;
        const { users } = message;
        log('Received user list:', users);

        const presenceUsers: UserPresence[] = users
          .filter(u => u.userId !== userId)
          .map(u => ({
            userId: u.userId,
            displayName: u.displayName || 'Anonymous',
            avatarUrl: u.avatarUrl,
            color: u.color || getColorForUserId(u.userId),
            status: u.status || 'active',
            lastSeen: u.lastSeen || Date.now(),
            cursor: u.cursor,
          }));

        setConnectedUsers(presenceUsers);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [subscribe, userId, log]);

  const sendOperation = useCallback(
    (operation: CRDTOperation) => {
      if (permissionLevel === 'view') {
        log('Cannot send operation: view-only permission');
        return;
      }

      // Update local vector clock
      vectorClockRef.current[userId] = (vectorClockRef.current[userId] || 0) + 1;

      log('Sending operation:', operation);
      send({
        type: 'OPERATION',
        documentId,
        userId,
        timestamp: Date.now(),
        operation,
        vectorClock: vectorClockRef.current,
      });
    },
    [documentId, userId, permissionLevel, send, log]
  );

  const updateCursor = useCallback(
    (cursor: CursorPosition) => {
      send({
        type: 'CURSOR_POSITION',
        documentId,
        userId,
        timestamp: Date.now(),
        position: { x: cursor.position, y: 0 },
        selection: cursor.selection
          ? { start: cursor.selection.from, end: cursor.selection.to }
          : undefined,
      });
    },
    [documentId, userId, send]
  );

  const updateSelection = useCallback(
    (selection: { from: number; to: number }) => {
      send({
        type: 'SELECTION',
        documentId,
        userId,
        timestamp: Date.now(),
        selection: { start: selection.from, end: selection.to },
      });
    },
    [documentId, userId, send]
  );

  const requestSync = useCallback(
    (sinceVectorClock?: VectorClockMap) => {
      log('Requesting sync:', sinceVectorClock);
      send({
        type: 'SYNC_REQUEST',
        documentId,
        userId,
        timestamp: Date.now(),
        sinceVectorClock: sinceVectorClock || vectorClockRef.current,
      });
    },
    [documentId, userId, send, log]
  );

  const updatePresence = useCallback(
    (status: 'active' | 'idle' | 'offline') => {
      send({
        type: 'PRESENCE',
        userId,
        timestamp: Date.now(),
        status,
      });
    },
    [userId, send]
  );

  const leaveDocument = useCallback(() => {
    send({
      type: 'LEAVE_DOCUMENT',
      documentId,
      userId,
      timestamp: Date.now(),
    });
  }, [documentId, userId, send]);

  const onRemoteOperation = useCallback(
    (handler: (operation: CRDTOperation) => void): (() => void) => {
      operationHandlersRef.current.add(handler);
      return () => {
        operationHandlersRef.current.delete(handler);
      };
    },
    []
  );

  const onCursorUpdate = useCallback(
    (handler: (userId: string, cursor: CursorPosition) => void): (() => void) => {
      cursorHandlersRef.current.add(handler);
      return () => {
        cursorHandlersRef.current.delete(handler);
      };
    },
    []
  );

  const onUserJoin = useCallback((handler: (user: UserPresence) => void): (() => void) => {
    userJoinHandlersRef.current.add(handler);
    return () => {
      userJoinHandlersRef.current.delete(handler);
    };
  }, []);

  const onUserLeave = useCallback((handler: (userId: string) => void): (() => void) => {
    userLeaveHandlersRef.current.add(handler);
    return () => {
      userLeaveHandlersRef.current.delete(handler);
    };
  }, []);

  return {
    connectionState,
    isConnected,
    connectedUsers,
    localPresence,
    pendingOperations,
    sendOperation,
    updateCursor,
    updateSelection,
    requestSync,
    updatePresence,
    leaveDocument,
    error,
    onRemoteOperation,
    onCursorUpdate,
    onUserJoin,
    onUserLeave,
  };
}

export default useCollaboration;
