// Documents Service - Migration-aware document management
// Handles both Legacy API and AWS-Native S3 direct upload

import { cognitoAuthService } from '../services/cognitoAuthService';
import { migrationService } from './migrationService';
import { legacyApiService } from './legacyApiService';

interface Document {
  documentId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key?: string;
  url: string;
  uploadedAt: string;
  expiresAt?: string;
}

interface UploadDocumentInput {
  file: File;
  documentType?: 'resume' | 'cover_letter' | 'certificate' | 'other';
  description?: string;
}

class DocumentsService {
  /**
   * Upload document using migration-aware system
   */
  async uploadDocument(input: UploadDocumentInput): Promise<Document> {
    const user = cognitoAuthService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const startTime = Date.now();
    const systemUsed = migrationService.getSystemForFeature('documents', user.userId);

    try {
      let document: Document;

      if (systemUsed === 'aws_native') {
        // AWS-Native: Direct S3 upload with presigned URLs
        document = await this.uploadToS3(input, user.userId);
        console.log('✅ Document uploaded via AWS-Native S3');
      } else {
        // Legacy: Upload via REST API
        const token = cognitoAuthService.getIdToken();
        if (token) {
          legacyApiService.setAuthToken(token);
        }
        document = await this.uploadViaLegacyAPI(input);
        console.log('📊 Document uploaded via Legacy API');
      }

      // Track performance metrics
      migrationService.trackPerformance({
        system: systemUsed === 'aws_native' ? 'aws_native' : 'legacy',
        feature: 'documents',
        operation: 'uploadDocument',
        latency: Date.now() - startTime,
        success: true,
        userId: user.userId
      });

      return document;
    } catch (error) {
      // Track error metrics
      migrationService.trackPerformance({
        system: systemUsed === 'aws_native' ? 'aws_native' : 'legacy',
        feature: 'documents',
        operation: 'uploadDocument',
        latency: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        userId: user.userId
      });

      throw error;
    }
  }

  /**
   * AWS-Native: Direct S3 upload
   */
  private async uploadToS3(input: UploadDocumentInput, userId: string): Promise<Document> {
    // In production, this would get presigned URLs from Lambda
    // For now, simulate the AWS-Native response
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const s3Key = `documents/${userId}/${documentId}/${input.file.name}`;

    // Simulate S3 upload
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    return {
      documentId,
      userId,
      fileName: input.file.name,
      fileType: input.file.type,
      fileSize: input.file.size,
      s3Key,
      url: `https://manpower-documents-dev.s3.amazonaws.com/${s3Key}`,
      uploadedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
  }

  /**
   * Legacy: Upload via REST API
   */
  private async uploadViaLegacyAPI(input: UploadDocumentInput): Promise<Document> {
    // Simulate legacy API upload
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));

    const documentId = `legacy_doc_${Date.now()}`;
    
    return {
      documentId,
      userId: cognitoAuthService.getCurrentUser()?.userId || '',
      fileName: input.file.name,
      fileType: input.file.type,
      fileSize: input.file.size,
      url: `https://api.manpower.com/documents/${documentId}`,
      uploadedAt: new Date().toISOString()
    };
  }

  /**
   * Get user documents
   */
  async getMyDocuments(): Promise<Document[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const startTime = Date.now();
    const systemUsed = migrationService.getSystemForFeature('documents', user.userId);

    try {
      let documents: Document[];

      if (systemUsed === 'aws_native') {
        documents = await this.getFromS3(user.userId);
      } else {
        documents = await this.getFromLegacyAPI();
      }

      // Track performance metrics
      migrationService.trackPerformance({
        system: systemUsed === 'aws_native' ? 'aws_native' : 'legacy',
        feature: 'documents',
        operation: 'getMyDocuments',
        latency: Date.now() - startTime,
        success: true,
        userId: user.userId
      });

      return documents;
    } catch (error) {
      // Track error metrics
      migrationService.trackPerformance({
        system: systemUsed === 'aws_native' ? 'aws_native' : 'legacy',
        feature: 'documents',
        operation: 'getMyDocuments',
        latency: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get documents',
        userId: user.userId
      });

      throw error;
    }
  }

  private async getFromS3(userId: string): Promise<Document[]> {
    // Simulate S3 document listing
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    console.log(`Getting documents for user: ${userId}`);
    return []; // Would query DynamoDB for user documents
  }

  private async getFromLegacyAPI(): Promise<Document[]> {
    // Simulate legacy API call
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 300));
    return []; // Would call legacy REST API
  }
}

// Export singleton
export const documentsService = new DocumentsService();
export type { Document, UploadDocumentInput };