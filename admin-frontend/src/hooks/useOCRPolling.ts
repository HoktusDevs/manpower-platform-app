import { useEffect, useRef, useState } from 'react';

export interface OCRDocumentUpdate {
  documentId: string;
  status: string;
  ocrResult?: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

export const useOCRPolling = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const startPolling = () => {
    setIsConnected(true);
    setConnectionError(null);
    
    // Simular actualizaciones cada 5 segundos
    pollingIntervalRef.current = setInterval(() => {
      // Aquí iría la lógica de polling real
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsConnected(false);
  };

  useEffect(() => {
    startPolling();
    
    return () => {
      stopPolling();
    };
  }, []);

  return {
    isConnected,
    connectionError,
    startPolling,
    stopPolling
  };
};

