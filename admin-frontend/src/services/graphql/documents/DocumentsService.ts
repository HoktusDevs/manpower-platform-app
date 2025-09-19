/**
 * Documents GraphQL Service
 * Handles all document-related GraphQL operations
 * 
 * IMPORTANT: This service maintains exact same interface as original graphqlService
 * to ensure zero breaking changes during refactoring
 */

import { cognitoAuthService } from '../../cognitoAuthService';
import type { Document, UploadDocumentInput } from './types';

// GraphQL Operations - Extracted from original graphqlService.ts
const GET_MY_DOCUMENTS = `
  query GetMyDocuments {
    getMyDocuments {
      userId
      documentId
      fileName
      documentType
      s3Key
      uploadedAt
      fileSize
      mimeType
    }
  }
`;

const UPLOAD_DOCUMENT = `
  mutation UploadDocument($input: UploadDocumentInput!) {
    uploadDocument(input: $input) {
      userId
      documentId
      fileName
      documentType
      s3Key
      uploadedAt
      fileSize
      mimeType
    }
  }
`;

export class DocumentsService {
  private executeQuery: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;
  private executeMutation: <T>(mutation: string, variables?: Record<string, unknown>) => Promise<T>;

  constructor(
    executeQuery: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
    executeMutation: <T>(mutation: string, variables?: Record<string, unknown>) => Promise<T>
  ) {
    this.executeQuery = executeQuery;
    this.executeMutation = executeMutation;
  }

  /**
   * POSTULANTE: Get my documents
   * Exact same implementation as original graphqlService
   */
  async getMyDocuments(): Promise<Document[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante') {
      throw new Error('Only postulantes can access their documents');
    }

    const result = await this.executeQuery<{ getMyDocuments: Document[] }>(GET_MY_DOCUMENTS);
    return result.getMyDocuments;
  }

  /**
   * POSTULANTE: Upload document
   * Exact same implementation as original graphqlService
   */
  async uploadDocument(input: UploadDocumentInput): Promise<Document> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante') {
      throw new Error('Only postulantes can upload documents');
    }

    const result = await this.executeMutation<{ uploadDocument: Document }>(
      UPLOAD_DOCUMENT,
      { input }
    );
    return result.uploadDocument;
  }
}