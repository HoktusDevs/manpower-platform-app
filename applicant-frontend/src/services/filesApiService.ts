/**
 * Files API Service
 * Handles all file-related REST API operations with the backend
 */

import { cognitoAuthService } from './cognitoAuthService';

export interface DocumentInfo {
  documentId: string;
  fileName: string;
  fileUrl: string;
  documentType: string;
  jobId: string;
  applicationId?: string;
  userId: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
  uploadedAt: string;
  ocrResult?: unknown;
}

export interface SaveDocumentRequest {
  fileName: string;
  fileUrl: string;
  documentType: string;
  jobId: string;
  applicationId?: string;
  userId: string;
  fileSize: number;
  mimeType: string;
}

export interface SaveDocumentResponse {
  success: boolean;
  documentId?: string;
  error?: string;
}

class FilesApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev';
  }

  private getHeaders(): HeadersInit {
    const accessToken = cognitoAuthService.getAccessToken();
    
    return {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
    };
  }

  /**
   * Guardar referencia de documento en el backend
   */
  async saveDocumentReference(request: SaveDocumentRequest): Promise<SaveDocumentResponse> {
    try {
      console.log('💾 Guardando referencia de documento en backend:', request.fileName);
      
      const response = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Files API: Save failed:', response.status, errorText);
        throw new Error(`Save failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Document reference saved:', result);
      
      return {
        success: true,
        documentId: result.documentId,
      };
    } catch (error) {
      console.error('❌ Files API: Failed to save document reference:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error guardando referencia del documento',
      };
    }
  }

  /**
   * Obtener documentos de un usuario
   */
  async getUserDocuments(userId: string): Promise<{ success: boolean; documents?: DocumentInfo[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/files/user/${userId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Get failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return {
        success: true,
        documents: result.documents || [],
      };
    } catch (error) {
      console.error('❌ Files API: Failed to get user documents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error obteniendo documentos',
      };
    }
  }

  /**
   * Obtener documentos de una aplicación específica
   */
  async getApplicationDocuments(applicationId: string): Promise<{ success: boolean; documents?: DocumentInfo[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/files/application/${applicationId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Get failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return {
        success: true,
        documents: result.documents || [],
      };
    } catch (error) {
      console.error('❌ Files API: Failed to get application documents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error obteniendo documentos de aplicación',
      };
    }
  }

  /**
   * Eliminar documento
   */
  async deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${documentId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} - ${errorText}`);
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ Files API: Failed to delete document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error eliminando documento',
      };
    }
  }

  /**
   * Asociar documento con aplicación
   */
  async associateDocumentWithApplication(
    documentId: string,
    applicationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${documentId}/associate`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ applicationId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Associate failed: ${response.status} - ${errorText}`);
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ Files API: Failed to associate document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error asociando documento',
      };
    }
  }
}

export const filesApiService = new FilesApiService();
