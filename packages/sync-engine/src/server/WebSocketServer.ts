import type { Server, ServerWebSocket } from 'bun';
import { ConnectionManager } from './ConnectionManager';

declare const Bun: {
  serve: <T>(options: {
    port: number;
    fetch: (
      req: Request,
      server: { upgrade: (req: Request, opts?: { data?: T }) => boolean }
    ) => Response | undefined;
    websocket: {
      open: (ws: ServerWebSocket<T>) => void;
      message: (ws: ServerWebSocket<T>, message: string | Buffer) => void;
      close: (ws: ServerWebSocket<T>) => void;
    };
  }) => Server<T>;
};
import {
  MessageType,
  type CollaborationMessage,
  type JoinDocumentMessage,
  type LeaveDocumentMessage,
  type OperationMessage,
  type CursorPositionMessage,
  type PresenceMessage,
  type SyncRequestMessage,
  type SelectionMessage,
} from './types';

interface WebSocketServerOptions {
  port: number;
  authValidator: (token: string) => Promise<string | null>;
}

interface AuthenticatedSocket {
  userId?: string;
  isAuthenticated: boolean;
}

interface AuthMessage {
  type: 'AUTH';
  token: string;
}

export class WebSocketServer {
  private port: number;
  private authValidator: (token: string) => Promise<string | null>;
  private server: Server<AuthenticatedSocket> | null;
  public connectionManager: ConnectionManager;

  constructor(options: WebSocketServerOptions) {
    this.port = options.port;
    this.authValidator = options.authValidator;
    this.server = null;
    this.connectionManager = new ConnectionManager();
  }

  start(): void {
    this.server = Bun.serve<AuthenticatedSocket>({
      port: this.port,
      fetch: (req, server) => {
        const origin = req.headers.get('origin');
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ];

        const isAllowed =
          !origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*');

        if (isAllowed) {
          const success = server.upgrade(req, {
            data: { isAuthenticated: false },
          });
          if (success) {
            return undefined as unknown as Response;
          }
          return new Response('WebSocket upgrade failed', { status: 500 });
        }

        console.warn(`[WebSocket] Rejected connection from origin: ${origin}`);
        return new Response('WebSocket upgrade failed - CORS', {
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': allowedOrigins.includes('*')
              ? '*'
              : allowedOrigins[0] || '*',
          },
        });
      },
      websocket: {
        open: (ws: ServerWebSocket<AuthenticatedSocket>) => {
          this.handleOpen(ws);
        },
        message: (ws: ServerWebSocket<AuthenticatedSocket>, message: string | Buffer) => {
          this.handleMessage(ws, message);
        },
        close: (ws: ServerWebSocket<AuthenticatedSocket>) => {
          this.handleClose(ws);
        },
      },
    });
  }

  stop(): void {
    if (this.server) {
      this.server.stop(true);
      this.server = null;
    }
  }

  private handleOpen(_ws: ServerWebSocket<AuthenticatedSocket>): void {
    // Connection opened, waiting for authentication
  }

  private handleClose(ws: ServerWebSocket<AuthenticatedSocket>): void {
    this.connectionManager.removeConnection(ws);
  }

  private async handleMessage(
    ws: ServerWebSocket<AuthenticatedSocket>,
    message: string | Buffer
  ): Promise<void> {
    try {
      const data = JSON.parse(message.toString()) as CollaborationMessage | AuthMessage;

      if (data.type === 'AUTH') {
        const authMsg = data as AuthMessage;
        if (authMsg.token) {
          await this.authenticate(ws, authMsg.token);
        }
        return;
      }

      if (!ws.data.isAuthenticated) {
        ws.send(
          JSON.stringify({
            type: 'AUTH_ERROR',
            error: 'Not authenticated',
          })
        );
        return;
      }

      switch (data.type) {
        case MessageType.JOIN_DOCUMENT:
          this.handleJoinDocument(ws, data as JoinDocumentMessage);
          break;
        case MessageType.LEAVE_DOCUMENT:
          this.handleLeaveDocument(ws, data as LeaveDocumentMessage);
          break;
        case MessageType.OPERATION:
          this.handleOperation(ws, data as OperationMessage);
          break;
        case MessageType.CURSOR_POSITION:
          this.handleCursorPosition(ws, data as CursorPositionMessage);
          break;
        case MessageType.SELECTION:
          this.handleSelection(ws, data as SelectionMessage);
          break;
        case MessageType.PRESENCE:
          this.handlePresence(ws, data as PresenceMessage);
          break;
        case MessageType.SYNC_REQUEST:
          this.handleSyncRequest(ws, data as SyncRequestMessage);
          break;
        default:
          ws.send(
            JSON.stringify({
              type: 'ERROR',
              error: 'Unknown message type',
            })
          );
      }
    } catch {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          error: 'Invalid message format',
        })
      );
    }
  }

  private async authenticate(
    ws: ServerWebSocket<AuthenticatedSocket>,
    token: string
  ): Promise<boolean> {
    try {
      const userId = await this.authValidator(token);
      if (userId) {
        ws.data.userId = userId;
        ws.data.isAuthenticated = true;
        this.connectionManager.addConnection(ws, userId);
        ws.send(
          JSON.stringify({
            type: 'AUTH_SUCCESS',
            userId,
          })
        );
        return true;
      } else {
        ws.send(
          JSON.stringify({
            type: 'AUTH_ERROR',
            error: 'Invalid token',
          })
        );
        return false;
      }
    } catch {
      ws.send(
        JSON.stringify({
          type: 'AUTH_ERROR',
          error: 'Authentication failed',
        })
      );
      return false;
    }
  }

  private handleJoinDocument(
    ws: ServerWebSocket<AuthenticatedSocket>,
    message: JoinDocumentMessage
  ): void {
    if (!ws.data.userId) return;

    this.connectionManager.joinDocument(ws, message.documentId);

    const presenceMsg: PresenceMessage = {
      type: MessageType.PRESENCE,
      userId: ws.data.userId,
      documentId: message.documentId,
      timestamp: Date.now(),
      status: 'active',
    };

    this.connectionManager.broadcastToDocument(message.documentId, presenceMsg, ws);
  }

  private handleLeaveDocument(
    ws: ServerWebSocket<AuthenticatedSocket>,
    message: LeaveDocumentMessage
  ): void {
    if (!ws.data.userId) return;

    const presenceMsg: PresenceMessage = {
      type: MessageType.PRESENCE,
      userId: ws.data.userId,
      documentId: message.documentId,
      timestamp: Date.now(),
      status: 'offline',
    };

    this.connectionManager.broadcastToDocument(message.documentId, presenceMsg, ws);

    this.connectionManager.leaveDocument(ws, message.documentId);
  }

  private handleOperation(
    ws: ServerWebSocket<AuthenticatedSocket>,
    message: OperationMessage
  ): void {
    if (!ws.data.userId || !message.documentId) return;

    const broadcastMsg: OperationMessage = {
      ...message,
      userId: ws.data.userId,
      timestamp: Date.now(),
    };

    this.connectionManager.broadcastToDocument(message.documentId, broadcastMsg, ws);
  }

  private handleCursorPosition(
    ws: ServerWebSocket<AuthenticatedSocket>,
    message: CursorPositionMessage
  ): void {
    if (!ws.data.userId || !message.documentId) return;

    const broadcastMsg: CursorPositionMessage = {
      ...message,
      userId: ws.data.userId,
      timestamp: Date.now(),
    };

    this.connectionManager.broadcastToDocument(message.documentId, broadcastMsg, ws);
  }

  private handleSelection(
    ws: ServerWebSocket<AuthenticatedSocket>,
    message: SelectionMessage
  ): void {
    if (!ws.data.userId || !message.documentId) return;

    const broadcastMsg: SelectionMessage = {
      ...message,
      userId: ws.data.userId,
      timestamp: Date.now(),
    };

    this.connectionManager.broadcastToDocument(message.documentId, broadcastMsg, ws);
  }

  private handlePresence(ws: ServerWebSocket<AuthenticatedSocket>, message: PresenceMessage): void {
    if (!ws.data.userId) return;

    const connection = this.connectionManager.getConnection(ws);
    if (connection?.documentId) {
      const broadcastMsg: PresenceMessage = {
        ...message,
        userId: ws.data.userId,
        documentId: connection.documentId,
        timestamp: Date.now(),
      };

      this.connectionManager.broadcastToDocument(connection.documentId, broadcastMsg, ws);
    }
  }

  private handleSyncRequest(
    ws: ServerWebSocket<AuthenticatedSocket>,
    message: SyncRequestMessage
  ): void {
    if (!ws.data.userId) return;

    ws.send(
      JSON.stringify({
        type: MessageType.SYNC_RESPONSE,
        documentId: message.documentId,
        operations: [],
        currentVectorClock: {},
        timestamp: Date.now(),
      })
    );
  }
}
