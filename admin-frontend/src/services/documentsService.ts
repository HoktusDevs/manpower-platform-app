/**
 * Documents Service
 * Handles document retrieval and management for admin folders
 */

import { applicantDataService } from './applicantDataService';

export type DocumentInfo = {
  documentId: string;
  fileName: string;
  fileUrl: string;
  documentType: string;
  jobId: string;
  applicationId: string;
  userId: string;
  fileSize: number;
  mimeType: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  uploadedAt: string;
  ocrResult?: unknown;
};

export type FolderDocument = {
  folderId: string;
  folderName: string;
  folderPath: string;
  folderType: string;
  documents: DocumentInfo[];
  totalDocuments: number;
  lastUploaded?: string;
};

export interface DocumentsResponse {
  success: boolean;
  documents?: FolderDocument[];
  error?: string;
}

class DocumentsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev';
  }

  /**
   * Obtener documentos por carpeta
   */
  async getDocumentsByFolder(): Promise<{ success: boolean; documents?: DocumentInfo[]; error?: string }> {
    try {
      // Simular obtención de documentos desde localStorage del postulante
      // En un sistema real, esto vendría del backend
      const allDocuments = this.getStoredDocuments();
      const folderDocuments = allDocuments.filter(doc =>
        doc.applicationId && this.isDocumentInFolder()
      );

      return {
        success: true,
        documents: folderDocuments,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Obtener todos los documentos organizados por carpeta
   */
  async getAllDocumentsByFolders(folders: unknown[]): Promise<DocumentsResponse> {
    try {
      const allDocuments = await this.getStoredDocuments();
      const folderDocuments: FolderDocument[] = [];

      for (const folder of folders) {
        if (folder.type === 'Postulante' && folder.metadata?.applicationId) {
          const applicationId = folder.metadata.applicationId;
          const documents = allDocuments.filter(doc => doc.applicationId === applicationId);

          if (documents.length > 0) {
            folderDocuments.push({
              folderId: folder.folderId,
              folderName: folder.name,
              folderPath: folder.path,
              folderType: folder.type,
              documents: documents,
              totalDocuments: documents.length,
              lastUploaded: documents.sort((a, b) => 
                new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
              )[0]?.uploadedAt,
            });
          }
        }
      }

      return {
        success: true,
        documents: folderDocuments,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Obtener documentos almacenados desde applicant-frontend
   */
  private async getStoredDocuments(): Promise<DocumentInfo[]> {
    try {
      // Obtener documentos desde el servicio de datos de postulantes
      const response = await applicantDataService.getApplicantDocuments();
      
      if (!response.success || !response.documents) {
        return [];
      }

      // Convertir formato de ApplicantDocument a DocumentInfo
      return response.documents.map((doc: unknown) => ({
        documentId: doc.documentId,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        documentType: doc.documentType,
        jobId: doc.jobId,
        applicationId: doc.applicationId,
        userId: doc.userId,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        status: doc.status || 'uploaded',
        uploadedAt: doc.createdAt || new Date().toISOString(),
        ocrResult: doc.ocrResult || null,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Verificar si un documento pertenece a una carpeta
   */
  private isDocumentInFolder(): boolean {
    // En un sistema real, esto se haría consultando la base de datos
    // Por ahora, simulamos la lógica basada en los metadatos de las carpetas
    return true; // Simplificado para la demo
  }

  /**
   * Obtener documento por ID
   */
  async getDocumentById(documentId: string): Promise<{ success: boolean; document?: DocumentInfo; error?: string }> {
    try {
      const allDocuments = await this.getStoredDocuments();
      const document = allDocuments.find(doc => doc.documentId === documentId);

      if (!document) {
        return {
          success: false,
          error: 'Documento no encontrado',
        };
      }

      return {
        success: true,
        document,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Descargar documento
   */
  async downloadDocument(documentId: string): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      const documentResult = await this.getDocumentById(documentId);
      
      if (!documentResult.success || !documentResult.document) {
        return {
          success: false,
          error: 'Documento no encontrado',
        };
      }

      // En un sistema real, aquí se generaría una URL de descarga segura
      return {
        success: true,
        downloadUrl: documentResult.document.fileUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Obtener estadísticas de documentos
   */
  async getDocumentStats(): Promise<{ success: boolean; stats?: unknown; error?: string }> {
    try {
      const allDocuments = await this.getStoredDocuments();
      
      const stats = {
        totalDocuments: allDocuments.length,
        completedDocuments: allDocuments.filter(doc => doc.status === 'completed').length,
        processingDocuments: allDocuments.filter(doc => doc.status === 'processing').length,
        failedDocuments: allDocuments.filter(doc => doc.status === 'failed').length,
        totalSize: allDocuments.reduce((sum, doc) => sum + doc.fileSize, 0),
        documentTypes: this.getDocumentTypeStats(allDocuments),
      };

      return {
        success: true,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Obtener estadísticas por tipo de documento
   */
  private getDocumentTypeStats(documents: DocumentInfo[]): Record<string, number> {
    const stats: Record<string, number> = {};
    
    documents.forEach(doc => {
      stats[doc.documentType] = (stats[doc.documentType] || 0) + 1;
    });

    return stats;
  }
}

export const documentsService = new DocumentsService();