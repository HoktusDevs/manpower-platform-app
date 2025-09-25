/**
 * Hook for Document Processing WebSocket connection
 * Manages real-time notifications from the document_processing_microservice
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { documentProcessingService } from '../services/documentProcessingService';

// Definir la interfaz localmente para evitar problemas de importación
export interface WebSocketNotification {
  documentId: string;
  status: string;
  processingStatus: string;
  finalDecision?: string;
  documentType?: string;
  ocrResult?: Record<string, unknown>;
  extractedData?: Record<string, unknown>;
  observations?: Record<string, unknown>[];
  message: string;
  ownerUserName: string;
  fileName?: string;
  processingTime?: number;
  timestamp: string;
  error?: string;
  lambdaError?: boolean;
}

export interface UseDocumentProcessingWebSocketReturn {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  notifications: WebSocketNotification[];
  sendMessage: (message: Record<string, unknown>) => void;
  clearNotifications: () => void;
  lastNotification: WebSocketNotification | null;
}

export const useDocumentProcessingWebSocket = (): UseDocumentProcessingWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
  const [lastNotification, setLastNotification] = useState<WebSocketNotification | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      const wsUrl = documentProcessingService.getWebSocketUrl();
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        
        // Enviar mensaje de inicialización con action
        const initMessage = {
          action: 'connect',
          type: 'document_processing_connection'
        };
        wsRef.current?.send(JSON.stringify(initMessage));
        };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'document_processing_update' || data.type === 'document_update') {
            const notification: WebSocketNotification = {
              documentId: data.documentId,
              status: data.status,
              processingStatus: data.processingStatus,
              finalDecision: data.finalDecision,
              documentType: data.documentType,
              ocrResult: data.ocrResult,
              extractedData: data.extractedData,
              observations: data.observations,
              message: data.message,
              ownerUserName: data.ownerUserName,
              fileName: data.fileName,
              processingTime: data.processingTime,
              timestamp: data.timestamp,
              error: data.error,
              lambdaError: data.lambdaError
            };
            
            setNotifications(prev => [...prev, notification]);
            setLastNotification(notification);
          }
        } catch {
          // Handle WebSocket message parsing error
          console.warn('Failed to parse WebSocket message');
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect if not a manual close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = () => {
        setConnectionStatus('error');
      };

    } catch {
      setConnectionStatus('error');
      console.warn('Failed to establish WebSocket connection');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected, cannot send message');
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setLastNotification(null);
  }, []);

  useEffect(() => {
    // Conectar automáticamente al montar el componente
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionStatus,
    notifications,
    sendMessage,
    clearNotifications,
    lastNotification
  };
};
