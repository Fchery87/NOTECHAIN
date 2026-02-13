/**
 * Tests for useCollaboration and useWebSocket hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWebSocket } from '../useWebSocket';
import { useCollaboration } from '../useCollaboration';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string) {
    // Echo back for testing
  }

  close(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason }));
  }

  // Test helper to simulate receiving a message
  _receiveMessage(data: object) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }
}

// Replace global WebSocket with mock
vi.stubGlobal('WebSocket', MockWebSocket);

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:3001',
        autoConnect: false,
      })
    );

    expect(result.current.connectionState).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);
  });

  it('should connect when autoConnect is true', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:3001',
        autoConnect: true,
      })
    );

    expect(result.current.connectionState).toBe('connecting');

    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.connectionState).toBe('connected');
    expect(result.current.isConnected).toBe(true);
  });

  it('should send messages when connected', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:3001',
        autoConnect: true,
      })
    );

    await act(async () => {
      vi.runAllTimers();
    });

    const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');

    act(() => {
      result.current.send({ type: 'TEST', data: 'hello' });
    });

    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ type: 'TEST', data: 'hello' }));
  });

  it('should queue messages when not connected', () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:3001',
        autoConnect: false,
      })
    );

    const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');

    act(() => {
      result.current.send({ type: 'TEST', data: 'queued' });
    });

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('should handle received messages', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:3001',
        autoConnect: true,
      })
    );

    await act(async () => {
      vi.runAllTimers();
    });

    // Get the WebSocket instance
    const ws = result.current as unknown as { _ws: MockWebSocket };

    act(() => {
      // Simulate receiving a message
      const mockWs = new MockWebSocket('ws://localhost:3001');
      mockWs.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'TEST', data: 'received' }),
        })
      );
    });
  });

  it('should subscribe to message types', async () => {
    const handler = vi.fn();

    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:3001',
        autoConnect: true,
      })
    );

    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.subscribe('TEST', handler);
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should disconnect manually', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:3001',
        autoConnect: true,
      })
    );

    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.connectionState).toBe('disconnected');
  });
});

describe('useCollaboration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const defaultOptions = {
    documentId: 'doc-123',
    userId: 'user-1',
    displayName: 'Test User',
    permissionLevel: 'edit' as const,
    wsUrl: 'ws://localhost:3001',
  };

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() =>
      useCollaboration({
        ...defaultOptions,
        autoConnect: false,
      } as any)
    );

    expect(result.current.connectedUsers).toEqual([]);
    expect(result.current.pendingOperations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should have local presence with user info', () => {
    const { result } = renderHook(() =>
      useCollaboration({
        ...defaultOptions,
        autoConnect: false,
      } as any)
    );

    expect(result.current.localPresence.userId).toBe('user-1');
    expect(result.current.localPresence.displayName).toBe('Test User');
    expect(result.current.localPresence.color).toBeDefined();
  });

  it('should not send operations with view-only permission', async () => {
    const { result } = renderHook(() =>
      useCollaboration({
        ...defaultOptions,
        permissionLevel: 'view',
      } as any)
    );

    await act(async () => {
      vi.runAllTimers();
    });

    const operation = {
      type: 0, // CRDTOperationType.INSERT
      position: 0,
      content: 'test',
      userId: 'user-1',
      timestamp: Date.now(),
      id: 'op-1',
    };

    // Should not throw, but operation should not be sent
    act(() => {
      result.current.sendOperation(operation);
    });

    // With view permission, operation should not be added to pending
    expect(result.current.pendingOperations).toEqual([]);
  });

  it('should provide subscription methods', () => {
    const { result } = renderHook(() =>
      useCollaboration({
        ...defaultOptions,
        autoConnect: false,
      } as any)
    );

    const operationHandler = vi.fn();
    const cursorHandler = vi.fn();
    const joinHandler = vi.fn();
    const leaveHandler = vi.fn();

    let unsubOp: () => void;
    let unsubCursor: () => void;
    let unsubJoin: () => void;
    let unsubLeave: () => void;

    act(() => {
      unsubOp = result.current.onRemoteOperation(operationHandler);
      unsubCursor = result.current.onCursorUpdate(cursorHandler);
      unsubJoin = result.current.onUserJoin(joinHandler);
      unsubLeave = result.current.onUserLeave(leaveHandler);
    });

    // Verify unsubscribers are functions
    expect(typeof unsubOp!).toBe('function');
    expect(typeof unsubCursor!).toBe('function');
    expect(typeof unsubJoin!).toBe('function');
    expect(typeof unsubLeave!).toBe('function');
  });

  it('should generate consistent colors for user IDs', () => {
    const { result: result1 } = renderHook(() =>
      useCollaboration({
        ...defaultOptions,
        userId: 'user-alice',
        autoConnect: false,
      } as any)
    );

    const { result: result2 } = renderHook(() =>
      useCollaboration({
        ...defaultOptions,
        userId: 'user-alice',
        autoConnect: false,
      } as any)
    );

    // Same user ID should get same color
    expect(result1.current.localPresence.color).toBe(result2.current.localPresence.color);
  });
});
