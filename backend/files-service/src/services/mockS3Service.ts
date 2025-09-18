import { PresignedUrlRequest, PresignedUrlResponse } from '../types';
import { getMockUser } from '../../shared/mockAuth';

export class MockS3Service {
  private bucket: string;
  private uploadExpiration: number;
  private uploadedFiles: Set<string> = new Set();

  constructor() {
    this.bucket = 'mock-files-bucket';
    this.uploadExpiration = 900; // 15 minutes
    console.log('MockS3Service: Using mock S3 service for local development');
  }

  async generatePresignedUploadUrl(request: PresignedUrlRequest): Promise<PresignedUrlResponse> {
    console.log('MockS3Service: generatePresignedUploadUrl called');
    const s3Key = this.generateS3Key(request);

    // Generate mock URLs
    const uploadUrl = `http://localhost:3006/mock-upload/${s3Key}?expires=${Date.now() + (this.uploadExpiration * 1000)}`;
    const downloadUrl = `http://localhost:3006/mock-download/${s3Key}?expires=${Date.now() + (this.uploadExpiration * 1000)}`;

    return {
      uploadUrl,
      downloadUrl,
      s3Key,
      expiresIn: this.uploadExpiration,
    };
  }

  async generatePresignedDownloadUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    console.log('MockS3Service: generatePresignedDownloadUrl called');
    return `http://localhost:3006/mock-download/${s3Key}?expires=${Date.now() + (expiresIn * 1000)}`;
  }

  async deleteFile(s3Key: string): Promise<boolean> {
    console.log('MockS3Service: deleteFile called for key:', s3Key);
    this.uploadedFiles.delete(s3Key);
    return true;
  }

  async deleteFiles(s3Keys: string[]): Promise<string[]> {
    console.log('MockS3Service: deleteFiles called for keys:', s3Keys);
    const deletedKeys: string[] = [];
    for (const key of s3Keys) {
      if (await this.deleteFile(key)) {
        deletedKeys.push(key);
      }
    }
    return deletedKeys;
  }

  async checkFileExists(s3Key: string): Promise<boolean> {
    console.log('MockS3Service: checkFileExists called for key:', s3Key);
    return this.uploadedFiles.has(s3Key);
  }

  async getFileMetadata(s3Key: string): Promise<{ size: number; contentType: string } | null> {
    console.log('MockS3Service: getFileMetadata called for key:', s3Key);
    if (!this.uploadedFiles.has(s3Key)) {
      return null;
    }

    // Return mock metadata
    return {
      size: 1024 * 1024, // 1MB mock size
      contentType: 'application/pdf' // Mock content type
    };
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<boolean> {
    console.log('MockS3Service: copyFile called from', sourceKey, 'to', destinationKey);
    if (this.uploadedFiles.has(sourceKey)) {
      this.uploadedFiles.add(destinationKey);
      return true;
    }
    return false;
  }

  // Mock file upload for testing
  async mockUploadFile(s3Key: string): Promise<void> {
    console.log('MockS3Service: mockUploadFile - marking file as uploaded:', s3Key);
    this.uploadedFiles.add(s3Key);
  }

  private generateS3Key(request: PresignedUrlRequest): string {
    const timestamp = new Date().getTime();
    const sanitizedName = this.sanitizeFileName(request.fileName);
    const { userId } = getMockUser('admin'); // Use shared mock credentials
    return `files/${userId}/${request.folderId}/${timestamp}-${sanitizedName}`;
  }

  private sanitizeFileName(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  getBucket(): string {
    return this.bucket;
  }

  isValidFileSize(fileSize: number): boolean {
    const maxSize = 52428800; // 50MB for mock
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