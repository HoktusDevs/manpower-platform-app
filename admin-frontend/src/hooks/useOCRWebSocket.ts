import { useCallback, useEffect, useRef, useState } from 'react';
import { getWebSocketConfig, isWebSocketSupported, getWebSocketStatus } from '../config/websocket';

interface OCRDocumentUpdate {
  documentId: string;
  status: string;
  ocrResult?: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

export const useOCRWebSocket = (onDocumentUpdate: (update: OCRDocumentUpdate) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const config = getWebSocketConfig();

  const cleanup = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  const startPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, config.pingInterval);
  }, [config]);

  const connect = useCallback(() => {
    if (!isWebSocketSupported()) {
      setConnectionError('WebSocket no soportado en este navegador');
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      wsRef.current = new WebSocket(config.url);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        startPingInterval();

        // Subscribe to document updates
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'subscribe_documents' }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Ignorar mensajes de ping/pong y otros mensajes del sistema
          if (data.type === 'pong' || data.type === 'connection_established' || data.type === 'subscription_confirmed') {
            return;
          }

          // Procesar actualizaciones de documentos OCR
          if (data.type === 'document_update' && data.documentId) {
            onDocumentUpdate(data);
          }
        } catch {
          // Handle WebSocket message parsing error
          console.warn('Failed to parse WebSocket message');
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        cleanup();

        // Intentar reconectar si no fue un cierre intencional
        if (event.code !== 1000 && reconnectAttemptsRef.current < config.maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setConnectionError(`Reconectando... (intento ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, config.reconnectInterval);
        } else if (reconnectAttemptsRef.current >= config.maxReconnectAttempts) {
          setConnectionError(`WebSocket falló después de ${config.maxReconnectAttempts} intentos. Verifique la conexión del backend.`);
        }
      };

      wsRef.current.onerror = () => {
        setConnectionError('Error de conexi�n WebSocket');
      };

    } catch {
      setConnectionError('Error al crear conexi�n WebSocket');
      console.warn('Failed to create WebSocket connection');
    }
  }, [config, onDocumentUpdate, startPingInterval]);

  const disconnect = useCallback(() => {
    cleanup();
    reconnectAttemptsRef.current = config.maxReconnectAttempts; // Prevenir reconexi�n autom�tica

    if (wsRef.current) {
      wsRef.current.close(1000, 'Desconexi�n intencional');
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionError(null);
  }, [config]);

  const reconnect = () => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 100);
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    reconnect,
    status: getWebSocketStatus(wsRef.current)
  };
};