/**
 * useWebSocket Hook
 *
 * Manages WebSocket connection for real-time collaboration.
 * Handles connection, reconnection, authentication, and message handling.
 *
 * Security: Authentication is performed via the first message after connection,
 * not via URL query parameters, to prevent token leakage in server logs.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'authenticated'
  | 'disconnected'
  | 'reconnecting'
  | 'authenticating';

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
  /** Authentication timeout in ms */
  authTimeout?: number;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface UseWebSocketReturn {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Whether connected and authenticated */
  isConnected: boolean;
  /** Whether authenticated */
  isAuthenticated: boolean;
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

/**
 * Generate a short-lived one-time token for WebSocket authentication
 * In production, this would call an API endpoint to get a time-limited token
 */
async function getOneTimeToken(jwtToken: string): Promise<string> {
  // In a real implementation, this would call an API endpoint like:
  // const response = await fetch('/api/auth/ws-token', {
  //   headers: { Authorization: `Bearer ${jwtToken}` }
  // });
  // return response.json().token;

  // For now, we use the JWT directly but send it via message, not URL
  return jwtToken;
}

export function useWebSocket(options: WebSocketOptions): UseWebSocketReturn {
  const {
    url,
    token,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000,
    debug = false,
    authTimeout = 10000,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribersRef = useRef<Map<string, Set<(message: WebSocketMessage) => void>>>(new Map());
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const isAuthenticatedRef = useRef(false);

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

  const clearAuthTimeout = useCallback(() => {
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatTimeoutRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
        socketRef.current.send(JSON.stringify({ type: 'PING' }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, clearHeartbeat]);

  const processMessageQueue = useCallback(() => {
    if (
      socketRef.current?.readyState === WebSocket.OPEN &&
      isAuthenticatedRef.current &&
      messageQueueRef.current.length > 0
    ) {
      log('Processing queued messages:', messageQueueRef.current.length);
      while (messageQueueRef.current.length > 0) {
        const message = messageQueueRef.current.shift();
        if (message) {
          socketRef.current.send(JSON.stringify(message));
        }
      }
    }
  }, [log]);

  const authenticate = useCallback(async () => {
    if (!token) {
      log('No token provided, sending dev auth');
      // Still send AUTH message so the server can authenticate the connection
      // The server's authValidator handles dev-mode by returning 'dev-user'
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'AUTH',
            token: 'dev-anonymous',
            timestamp: Date.now(),
          })
        );

        // Set auth timeout for dev auth too
        clearAuthTimeout();
        authTimeoutRef.current = setTimeout(() => {
          log('Dev auth timeout');
          setError(new Error('Authentication timeout'));
          setConnectionState('disconnected');
          if (socketRef.current) {
            socketRef.current.onopen = null;
            socketRef.current.onmessage = null;
            socketRef.current.onerror = null;
            socketRef.current.onclose = null;
            if (socketRef.current.readyState === WebSocket.OPEN) {
              socketRef.current.close(1000, 'Auth timeout');
            }
            socketRef.current = null;
          }
        }, authTimeout);
      }
      return;
    }

    setConnectionState('authenticating');
    log('Authenticating...');

    try {
      // Get a one-time token for WebSocket authentication
      const oneTimeToken = await getOneTimeToken(token);

      // Send authentication message
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'AUTH',
            token: oneTimeToken,
            timestamp: Date.now(),
          })
        );

        // Set auth timeout
        clearAuthTimeout();
        authTimeoutRef.current = setTimeout(() => {
          log('Authentication timeout');
          setError(new Error('Authentication timeout'));
          setConnectionState('disconnected');
          if (socketRef.current) {
            socketRef.current.onopen = null;
            socketRef.current.onmessage = null;
            socketRef.current.onerror = null;
            socketRef.current.onclose = null;
            if (socketRef.current.readyState === WebSocket.OPEN) {
              socketRef.current.close(1000, 'Auth timeout');
            }
            socketRef.current = null;
          }
        }, authTimeout);
      }
    } catch (err) {
      log('Authentication error:', err);
      setError(err instanceof Error ? err : new Error('Authentication failed'));
      setConnectionState('disconnected');
    }
  }, [token, log, authTimeout, clearAuthTimeout, startHeartbeat, processMessageQueue]);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      log('Already connected');
      return;
    }

    setConnectionState('connecting');
    setError(null);
    isAuthenticatedRef.current = false;

    try {
      // Connect without token in URL - authentication happens via first message
      log('Connecting to:', url);

      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        log('Connected, initiating authentication');
        setConnectionState('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Start authentication process
        authenticate();
      };

      socket.onmessage = event => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          log('Received:', message);

          // Handle authentication response
          if (message.type === 'AUTH_SUCCESS') {
            clearAuthTimeout();
            isAuthenticatedRef.current = true;
            setConnectionState('authenticated');
            log('Authentication successful');
            startHeartbeat();
            processMessageQueue();
            return;
          }

          if (message.type === 'AUTH_ERROR') {
            clearAuthTimeout();
            const reason = (message as { reason?: string }).reason || 'Authentication failed';
            log('Authentication failed:', reason);
            setError(new Error(reason));
            disconnect();
            return;
          }

          // Handle pong response
          if (message.type === 'PONG') {
            return;
          }

          // Only process other messages if authenticated
          if (!isAuthenticatedRef.current) {
            log('Ignoring message - not authenticated');
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
        const errorMsg = `WebSocket error: Unable to connect to ${url}. Ensure the server is running on port 3001.`;
        setError(new Error(errorMsg));
      };

      socket.onclose = event => {
        log('Closed:', event.code, event.reason);
        clearHeartbeat();
        clearAuthTimeout();
        isAuthenticatedRef.current = false;

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
    reconnectInterval,
    maxReconnectAttempts,
    log,
    authenticate,
    startHeartbeat,
    clearHeartbeat,
    clearAuthTimeout,
    processMessageQueue,
  ]);

  const disconnect = useCallback(() => {
    log('Disconnecting');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    clearHeartbeat();
    clearAuthTimeout();

    if (socketRef.current) {
      const socket = socketRef.current;
      // Detach handlers to prevent stale callbacks
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CLOSING) {
        socket.close(1000, 'User disconnect');
      }
      // If CONNECTING, just drop the reference — the detached handlers prevent side effects
      socketRef.current = null;
    }

    setConnectionState('disconnected');
    isAuthenticatedRef.current = false;
    reconnectAttemptsRef.current = 0;
  }, [log, clearHeartbeat, clearAuthTimeout]);

  const send = useCallback(
    (message: WebSocketMessage) => {
      // Only send if authenticated (or if it's an auth message)
      if (message.type === 'AUTH') {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          log('Sending auth message');
          socketRef.current.send(JSON.stringify(message));
        }
        return;
      }

      if (socketRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
        log('Sending:', message);
        socketRef.current.send(JSON.stringify(message));
      } else {
        log('Queueing message (not connected/authenticated):', message);
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

  // Auto-connect on mount — resilient to React Strict Mode double-invoke
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autoConnect) {
      // Small delay allows Strict Mode's immediate unmount/remount to settle
      connectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 50);
    }

    return () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
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
    isConnected: connectionState === 'authenticated',
    isAuthenticated: isAuthenticatedRef.current,
    send,
    connect,
    disconnect,
    lastMessage,
    error,
    subscribe,
  };
}

export default useWebSocket;
