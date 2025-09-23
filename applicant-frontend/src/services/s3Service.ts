import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { cognitoAuthService } from './cognitoAuthService';

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
  private bucketName: string;
  private region: string;
  private s3Client: S3Client;

  constructor() {
    this.region = 'us-east-1';
    this.bucketName = 'manpower-files-dev';
    
    // Initialize S3 client with Cognito credentials
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: 'dummy', // Will be replaced by Cognito credentials
        secretAccessKey: 'dummy'
      }
    });
  }

  /**
   * Obtener presigned URL para subir archivo
   */
  async getPresignedUploadUrl(
    fileName: string,
    fileType: string,
    userId: string,
    documentType: string
  ): Promise<PresignedUrlResponse> {
    try {
      // Verificar autenticación
      const accessToken = cognitoAuthService.getAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: 'No hay token de acceso disponible',
        };
      }

      // Generar key único para el archivo
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const extension = fileName.split('.').pop();
      const key = `documents/${userId}/${documentType}/${timestamp}_${randomString}.${extension}`;
      
      const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

      // Crear comando para presigned URL
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: fileType,
        Metadata: {
          userId: userId,
          documentType: documentType,
          originalName: fileName
        }
      });

      // Generar presigned URL (válida por 1 hora)
      const presignedUrl = await getSignedUrl(this.s3Client, command, { 
        expiresIn: 3600 
      });

      return {
        success: true,
        presignedUrl,
        fileUrl,
      };
    } catch (error) {
      console.error('S3Service: Error getting presigned URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error generando URL de subida',
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
      // Extraer key del archivo desde la URL
      const key = fileUrl.replace(`https://${this.bucketName}.s3.${this.region}.amazonaws.com/`, '');
      
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      // Generar presigned URL para descarga (válida por 1 hora)
      const presignedUrl = await getSignedUrl(this.s3Client, command, { 
        expiresIn: 3600 
      });

      return {
        success: true,
        presignedUrl,
        fileUrl,
      };
    } catch (error) {
      console.error('S3Service: Error getting download URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error generando URL de descarga',
      };
    }
  }

  /**
   * Eliminar archivo de S3
   */
  async deleteFile(fileUrl: string): Promise<S3UploadResult> {
    try {
      // Extraer key del archivo desde la URL
      const key = fileUrl.replace(`https://${this.bucketName}.s3.${this.region}.amazonaws.com/`, '');
      
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      
      console.log('✅ Archivo eliminado de S3:', key);
      
      return {
        success: true,
      };
    } catch (error) {
      console.error('S3Service: Error deleting file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error eliminando archivo',
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
}

export const s3Service = new S3Service();
