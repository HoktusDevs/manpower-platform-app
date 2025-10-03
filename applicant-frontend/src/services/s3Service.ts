import { cognitoAuthService } from './cognitoAuthService';
import { apiClient } from '../lib/axios';
import { AxiosError } from 'axios';

export interface S3UploadResult {
  success: boolean;
  fileUrl?: string;
  error?: string;
}

export interface PresignedUrlResponse {
  success: boolean;
  presignedUrl?: string;
  fileUrl?: string;
  error?: string;
}

class S3Service {
  private fileUploadServiceUrl: string;

  constructor() {
    this.fileUploadServiceUrl = 'https://lp5u5gdahh.execute-api.us-east-1.amazonaws.com/dev';
  }

  /**
   * Obtener presigned URL para subir archivo - genera URL directamente sin backend
   * Genera un key S3 único y devuelve una estructura compatible
   */
  async getPresignedUploadUrl(
    fileName: string,
    fileType: string,
    userId: string,
    documentType: string
  ): Promise<PresignedUrlResponse> {
    try {
      // Generar key único para S3
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const extension = fileName.split('.').pop();
      const s3Key = `documents/${userId}/${documentType}/${timestamp}_${randomString}.${extension}`;

      // Generar presigned URL usando el backend
      const accessToken = cognitoAuthService.getAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: 'No hay token de acceso disponible',
        };
      }

      console.log('📤 Generating S3 presigned URL for:', fileName);

      // Endpoint simple que solo genera presigned URL de S3
      const { data } = await apiClient.post(`${this.fileUploadServiceUrl}/generate-presigned-url`, {
        s3Key,
        fileType,
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!data.presignedUrl) {
        throw new Error('Respuesta inválida del servidor');
      }

      // Construir la URL final del archivo
      const fileUrl = `https://manpower-documents-dev.s3.us-east-1.amazonaws.com/${s3Key}`;

      console.log('✅ Presigned URL generada exitosamente');

      return {
        success: true,
        presignedUrl: data.presignedUrl,
        fileUrl,
      };
    } catch (error) {
      console.error('S3Service: Error getting presigned URL:', error);
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || (error instanceof Error ? error.message : 'Error generando URL de subida'),
      };
    }
  }

  /**
   * Subir archivo usando presigned URL
   */
  async uploadFile(
    file: File,
    presignedUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<S3UploadResult> {
    try {
      console.log('📤 Subiendo archivo a S3:', file.name);
      
      // Crear FormData para la subida
      const formData = new FormData();
      formData.append('file', file);

      // Subir archivo usando fetch con presigned URL
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error(`Error subiendo archivo: ${response.status} ${response.statusText}`);
      }

      // Extraer URL del archivo desde la presigned URL
      const fileUrl = presignedUrl.split('?')[0];

      console.log('✅ Archivo subido exitosamente:', fileUrl);
      
      if (onProgress) {
        onProgress(100);
      }

      return {
        success: true,
        fileUrl: fileUrl || '',
      };
    } catch (error) {
      console.error('S3Service: Error uploading file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error subiendo archivo',
      };
    }
  }

  /**
   * Obtener presigned URL para descargar archivo
   */
  async getPresignedDownloadUrl(fileUrl: string): Promise<PresignedUrlResponse> {
    try {
      const accessToken = cognitoAuthService.getAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: 'No hay token de acceso disponible',
        };
      }

      console.log('📥 Requesting download URL from backend:', fileUrl);

      const { data } = await apiClient.post(`${this.fileUploadServiceUrl}/download-url`, {
        fileUrl,
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!data.presignedUrl) {
        throw new Error('Respuesta inválida del servidor');
      }

      console.log('✅ Download URL obtenida exitosamente');

      return {
        success: true,
        presignedUrl: data.presignedUrl,
        fileUrl,
      };
    } catch (error) {
      console.error('S3Service: Error getting download URL:', error);
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || (error instanceof Error ? error.message : 'Error generando URL de descarga'),
      };
    }
  }

  /**
   * Eliminar archivo de S3
   */
  async deleteFile(fileUrl: string): Promise<S3UploadResult> {
    try {
      const accessToken = cognitoAuthService.getAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: 'No hay token de acceso disponible',
        };
      }

      console.log('🗑️ Requesting file deletion from backend:', fileUrl);

      await apiClient.delete(`${this.fileUploadServiceUrl}/delete-file`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        data: {
          fileUrl,
        },
      });

      console.log('✅ Archivo eliminado exitosamente');

      return {
        success: true,
      };
    } catch (error) {
      console.error('S3Service: Error deleting file:', error);
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || (error instanceof Error ? error.message : 'Error eliminando archivo'),
      };
    }
  }

  /**
   * Validar tipo de archivo
   */
  validateFileType(file: File): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];

    return allowedTypes.includes(file.type);
  }

  /**
   * Validar tamaño de archivo
   */
  validateFileSize(file: File, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  /**
   * Generar nombre único para archivo
   */
  generateUniqueFileName(originalName: string, userId: string, documentType: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    return `${userId}_${documentType}_${timestamp}_${randomString}.${extension}`;
  }

  /**
   * Subir archivo completo al file-upload-service con folderId
   * Esto sube el archivo a S3 y lo registra en files-service automáticamente
   */
  async uploadFileToFolder(
    file: File,
    folderId: string,
    fileName?: string,
    fileType?: string
  ): Promise<{ success: boolean; fileUrl?: string; documentId?: string; error?: string }> {
    try {
      const accessToken = cognitoAuthService.getAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: 'No hay token de acceso disponible',
        };
      }

      console.log(`📤 Subiendo archivo ${file.name} a carpeta ${folderId}...`);

      // Crear FormData para multipart upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', folderId);
      if (fileName) formData.append('fileName', fileName);
      if (fileType) formData.append('fileType', fileType || file.type);

      // Subir a file-upload-service endpoint /upload
      const { data } = await apiClient.post(`${this.fileUploadServiceUrl}/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!data.success || !data.file) {
        throw new Error('Respuesta inválida del servidor');
      }

      console.log('✅ Archivo subido exitosamente a carpeta');

      return {
        success: true,
        fileUrl: data.file.fileUrl,
        documentId: data.file.documentId,
      };
    } catch (error) {
      console.error('S3Service: Error uploading file to folder:', error);
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.message || (error instanceof Error ? error.message : 'Error subiendo archivo'),
      };
    }
  }
}

export const s3Service = new S3Service();
