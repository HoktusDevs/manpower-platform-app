import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  documentId: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  downloadUrl: string;
  s3Key: string;
  expiresIn: number;
}

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;
  private uploadExpiration: number;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'manpower-documents-dev';
    this.region = process.env.S3_REGION || 'us-east-1';
    this.uploadExpiration = parseInt(process.env.UPLOAD_EXPIRATION || '3600');

    this.s3Client = new S3Client({
      region: this.region,
    });
  }

  async generatePresignedUploadUrl(request: PresignedUrlRequest): Promise<PresignedUrlResponse> {
    const s3Key = this.generateS3Key(request);

    const putCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: request.fileType,
      ContentDisposition: 'inline',
      CacheControl: 'max-age=31536000',
      Metadata: {
        uploadedAt: new Date().toISOString(),
        service: 'file-upload-service',
        documentId: request.documentId
      }
    });

    const uploadUrl = await getSignedUrl(this.s3Client, putCommand, {
      expiresIn: this.uploadExpiration,
    });

    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, getCommand, {
      expiresIn: this.uploadExpiration,
    });

    return {
      uploadUrl,
      downloadUrl,
      s3Key,
      expiresIn: this.uploadExpiration,
    };
  }

  private generateS3Key(request: PresignedUrlRequest): string {
    const timestamp = new Date().getTime();
    const sanitizedName = this.sanitizeFileName(request.fileName);
    return `uploads/${timestamp}_${sanitizedName}`;
  }

  private sanitizeFileName(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_');
  }

  isValidFileSize(fileSize: number): boolean {
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB
    return fileSize <= maxSize && fileSize > 0;
  }

  isValidFileType(mimeType: string): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed'
    ];

    return allowedTypes.includes(mimeType);
  }
}