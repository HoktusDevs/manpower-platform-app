import { useState, useEffect, useRef, useCallback } from 'react';

// WebSocket configuration - NO AUTH NEEDED
const WEBSOCKET_URL = 'wss://qjmj4uodm7.execute-api.us-east-1.amazonaws.com/dev';

// Types for WebSocket messages
interface WebSocketMessage {
  type: 'connection_established' | 'realtime_update' | 'subscribed' | 'pong';
  action?: 'folder_created' | 'folder_updated' | 'folder_deleted' | 'file_created' | 'file_updated' | 'file_deleted';
  data?: {
    folderId?: string;
    fileId?: string;
    userId: string;
    eventType: 'INSERT' | 'MODIFY' | 'REMOVE';
    folder?: unknown;
    file?: unknown;
    timestamp: number;
  };
  timestamp?: string;
}

interface FolderUpdateEvent {
  action: 'folder_created' | 'folder_updated' | 'folder_deleted';
  data: {
    folderId: string;
    userId: string;
    eventType: 'INSERT' | 'MODIFY' | 'REMOVE';
    folder?: unknown;
    timestamp: number;
  };
}

interface FileUpdateEvent {
  action: 'file_created' | 'file_updated' | 'file_deleted';
  data: {
    fileId: string;
    userId: string;
    eventType: 'INSERT' | 'MODIFY' | 'REMOVE';
    file?: unknown;
    timestamp: number;
  };
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'disabled';
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: Record<string, unknown>) => void;
  disconnect: () => void;
  connect: () => void;
  resetConnection: () => void;
}

/**
 * Custom hook for WebSocket connection with real-time folder and file updates
 */
export const useWebSocket = (
  onFolderUpdate?: (event: FolderUpdateEvent) => void,
  onFileUpdate?: (event: FileUpdateEvent) => void,
  autoConnect: boolean = true
): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error' | 'disabled'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 2; // Reduced from 5 to 2 to avoid long loops

  // Refs for stable function references
  const connectRef = useRef<() => void>();
  const disconnectRef = useRef<() => void>();

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      console.log('📤 Sent WebSocket message:', message);
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  }, []);



  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    // Don't attempt to reconnect if we've exceeded max attempts
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.warn('⚠️ Max reconnection attempts reached, WebSocket disabled');
      setConnectionStatus('disabled');
      return;
    }

    console.log('🔌 Connecting to WebSocket:', WEBSOCKET_URL);
    setConnectionStatus('connecting');

    try {
      wsRef.current = new WebSocket(WEBSOCKET_URL);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket opened');
        // Send initial ping to trigger welcome message from server
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: 'initial_ping' }));
        }
      };

      wsRef.current.onmessage = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          // console.log('📨 Received WebSocket message:', message); // Commented to reduce noise

          switch (message.type) {
            case 'connection_established':
              console.log('✅ WebSocket connection established');
              setIsConnected(true);
              setConnectionStatus('connected');
              reconnectAttempts.current = 0;

              // Subscribe to folder and file updates
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ action: 'subscribe_folders' }));
                wsRef.current.send(JSON.stringify({ action: 'subscribe_files' }));
              }

              // Start heartbeat
              if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
              }

              heartbeatIntervalRef.current = setInterval(() => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ action: 'ping' }));
                }
              }, 30000);
              break;

            case 'realtime_update':
              if (message.action && message.data) {
                // Handle folder updates
                if (message.action.startsWith('folder_') && onFolderUpdate && message.data.folderId) {
                  console.log(`🔄 Real-time folder update: ${message.action}`, message.data);
                  onFolderUpdate({
                    action: message.action as 'folder_created' | 'folder_updated' | 'folder_deleted',
                    data: {
                      folderId: message.data.folderId,
                      userId: message.data.userId,
                      eventType: message.data.eventType,
                      folder: message.data.folder,
                      timestamp: message.data.timestamp
                    }
                  });
                }
                // Handle file updates
                else if (message.action.startsWith('file_') && onFileUpdate && message.data.fileId) {
                  console.log(`🔄 Real-time file update: ${message.action}`, message.data);
                  onFileUpdate({
                    action: message.action as 'file_created' | 'file_updated' | 'file_deleted',
                    data: {
                      fileId: message.data.fileId,
                      userId: message.data.userId,
                      eventType: message.data.eventType,
                      file: message.data.file,
                      timestamp: message.data.timestamp
                    }
                  });
                }
              }
              break;

            case 'subscribed':
              // console.log('📂 Subscribed to folder and file updates'); // Commented to reduce noise
              break;

            case 'pong':
              // Heartbeat response - silent
              break;

            default:
              console.log('ℹ️ Unknown message type:', message.type);
          }

        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');

        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Attempt to reconnect if it wasn't a manual disconnect
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);

          console.log(`🔄 Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts}) in ${delay}ms`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('❌ Max reconnection attempts reached, disabling WebSocket');
          setConnectionStatus('disabled');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error details:', {
          type: error.type,
          target: error.target,
          message: 'WebSocket connection failed - likely CORS or network issue',
          url: WEBSOCKET_URL
        });
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
      setConnectionStatus('error');
    }
  }, [onFolderUpdate, onFileUpdate]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000); // Normal closure
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
    reconnectAttempts.current = 0;
  }, []);

  // Update refs when functions change
  connectRef.current = connect;
  disconnectRef.current = disconnect;

  const resetConnection = useCallback(() => {
    console.log('🔄 Resetting WebSocket connection');
    disconnect();
    reconnectAttempts.current = 0;
    setConnectionStatus('disconnected');
  }, [disconnect]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connectRef.current?.();
    }

    // Cleanup on unmount
    return () => {
      disconnectRef.current?.();
    };
  }, [autoConnect]); // Stable dependencies to prevent infinite loops

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    sendMessage,
    disconnect,
    connect,
    resetConnection
  };
};