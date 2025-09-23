/**
 * Client for Document Types Service
 * Handles communication with the document-types-service
 */

export interface DocumentType {
  typeId: string;
  name: string;
  description?: string;
  category?: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastUsedAt?: string;
}

export interface CreateFromJobDocumentsInput {
  documents: string[];
  createdBy: string;
}

export interface DocumentTypesResponse {
  success: boolean;
  message: string;
  documentTypes?: DocumentType[];
}

export class DocumentTypesServiceClient {
  private baseUrl: string;

  constructor() {
    // Use environment variable if available, otherwise construct URL
    if (process.env.DOCUMENT_TYPES_SERVICE_URL) {
      this.baseUrl = process.env.DOCUMENT_TYPES_SERVICE_URL;
    } else {
      const stage = process.env.STAGE || 'dev';
      if (stage === 'local') {
        this.baseUrl = 'http://localhost:3003';
      } else {
        // Use the actual deployed URL
        this.baseUrl = 'https://lui82w9wvh.execute-api.us-east-1.amazonaws.com/dev';
      }
    }
  }

  /**
   * Create document types from job documents
   * This will automatically create new document types or increment usage count for existing ones
   */
  async createFromJobDocuments(documents: string[], createdBy: string): Promise<DocumentTypesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/document-types/from-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents,
          createdBy
        }),
      });

      if (!response.ok) {
        console.error('Document Types Service error:', response.status, response.statusText);
        return {
          success: false,
          message: 'Failed to communicate with document types service',
        };
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error calling document types service:', error);
      return {
        success: false,
        message: 'Failed to communicate with document types service',
      };
    }
  }

  /**
   * Search for document types by query
   */
  async searchDocumentTypes(query: string, limit: number = 10): Promise<DocumentTypesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/document-types/search?query=${encodeURIComponent(query)}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Document Types Service error:', response.status, response.statusText);
        return {
          success: false,
          message: 'Failed to communicate with document types service',
        };
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error calling document types service:', error);
      return {
        success: false,
        message: 'Failed to communicate with document types service',
      };
    }
  }

  /**
   * Get all document types
   */
  async getAllDocumentTypes(): Promise<DocumentTypesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/document-types`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Document Types Service error:', response.status, response.statusText);
        return {
          success: false,
          message: 'Failed to communicate with document types service',
        };
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error calling document types service:', error);
      return {
        success: false,
        message: 'Failed to communicate with document types service',
      };
    }
  }

  /**
   * Check which document types already exist
   */
  async checkExistingDocumentTypes(documentNames: string[]): Promise<{
    existing: string[];
    new: string[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/document-types/check-existing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentNames }),
      });

      if (!response.ok) {
        console.error('Document Types Service error:', response.status, response.statusText);
        return {
          existing: [],
          new: documentNames
        };
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error checking existing document types:', error);
      return {
        existing: [],
        new: documentNames
      };
    }
  }
}
