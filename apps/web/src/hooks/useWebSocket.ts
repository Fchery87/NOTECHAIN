/**
 * useWebSocket Hook
 *
 * Manages WebSocket connection for real-time collaboration.
 * Handles connection, reconnection, authentication, and message handling.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketOptions {
  /** WebSocket server URL */
  url: string;
  /** JWT token for authentication */
  token?: string;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Reconnection interval in ms */
  reconnectInterval?: number;
  /** Max reconnection attempts */
  maxReconnectAttempts?: number;
  /** Heartbeat interval in ms */
  heartbeatInterval?: number;
  /** Debug mode */
  debug?: boolean;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface UseWebSocketReturn {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Whether connected */
  isConnected: boolean;
  /** Send a message */
  send: (message: WebSocketMessage) => void;
  /** Connect manually */
  connect: () => void;
  /** Disconnect manually */
  disconnect: () => void;
  /** Last received message */
  lastMessage: WebSocketMessage | null;
  /** Connection error */
  error: Error | null;
  /** Subscribe to messages of a specific type */
  subscribe: (type: string, handler: (message: WebSocketMessage) => void) => () => void;
}

const _DEFAULT_OPTIONS: Partial<WebSocketOptions> = {
  autoConnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  debug: false,
};

export function useWebSocket(options: WebSocketOptions): UseWebSocketReturn {
  const {
    url,
    token,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000,
    debug = false,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribersRef = useRef<Map<string, Set<(message: WebSocketMessage) => void>>>(new Map());
  const messageQueueRef = useRef<WebSocketMessage[]>([]);

  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) {
        console.log('[useWebSocket]', ...args);
      }
    },
    [debug]
  );

  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatTimeoutRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'PING' }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, clearHeartbeat]);

  const processMessageQueue = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      log('Processing queued messages:', messageQueueRef.current.length);
      while (messageQueueRef.current.length > 0) {
        const message = messageQueueRef.current.shift();
        if (message) {
          socketRef.current.send(JSON.stringify(message));
        }
      }
    }
  }, [log]);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      log('Already connected');
      return;
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
      log('Connecting to:', wsUrl);

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        log('Connected');
        setConnectionState('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
        startHeartbeat();
        processMessageQueue();
      };

      socket.onmessage = event => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          log('Received:', message);

          // Handle pong response
          if (message.type === 'PONG') {
            return;
          }

          setLastMessage(message);

          // Notify subscribers
          const handlers = subscribersRef.current.get(message.type);
          if (handlers) {
            handlers.forEach(handler => handler(message));
          }

          // Notify wildcard subscribers
          const wildcardHandlers = subscribersRef.current.get('*');
          if (wildcardHandlers) {
            wildcardHandlers.forEach(handler => handler(message));
          }
        } catch (err) {
          log('Failed to parse message:', err);
        }
      };

      socket.onerror = event => {
        log('Error:', event);
        setError(new Error('WebSocket error'));
      };

      socket.onclose = event => {
        log('Closed:', event.code, event.reason);
        clearHeartbeat();

        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          setConnectionState('reconnecting');
          reconnectAttemptsRef.current++;

          log(`Reconnecting in ${reconnectInterval}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setConnectionState('disconnected');
          if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            setError(new Error('Max reconnection attempts reached'));
          }
        }
      };
    } catch (err) {
      log('Connection error:', err);
      setError(err instanceof Error ? err : new Error('Connection failed'));
      setConnectionState('disconnected');
    }
  }, [
    url,
    token,
    reconnectInterval,
    maxReconnectAttempts,
    log,
    startHeartbeat,
    clearHeartbeat,
    processMessageQueue,
  ]);

  const disconnect = useCallback(() => {
    log('Disconnecting');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    clearHeartbeat();

    if (socketRef.current) {
      socketRef.current.close(1000, 'User disconnect');
      socketRef.current = null;
    }

    setConnectionState('disconnected');
    reconnectAttemptsRef.current = 0;
  }, [log, clearHeartbeat]);

  const send = useCallback(
    (message: WebSocketMessage) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        log('Sending:', message);
        socketRef.current.send(JSON.stringify(message));
      } else {
        log('Queueing message (not connected):', message);
        messageQueueRef.current.push(message);
      }
    },
    [log]
  );

  const subscribe = useCallback(
    (type: string, handler: (message: WebSocketMessage) => void): (() => void) => {
      if (!subscribersRef.current.has(type)) {
        subscribersRef.current.set(type, new Set());
      }

      subscribersRef.current.get(type)!.add(handler);

      return () => {
        subscribersRef.current.get(type)?.delete(handler);
        if (subscribersRef.current.get(type)?.size === 0) {
          subscribersRef.current.delete(type);
        }
      };
    },
    []
  );

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Reconnect when token changes
  useEffect(() => {
    if (token && connectionState === 'disconnected' && autoConnect) {
      connect();
    }
  }, [token, connectionState, autoConnect, connect]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    send,
    connect,
    disconnect,
    lastMessage,
    error,
    subscribe,
  };
}

export default useWebSocket;
