import { File } from '../models/File';

export interface UploadFileInput {
  folderId: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateFileInput {
  fileId: string;
  originalName?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  hoktusDecision?: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING';
}

export interface FileResponse {
  success: boolean;
  message: string;
  file?: File;
  files?: File[];
}

export interface UploadResponse {
  success: boolean;
  message: string;
  file?: File;
  uploadUrl?: string;    // Presigned URL for upload
}

export interface FileQuery {
  fileId?: string;
  userId: string;
  folderId?: string;
  fileType?: string;
  isPublic?: boolean;
  tags?: string[];
  limit?: number;
  nextToken?: string;
}

export interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  folderId: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  downloadUrl: string;
  s3Key: string;
  expiresIn: number;
}

export interface BulkUploadInput {
  folderId: string;
  files: Array<{
    originalName: string;
    fileType: string;
    fileSize: number;
    description?: string;
    tags?: string[];
  }>;
}

export interface BulkUploadResponse {
  success: boolean;
  message: string;
  results: Array<{
    originalName: string;
    success: boolean;
    file?: File;
    uploadUrl?: string;
    error?: string;
  }>;
}

// S3 Configuration
export interface S3Config {
  bucket: string;
  region: string;
  maxFileSize: number;      // 50MB default
  allowedMimeTypes: string[];
  uploadExpiration: number; // 15 minutes default
}

// API Gateway event types with file upload support
export interface APIGatewayProxyEventWithAuth {
  headers: { [name: string]: string | undefined };
  pathParameters: { [name: string]: string | undefined } | null;
  queryStringParameters: { [name: string]: string | undefined } | null;
  body: string | null;
  isBase64Encoded: boolean;
  requestContext: {
    authorizer?: {
      claims: {
        sub: string;
        email: string;
        'custom:role': 'admin' | 'postulante';
        [key: string]: any;
      };
    };
  };
}

export interface MultipartFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}