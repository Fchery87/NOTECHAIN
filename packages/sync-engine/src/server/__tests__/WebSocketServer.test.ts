import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import type { ServerWebSocket } from 'bun';
import { WebSocketServer } from '../WebSocketServer';
import { ConnectionManager } from '../ConnectionManager';
import {
  MessageType,
  type JoinDocumentMessage,
  type OperationMessage,
  type CursorPositionMessage,
  type PresenceMessage,
} from '../types';

describe('WebSocketServer', () => {
  let server: WebSocketServer;
  let port: number;

  beforeEach(async () => {
    port = 9999 + Math.floor(Math.random() * 1000);
    server = new WebSocketServer({
      port,
      authValidator: async (token: string) => {
        return token === 'valid-token' ? 'user-123' : null;
      },
    });
    server.start();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    server.stop();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('should initialize on specified port', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error('Connection failed'));
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    ws.close();
    expect(server).toBeDefined();
  });

  it('should allow connection with valid authentication', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error('Connection failed'));
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    ws.send(JSON.stringify({ type: 'AUTH', token: 'valid-token' }));

    await new Promise<void>(resolve => {
      ws.onmessage = event => {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'AUTH_SUCCESS') {
          resolve();
        }
      };
      setTimeout(resolve, 500);
    });

    ws.close();
  });

  it('should reject connection with invalid authentication', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error('Connection failed'));
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    ws.send(JSON.stringify({ type: 'AUTH', token: 'invalid-token' }));

    let receivedError = false;
    await new Promise<void>(resolve => {
      ws.onmessage = event => {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'AUTH_ERROR') {
          receivedError = true;
          resolve();
        }
      };
      setTimeout(resolve, 500);
    });

    ws.close();
    expect(receivedError).toBe(true);
  });

  it('should handle join document message', async () => {
    const ws = await connectAndAuth(port);

    const joinMsg: JoinDocumentMessage = {
      type: MessageType.JOIN_DOCUMENT,
      documentId: 'doc-123',
      userId: 'user-123',
      timestamp: Date.now(),
    };

    ws.send(JSON.stringify(joinMsg));

    await new Promise(resolve => setTimeout(resolve, 300));

    const room = server['connectionManager'].getDocumentConnections('doc-123');
    expect(room.length).toBe(1);

    ws.close();
  });

  it('should handle leave document message', async () => {
    const ws = await connectAndAuth(port);

    const joinMsg: JoinDocumentMessage = {
      type: MessageType.JOIN_DOCUMENT,
      documentId: 'doc-123',
      userId: 'user-123',
      timestamp: Date.now(),
    };

    ws.send(JSON.stringify(joinMsg));
    await new Promise(resolve => setTimeout(resolve, 300));

    const leaveMsg = {
      type: MessageType.LEAVE_DOCUMENT,
      documentId: 'doc-123',
      userId: 'user-123',
      timestamp: Date.now(),
    };

    ws.send(JSON.stringify(leaveMsg));
    await new Promise(resolve => setTimeout(resolve, 300));

    const room = server['connectionManager'].getDocumentConnections('doc-123');
    expect(room.length).toBe(0);

    ws.close();
  });

  it('should broadcast messages to room members', async () => {
    const ws1 = await connectAndAuth(port, 'user-1');
    const ws2 = await connectAndAuth(port, 'user-2');

    await joinDocument(ws1, 'doc-123', 'user-1');
    await joinDocument(ws2, 'doc-123', 'user-2');

    const messages: unknown[] = [];
    ws2.onmessage = event => {
      messages.push(JSON.parse(event.data as string));
    };

    const opMsg: OperationMessage = {
      type: MessageType.OPERATION,
      documentId: 'doc-123',
      userId: 'user-1',
      timestamp: Date.now(),
      operation: {
        type: 'insert',
        timestamp: Date.now(),
        nodeId: 'user-1',
        position: 0,
        value: 'test',
      },
      vectorClock: { 'user-1': 1 },
    };

    ws1.send(JSON.stringify(opMsg));
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toHaveProperty('type', MessageType.OPERATION);

    ws1.close();
    ws2.close();
  });

  it('should broadcast cursor positions', async () => {
    const ws1 = await connectAndAuth(port, 'user-1');
    const ws2 = await connectAndAuth(port, 'user-2');

    await joinDocument(ws1, 'doc-123', 'user-1');
    await joinDocument(ws2, 'doc-123', 'user-2');

    const messages: unknown[] = [];
    ws2.onmessage = event => {
      messages.push(JSON.parse(event.data as string));
    };

    const cursorMsg: CursorPositionMessage = {
      type: MessageType.CURSOR_POSITION,
      documentId: 'doc-123',
      userId: 'user-1',
      timestamp: Date.now(),
      position: { x: 100, y: 200 },
    };

    ws1.send(JSON.stringify(cursorMsg));
    await new Promise(resolve => setTimeout(resolve, 500));

    const cursorMessages = messages.filter(
      (m: { type: MessageType }) => m.type === MessageType.CURSOR_POSITION
    );
    expect(cursorMessages.length).toBeGreaterThan(0);

    ws1.close();
    ws2.close();
  });

  it('should broadcast operations', async () => {
    const ws1 = await connectAndAuth(port, 'user-1');
    const ws2 = await connectAndAuth(port, 'user-2');

    await joinDocument(ws1, 'doc-123', 'user-1');
    await joinDocument(ws2, 'doc-123', 'user-2');

    const messages: unknown[] = [];
    ws2.onmessage = event => {
      messages.push(JSON.parse(event.data as string));
    };

    const opMsg: OperationMessage = {
      type: MessageType.OPERATION,
      documentId: 'doc-123',
      userId: 'user-1',
      timestamp: Date.now(),
      operation: {
        type: 'insert',
        timestamp: Date.now(),
        nodeId: 'user-1',
        position: 0,
        value: 'hello',
      },
      vectorClock: { 'user-1': 1 },
    };

    ws1.send(JSON.stringify(opMsg));
    await new Promise(resolve => setTimeout(resolve, 500));

    const opMessages = messages.filter(
      (m: { type: MessageType }) => m.type === MessageType.OPERATION
    );
    expect(opMessages.length).toBeGreaterThan(0);

    ws1.close();
    ws2.close();
  });

  it('should handle presence messages', async () => {
    const ws = await connectAndAuth(port);
    await joinDocument(ws, 'doc-123', 'user-123');

    const presenceMsg: PresenceMessage = {
      type: MessageType.PRESENCE,
      userId: 'user-123',
      timestamp: Date.now(),
      status: 'active',
    };

    ws.send(JSON.stringify(presenceMsg));
    await new Promise(resolve => setTimeout(resolve, 300));

    ws.close();
  });

  it('should cleanup on disconnection', async () => {
    const ws = await connectAndAuth(port);

    await joinDocument(ws, 'doc-123', 'user-123');
    expect(server['connectionManager'].getDocumentUserCount('doc-123')).toBe(1);

    ws.close();
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(server['connectionManager'].getDocumentUserCount('doc-123')).toBe(0);
  });

  it('should handle invalid messages gracefully', async () => {
    const ws = await connectAndAuth(port);

    ws.send('invalid json');
    ws.send(JSON.stringify({ invalid: 'message' }));
    ws.send(JSON.stringify({ type: 'UNKNOWN_TYPE' }));

    await new Promise(resolve => setTimeout(resolve, 500));

    ws.close();
  });
});

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager();
  });

  it('should track connections', () => {
    const mockSocket = { readyState: 1 } as ServerWebSocket<unknown>;
    const conn = manager.addConnection(mockSocket, 'user-123');

    expect(conn.userId).toBe('user-123');
    expect(conn.socket).toBe(mockSocket);
    expect(conn.connectedAt).toBeInstanceOf(Date);
  });

  it('should remove connections', () => {
    const mockSocket = { readyState: 1 } as ServerWebSocket<unknown>;
    manager.addConnection(mockSocket, 'user-123');
    manager.removeConnection(mockSocket);

    const conn = manager.getConnection(mockSocket);
    expect(conn).toBeUndefined();
  });

  it('should manage document rooms', () => {
    const mockSocket = { readyState: 1 } as ServerWebSocket<unknown>;
    manager.addConnection(mockSocket, 'user-123');
    manager.joinDocument(mockSocket, 'doc-123');

    const connections = manager.getDocumentConnections('doc-123');
    expect(connections.length).toBe(1);
    expect(connections[0].userId).toBe('user-123');
  });

  it('should allow leaving documents', () => {
    const mockSocket = { readyState: 1 } as ServerWebSocket<unknown>;
    manager.addConnection(mockSocket, 'user-123');
    manager.joinDocument(mockSocket, 'doc-123');
    manager.leaveDocument(mockSocket, 'doc-123');

    const connections = manager.getDocumentConnections('doc-123');
    expect(connections.length).toBe(0);
  });

  it('should broadcast to document members', () => {
    const mockSocket1 = { readyState: 1, send: () => {} } as ServerWebSocket<unknown>;
    const mockSocket2 = { readyState: 1, send: () => {} } as ServerWebSocket<unknown>;

    let received1 = false;
    let received2 = false;

    (mockSocket1 as { send: (data: string) => void }).send = () => {
      received1 = true;
    };
    (mockSocket2 as { send: (data: string) => void }).send = () => {
      received2 = true;
    };

    manager.addConnection(mockSocket1, 'user-1');
    manager.addConnection(mockSocket2, 'user-2');
    manager.joinDocument(mockSocket1, 'doc-123');
    manager.joinDocument(mockSocket2, 'doc-123');

    manager.broadcastToDocument('doc-123', { type: 'TEST', data: 'hello' });

    expect(received1).toBe(true);
    expect(received2).toBe(true);
  });

  it('should support excluding sender from broadcast', () => {
    const mockSocket1 = { readyState: 1, send: () => {} } as ServerWebSocket<unknown>;
    const mockSocket2 = { readyState: 1, send: () => {} } as ServerWebSocket<unknown>;

    let received1 = false;
    let received2 = false;

    (mockSocket1 as { send: (data: string) => void }).send = () => {
      received1 = true;
    };
    (mockSocket2 as { send: (data: string) => void }).send = () => {
      received2 = true;
    };

    manager.addConnection(mockSocket1, 'user-1');
    manager.addConnection(mockSocket2, 'user-2');
    manager.joinDocument(mockSocket1, 'doc-123');
    manager.joinDocument(mockSocket2, 'doc-123');

    manager.broadcastToDocument('doc-123', { type: 'TEST', data: 'hello' }, mockSocket1);

    expect(received1).toBe(false);
    expect(received2).toBe(true);
  });

  it('should track document user count', () => {
    const mockSocket1 = { readyState: 1 } as ServerWebSocket<unknown>;
    const mockSocket2 = { readyState: 1 } as ServerWebSocket<unknown>;

    manager.addConnection(mockSocket1, 'user-1');
    manager.addConnection(mockSocket2, 'user-2');
    manager.joinDocument(mockSocket1, 'doc-123');
    manager.joinDocument(mockSocket2, 'doc-123');

    expect(manager.getDocumentUserCount('doc-123')).toBe(2);

    manager.leaveDocument(mockSocket1, 'doc-123');
    expect(manager.getDocumentUserCount('doc-123')).toBe(1);
  });
});

async function connectAndAuth(port: number, _userId: string = 'user-123'): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    const token = 'valid-token';

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'AUTH', token }));
    };

    ws.onmessage = event => {
      const msg = JSON.parse(event.data as string);
      if (msg.type === 'AUTH_SUCCESS') {
        resolve(ws);
      } else if (msg.type === 'AUTH_ERROR') {
        reject(new Error('Authentication failed'));
      }
    };

    ws.onerror = () => reject(new Error('Connection failed'));
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}

async function joinDocument(ws: WebSocket, documentId: string, userId: string): Promise<void> {
  return new Promise(resolve => {
    const msg: JoinDocumentMessage = {
      type: MessageType.JOIN_DOCUMENT,
      documentId,
      userId,
      timestamp: Date.now(),
    };
    ws.send(JSON.stringify(msg));
    setTimeout(resolve, 300);
  });
}
