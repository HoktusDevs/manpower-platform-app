/**
 * Documents GraphQL Types
 * Types specific to document management
 */

export interface Document {
  userId: string;
  documentId: string;
  fileName: string;
  documentType: 'RESUME' | 'COVER_LETTER' | 'PORTFOLIO' | 'CERTIFICATE' | 'ID_DOCUMENT' | 'OTHER';
  s3Key: string;
  uploadedAt: string;
  fileSize?: number;
  mimeType?: string;
}

export interface UploadDocumentInput {
  fileName: string;
  documentType: Document['documentType'];
  s3Key: string;
  fileSize?: number;
  mimeType?: string;
}