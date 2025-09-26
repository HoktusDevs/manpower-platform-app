export interface File {
  documentId: string;        // Primary key (was fileId)
  userId: string;            // Partition key
  documentType: string;      // Required for DynamoDB
  folderId: string;
  originalName: string;
  fileName: string;          // Sanitized filename for S3
  fileType: string;          // MIME type
  fileExtension: string;     // .pdf, .jpg, etc.
  fileSize: number;          // bytes
  s3Key: string;             // S3 object key
  s3Bucket: string;          // S3 bucket name
  downloadUrl?: string;      // Presigned URL (temporary)
  isPublic: boolean;         // Public access or private
  description?: string;      // Optional file description
  tags?: string[];           // Optional tags for categorization
  uploadedAt: string;
  updatedAt: string;
  isActive: boolean;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'error';
  hoktusDecision?: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING';
}

export class FileModel {
  public documentId: string;    // Primary key
  public userId: string;        // Partition key
  public documentType: string;  // Required for DynamoDB
  public folderId: string;
  public originalName: string;
  public fileName: string;
  public fileType: string;
  public fileExtension: string;
  public fileSize: number;
  public s3Key: string;
  public s3Bucket: string;
  public downloadUrl?: string;
  public isPublic: boolean;
  public description?: string;
  public tags: string[];
  public uploadedAt: string;
  public updatedAt: string;
  public isActive: boolean;
  public status: 'pending' | 'processing' | 'completed' | 'failed' | 'error';
  public hoktusDecision?: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING';

  constructor(data: Partial<File>) {
    this.documentId = data.documentId || '';
    this.userId = data.userId || '';
    this.documentType = data.documentType || 'file';
    this.folderId = data.folderId || '';
    this.originalName = data.originalName || '';
    this.fileName = data.fileName || '';
    this.fileType = data.fileType || '';
    this.fileExtension = data.fileExtension || '';
    this.fileSize = data.fileSize || 0;
    this.s3Key = data.s3Key || '';
    this.s3Bucket = data.s3Bucket || '';
    this.downloadUrl = data.downloadUrl;
    this.isPublic = data.isPublic !== undefined ? data.isPublic : false;
    this.description = data.description;
    this.tags = data.tags || [];
    this.uploadedAt = data.uploadedAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.status = data.status || 'pending'; // Default status is pending
    this.hoktusDecision = data.hoktusDecision;
  }

  // Generate S3 key for file storage
  public generateS3Key(): string {
    const timestamp = new Date().getTime();
    const sanitizedName = this.sanitizeFileName(this.originalName);
    return `files/${this.userId}/${this.folderId}/${timestamp}-${sanitizedName}`;
  }

  // Sanitize filename for safe storage
  private sanitizeFileName(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  // Get file extension from filename
  public static getFileExtension(filename: string): string {
    const ext = filename.split('.').pop();
    return ext ? `.${ext.toLowerCase()}` : '';
  }

  // Check if file type is allowed
  public static isAllowedFileType(mimeType: string): boolean {
    const allowedTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',

      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',

      // Archives
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed'
    ];

    return allowedTypes.includes(mimeType);
  }

  // Format file size for display
  public getFormattedSize(): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.fileSize;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  // Check if file is an image
  public isImage(): boolean {
    return this.fileType.startsWith('image/');
  }

  // Check if file is a document
  public isDocument(): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];
    return documentTypes.includes(this.fileType);
  }

  public toJSON(): File {
    return {
      documentId: this.documentId,
      userId: this.userId,
      documentType: this.documentType,
      folderId: this.folderId,
      originalName: this.originalName,
      fileName: this.fileName,
      fileType: this.fileType,
      fileExtension: this.fileExtension,
      fileSize: this.fileSize,
      s3Key: this.s3Key,
      s3Bucket: this.s3Bucket,
      downloadUrl: this.downloadUrl,
      isPublic: this.isPublic,
      description: this.description,
      tags: this.tags,
      uploadedAt: this.uploadedAt,
      updatedAt: this.updatedAt,
      isActive: this.isActive,
      status: this.status,
      hoktusDecision: this.hoktusDecision
    };
  }

  public updateTimestamp(): void {
    this.updatedAt = new Date().toISOString();
  }
}