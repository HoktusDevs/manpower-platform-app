import { s3Service } from './s3Service';
import { filesApiService } from './filesApiService';

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
  userId: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
  uploadedAt: string;
  ocrResult?: unknown;
}

class FilesService {
  constructor() {
    // Constructor for FilesService
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

      // Guardar referencia en el backend
      const saveResult = await filesApiService.saveDocumentReference({
        fileName: request.file.name,
        fileUrl: uploadResult.fileUrl,
        documentType: request.documentType,
        jobId: request.jobId,
        ...(request.applicationId && { applicationId: request.applicationId }),
        userId: request.userId,
        fileSize: request.file.size,
        mimeType: request.file.type,
      });

      if (!saveResult.success) {
        // Si falla guardar en DB, eliminar archivo de S3
        await s3Service.deleteFile(uploadResult.fileUrl);
        return {
          success: false,
          error: saveResult.error || 'Error guardando referencia del documento',
        };
      }

      return {
        success: true,
        ...(saveResult.documentId && { documentId: saveResult.documentId }),
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
   * Obtener documentos de un usuario desde el backend
   */
  async getUserDocuments(userId: string): Promise<{ success: boolean; documents?: DocumentInfo[]; error?: string }> {
    try {
      return await filesApiService.getUserDocuments(userId);
    } catch (error) {
      console.error('FilesService: Error getting user documents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Obtener documentos de una aplicación específica desde el backend
   */
  async getApplicationDocuments(applicationId: string): Promise<{ success: boolean; documents?: DocumentInfo[]; error?: string }> {
    try {
      return await filesApiService.getApplicationDocuments(applicationId);
    } catch (error) {
      console.error('FilesService: Error getting application documents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Eliminar documento desde el backend
   */
  async deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await filesApiService.deleteDocument(documentId);
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
        ...(result.presignedUrl && { downloadUrl: result.presignedUrl }),
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
   * Asociar documento existente con una aplicación en el backend
   */
  async associateDocumentWithApplication(
    documentId: string,
    applicationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await filesApiService.associateDocumentWithApplication(documentId, applicationId);
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
