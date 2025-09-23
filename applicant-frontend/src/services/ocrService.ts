
export interface OCRProcessRequest {
  documentId: string;
  fileUrl: string;
  fileName: string;
  userId: string;
  jobId: string;
  applicationId?: string;
}

export interface OCRProcessResponse {
  success: boolean;
  requestId?: string;
  error?: string;
}

export interface OCRDocumentStatus {
  documentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  ocrResult?: {
    success: boolean;
    confidence: number;
    extractedText: string;
    language: string;
    fields?: Record<string, unknown>;
  };
  error?: string;
  processingTime?: number;
}

export interface OCRWebSocketMessage {
  type: 'document_update' | 'connection_established' | 'pong';
  documentId?: string;
  status?: string;
  ocrResult?: unknown;
  timestamp: string;
  message?: string;
  connectionId?: string;
}

class OCRService {
  private baseUrl: string;
  private websocketUrl: string;
  private websocket: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 5000;
  private messageHandlers: Map<string, (message: OCRWebSocketMessage) => void> = new Map();

  constructor() {
    this.baseUrl = 'https://xtspcl5cj6.execute-api.us-east-1.amazonaws.com/dev';
    this.websocketUrl = 'wss://axt7p628rd.execute-api.us-east-1.amazonaws.com/dev';
  }

  /**
   * Procesar documento con OCR
   */
  async processDocument(request: OCRProcessRequest): Promise<OCRProcessResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ocr/process-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner_user_name: request.userId,
          url_response: `${this.baseUrl}/api/ocr/callback`,
          documents: [
            {
              file_name: request.fileName,
              file_url: request.fileUrl,
              platform_document_id: request.documentId,
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Error procesando documento con OCR',
        };
      }

      return {
        success: true,
        requestId: data.requestId,
      };
    } catch (error) {
      console.error('OCRService: Error processing document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Obtener estado de un documento
   */
  async getDocumentStatus(documentId: string): Promise<{ success: boolean; status?: OCRDocumentStatus; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ocr/document/${documentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Error obteniendo estado del documento',
        };
      }

      return {
        success: true,
        status: data.document,
      };
    } catch (error) {
      console.error('OCRService: Error getting document status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Conectar WebSocket para notificaciones en tiempo real
   */
  connectWebSocket(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.websocket = new WebSocket(this.websocketUrl);

        this.websocket.onopen = () => {
          console.log('OCR WebSocket connected');
          this.reconnectAttempts = 0;
          this.subscribeToDocuments();
          resolve(true);
        };

        this.websocket.onmessage = (event) => {
          try {
            const message: OCRWebSocketMessage = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.websocket.onclose = () => {
          console.log('OCR WebSocket disconnected');
          this.attemptReconnect();
        };

        this.websocket.onerror = (error) => {
          console.error('OCR WebSocket error:', error);
          resolve(false);
        };
      } catch (error) {
        console.error('Error connecting WebSocket:', error);
        resolve(false);
      }
    });
  }

  /**
   * Desconectar WebSocket
   */
  disconnectWebSocket(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  /**
   * Suscribirse a actualizaciones de documentos
   */
  private subscribeToDocuments(): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'subscribe_documents',
      }));
    }
  }

  /**
   * Manejar mensajes del WebSocket
   */
  private handleWebSocketMessage(message: OCRWebSocketMessage): void {
    console.log('OCR WebSocket message received:', message);

    switch (message.type) {
      case 'connection_established':
        console.log('OCR WebSocket connection established:', message.message);
        break;

      case 'document_update':
        if (message.documentId && message.status) {
          this.notifyDocumentUpdate(message.documentId, message.status, message.ocrResult);
        }
        break;

      case 'pong':
        console.log('OCR WebSocket pong received');
        break;

      default:
        console.log('Unknown OCR WebSocket message type:', message.type);
    }
  }

  /**
   * Notificar actualización de documento
   */
  private notifyDocumentUpdate(documentId: string, status: string, ocrResult?: unknown): void {
    const handlers = this.messageHandlers.get('document_update');
    if (handlers) {
      handlers({
        type: 'document_update',
        documentId,
        status,
        ocrResult,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Registrar handler para mensajes específicos
   */
  onMessage(type: string, handler: (message: OCRWebSocketMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remover handler
   */
  offMessage(type: string): void {
    this.messageHandlers.delete(type);
  }

  /**
   * Intentar reconectar WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect OCR WebSocket... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connectWebSocket();
      }, this.reconnectInterval);
    } else {
      console.error('Max OCR WebSocket reconnection attempts reached');
    }
  }

  /**
   * Enviar ping para mantener conexión
   */
  ping(): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'ping',
      }));
    }
  }

  /**
   * Obtener documentos por estado
   */
  async getDocumentsByStatus(status: string): Promise<{ success: boolean; documents?: OCRDocumentStatus[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ocr/documents?status=${status}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Error obteniendo documentos por estado',
        };
      }

      return {
        success: true,
        documents: data.documents,
      };
    } catch (error) {
      console.error('OCRService: Error getting documents by status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Eliminar documento del OCR
   */
  async deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ocr/delete/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Error eliminando documento del OCR',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('OCRService: Error deleting document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }
}

export const ocrService = new OCRService();
