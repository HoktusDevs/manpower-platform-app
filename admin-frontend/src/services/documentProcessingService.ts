/**
 * Document Processing Service
 * Service for interacting with the document_processing_microservice
 */

import { API_CONFIG } from '../config/api.config';

export interface DocumentData {
  file_name: string;
  file_url: string;
  platform_document_id: string;
}

export interface ProcessDocumentsRequest {
  owner_user_name: string;
  documents: DocumentData[];
}

export interface ProcessDocumentsResponse {
  message: string;
  status: string;
  owner_user_name: string;
  document_count: number;
  batch_id: string;
  note?: string;
}

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

class DocumentProcessingService {
  private baseUrl: string;
  private websocketUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.documentProcessing.baseUrl;
    this.websocketUrl = API_CONFIG.documentProcessing.websocketUrl;
  }

  /**
   * Process documents using the new document processing microservice
   */
  async processDocuments(request: ProcessDocumentsRequest): Promise<ProcessDocumentsResponse> {
    const response = await fetch(`${this.baseUrl}${API_CONFIG.documentProcessing.endpoints.processDocuments}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Check health of the document processing service
   */
  async checkHealth(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}${API_CONFIG.documentProcessing.endpoints.health}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Send WebSocket notification manually
   */
  async sendWebSocketNotification(notification: Partial<WebSocketNotification>): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}${API_CONFIG.documentProcessing.endpoints.websocketNotify}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
  }

  /**
   * Get documents from the database
   */
  async getDocuments(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}/api/v1/documents`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
  }

  /**
   * Delete a document from the database
   */
  async deleteDocument(documentId: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}/api/v1/documents/delete/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }

      return await response.json();
  }

  /**
   * Update document decision (APPROVED, REJECTED, MANUAL_REVIEW)
   */
  async updateDocumentDecision(documentId: string, decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING'): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}/api/v1/documents/update-decision/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update document decision');
      }

      return await response.json();
  }

  /**
   * Get WebSocket URL for real-time connections
   */
  getWebSocketUrl(): string {
    return this.websocketUrl;
  }
}

export const documentProcessingService = new DocumentProcessingService();
export default documentProcessingService;
