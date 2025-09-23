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
  ocrResult?: any;
  extractedData?: any;
  observations?: any[];
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
  sendMessage: (message: any) => void;
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
      console.log('Connecting to Document Processing WebSocket:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Document Processing WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Document Processing WebSocket message received:', data);
          
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
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Document Processing WebSocket disconnected:', event.code, event.reason);
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

      wsRef.current.onerror = (error) => {
        console.error('Document Processing WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Error creating Document Processing WebSocket connection:', error);
      setConnectionStatus('error');
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

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setLastNotification(null);
  }, []);

  useEffect(() => {
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
