import { s3Service } from './s3Service';

export interface DocumentUploadRequest {
  file: File;
  userId: string;
  documentType: string;
  jobId: string;
  applicationId?: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  documentId?: string;
  fileUrl?: string;
  error?: string;
}

export interface DocumentInfo {
  documentId: string;
  fileName: string;
  fileUrl: string;
  documentType: string;
  jobId: string;
  applicationId?: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
  uploadedAt: string;
  ocrResult?: unknown;
}

class FilesService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev';
  }

  /**
   * Subir documento a S3 y guardar referencia en DynamoDB
   */
  async uploadDocument(request: DocumentUploadRequest): Promise<DocumentUploadResponse> {
    try {
      // Validar archivo
      if (!s3Service.validateFileType(request.file)) {
        return {
          success: false,
          error: 'Tipo de archivo no permitido. Solo se permiten PDF, DOC, DOCX, JPG, PNG',
        };
      }

      if (!s3Service.validateFileSize(request.file)) {
        return {
          success: false,
          error: 'El archivo es demasiado grande. Máximo 10MB',
        };
      }

      // Generar nombre único
      const uniqueFileName = s3Service.generateUniqueFileName(
        request.file.name,
        request.userId,
        request.documentType
      );

      // Obtener presigned URL
      const presignedResult = await s3Service.getPresignedUploadUrl(
        uniqueFileName,
        request.file.type,
        request.userId,
        request.documentType
      );

      if (!presignedResult.success || !presignedResult.presignedUrl) {
        return {
          success: false,
          error: presignedResult.error || 'Error obteniendo URL de subida',
        };
      }

      // Subir archivo a S3
      const uploadResult = await s3Service.uploadFile(
        request.file,
        presignedResult.presignedUrl
      );

      if (!uploadResult.success || !uploadResult.fileUrl) {
        return {
          success: false,
          error: uploadResult.error || 'Error subiendo archivo',
        };
      }

      // Guardar referencia en DynamoDB
      const saveResult = await this.saveDocumentReference({
        fileName: request.file.name,
        fileUrl: uploadResult.fileUrl,
        documentType: request.documentType,
        jobId: request.jobId,
        applicationId: request.applicationId,
        userId: request.userId,
        fileSize: request.file.size,
        mimeType: request.file.type,
      });

      if (!saveResult.success) {
        // Si falla guardar en DB, eliminar archivo de S3
        await s3Service.deleteFile();
        return {
          success: false,
          error: saveResult.error || 'Error guardando referencia del documento',
        };
      }

      return {
        success: true,
        documentId: saveResult.documentId,
        fileUrl: uploadResult.fileUrl,
      };
    } catch (error) {
      console.error('FilesService: Error uploading document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Guardar referencia del documento en localStorage (SIN BACKEND)
   */
  private async saveDocumentReference(documentData: {
    fileName: string;
    fileUrl: string;
    documentType: string;
    jobId: string;
    applicationId?: string;
    userId: string;
    fileSize: number;
    mimeType: string;
  }): Promise<{ success: boolean; documentId?: string; error?: string }> {
    try {
      // Generar ID único
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Guardar en localStorage
      const documentInfo = {
        documentId,
        fileName: documentData.fileName,
        fileUrl: documentData.fileUrl,
        documentType: documentData.documentType,
        jobId: documentData.jobId,
        applicationId: documentData.applicationId,
        userId: documentData.userId,
        fileSize: documentData.fileSize,
        mimeType: documentData.mimeType,
        status: 'uploaded',
        createdAt: new Date().toISOString(),
      };

      // Obtener documentos existentes
      const existingDocs = JSON.parse(localStorage.getItem('user_documents') || '[]');
      existingDocs.push(documentInfo);
      localStorage.setItem('user_documents', JSON.stringify(existingDocs));

      return {
        success: true,
        documentId,
      };
    } catch (error) {
      console.error('FilesService: Error saving document reference:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Obtener documentos de un usuario desde localStorage (SIN BACKEND)
   */
  async getUserDocuments(userId: string): Promise<{ success: boolean; documents?: DocumentInfo[]; error?: string }> {
    try {
      // Obtener documentos desde localStorage
      const allDocs = JSON.parse(localStorage.getItem('user_documents') || '[]');
      const userDocs = allDocs.filter((doc: unknown) => (doc as DocumentInfo).userId === userId);

      return {
        success: true,
        documents: userDocs,
      };
    } catch (error) {
      console.error('FilesService: Error getting user documents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Obtener documentos de una aplicación específica desde localStorage (SIN BACKEND)
   */
  async getApplicationDocuments(applicationId: string): Promise<{ success: boolean; documents?: DocumentInfo[]; error?: string }> {
    try {
      // Obtener documentos desde localStorage
      const allDocs = JSON.parse(localStorage.getItem('user_documents') || '[]');
      const appDocs = allDocs.filter((doc: unknown) => (doc as DocumentInfo).applicationId === applicationId);

      return {
        success: true,
        documents: appDocs,
      };
    } catch (error) {
      console.error('FilesService: Error getting application documents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Eliminar documento desde localStorage (SIN BACKEND)
   */
  async deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Obtener documentos desde localStorage
      const allDocs = JSON.parse(localStorage.getItem('user_documents') || '[]');
      const filteredDocs = allDocs.filter((doc: unknown) => (doc as DocumentInfo).documentId !== documentId);
      localStorage.setItem('user_documents', JSON.stringify(filteredDocs));

      return {
        success: true,
      };
    } catch (error) {
      console.error('FilesService: Error deleting document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Obtener URL de descarga para un documento
   */
  async getDocumentDownloadUrl(fileUrl: string): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      const result = await s3Service.getPresignedDownloadUrl(fileUrl);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Error obteniendo URL de descarga',
        };
      }

      return {
        success: true,
        downloadUrl: result.presignedUrl,
      };
    } catch (error) {
      console.error('FilesService: Error getting download URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Asociar documento existente con una aplicación en localStorage (SIN BACKEND)
   */
  async associateDocumentWithApplication(
    documentId: string,
    applicationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Obtener documentos desde localStorage
      const allDocs = JSON.parse(localStorage.getItem('user_documents') || '[]');
      const docIndex = allDocs.findIndex((doc: unknown) => (doc as DocumentInfo).documentId === documentId);
      
      if (docIndex === -1) {
        return {
          success: false,
          error: 'Documento no encontrado',
        };
      }

      // Actualizar documento con applicationId
      allDocs[docIndex].applicationId = applicationId;
      localStorage.setItem('user_documents', JSON.stringify(allDocs));

      return {
        success: true,
      };
    } catch (error) {
      console.error('FilesService: Error associating document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }
}

export const filesService = new FilesService();
