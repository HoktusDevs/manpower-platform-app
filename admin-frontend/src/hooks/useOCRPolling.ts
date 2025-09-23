import { useEffect, useRef, useState } from 'react';

interface OCRDocumentUpdate {
  documentId: string;
  status: string;
  ocrResult?: any;
  error?: string;
  timestamp: string;
}

export const useOCRPolling = (onDocumentUpdate: (update: OCRDocumentUpdate) => void) => {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const startPolling = () => {
    console.log('Starting OCR polling...');
    setIsConnected(true);
    setConnectionError(null);
    
    // Simular actualizaciones cada 5 segundos
    pollingIntervalRef.current = setInterval(() => {
      console.log('Polling for OCR updates...');
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



