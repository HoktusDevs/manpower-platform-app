import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignedUrlRequest, PresignedUrlResponse } from '../types';

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;
  private uploadExpiration: number;

  constructor() {
    this.bucket = process.env.S3_BUCKET!;
    this.region = process.env.S3_REGION!;
    this.uploadExpiration = parseInt(process.env.UPLOAD_EXPIRATION || '900');

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
      ContentLength: request.fileSize,
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

  async generatePresignedDownloadUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteFile(s3Key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    await this.s3Client.send(command);
  }

  private generateS3Key(request: PresignedUrlRequest): string {
    const timestamp = new Date().getTime();
    const sanitizedName = this.sanitizeFileName(request.fileName);
    return `files/${request.folderId}/${timestamp}-${sanitizedName}`;
  }

  private sanitizeFileName(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  isValidFileSize(fileSize: number): boolean {
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800');
    return fileSize <= maxSize;
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