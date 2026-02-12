import type { ServerWebSocket } from 'bun';
import type { UserConnection, DocumentRoom, CollaborationMessage } from './types';

export class ConnectionManager {
  private connections: Map<ServerWebSocket<unknown>, UserConnection>;
  private documentRooms: Map<string, DocumentRoom>;

  constructor() {
    this.connections = new Map();
    this.documentRooms = new Map();
  }

  addConnection(socket: ServerWebSocket<unknown>, userId: string): UserConnection {
    const connection: UserConnection = {
      userId,
      socket,
      connectedAt: new Date(),
    };
    this.connections.set(socket, connection);
    return connection;
  }

  removeConnection(socket: ServerWebSocket<unknown>): void {
    const connection = this.connections.get(socket);
    if (connection?.documentId) {
      this.leaveDocument(socket, connection.documentId);
    }
    this.connections.delete(socket);
  }

  joinDocument(socket: ServerWebSocket<unknown>, documentId: string): void {
    const connection = this.connections.get(socket);
    if (!connection) return;

    if (connection.documentId && connection.documentId !== documentId) {
      this.leaveDocument(socket, connection.documentId);
    }

    connection.documentId = documentId;

    let room = this.documentRooms.get(documentId);
    if (!room) {
      room = {
        documentId,
        connections: new Set(),
      };
      this.documentRooms.set(documentId, room);
    }
    room.connections.add(connection);
  }

  leaveDocument(socket: ServerWebSocket<unknown>, documentId?: string): void {
    const connection = this.connections.get(socket);
    if (!connection) return;

    const targetDocumentId = documentId || connection.documentId;
    if (!targetDocumentId) return;

    const room = this.documentRooms.get(targetDocumentId);
    if (room) {
      room.connections.delete(connection);
      if (room.connections.size === 0) {
        this.documentRooms.delete(targetDocumentId);
      }
    }

    if (connection.documentId === targetDocumentId) {
      connection.documentId = undefined;
    }
  }

  getDocumentConnections(documentId: string): UserConnection[] {
    const room = this.documentRooms.get(documentId);
    if (!room) return [];
    return Array.from(room.connections);
  }

  getConnection(socket: ServerWebSocket<unknown>): UserConnection | undefined {
    return this.connections.get(socket);
  }

  broadcastToDocument(
    documentId: string,
    message: CollaborationMessage,
    excludeSocket?: ServerWebSocket<unknown>
  ): void {
    const room = this.documentRooms.get(documentId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    for (const connection of room.connections) {
      if (excludeSocket && connection.socket === excludeSocket) continue;
      if (connection.socket.readyState === 1) {
        connection.socket.send(messageStr);
      }
    }
  }

  getDocumentUserCount(documentId: string): number {
    const room = this.documentRooms.get(documentId);
    return room?.connections.size || 0;
  }
}
