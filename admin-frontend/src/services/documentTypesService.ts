/**
 * Document Types Service
 * Servicio para comunicarse con el document-types-service backend
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

export interface DocumentTypesResponse {
  success: boolean;
  message: string;
  documentType?: DocumentType;
  documentTypes?: DocumentType[];
}

export interface SearchDocumentTypesInput {
  query?: string;
  category?: string;
  limit?: number;
  sortBy?: 'name' | 'usageCount' | 'lastUsedAt';
  sortOrder?: 'asc' | 'desc';
}

class DocumentTypesService {
  private baseUrl: string;

  constructor() {
    // Use environment variable if available, otherwise use default
    this.baseUrl = import.meta.env.VITE_DOCUMENT_TYPES_SERVICE_URL || 
                   'https://lui82w9wvh.execute-api.us-east-1.amazonaws.com/dev';
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching document types:', error);
      return {
        success: false,
        message: 'Failed to fetch document types',
      };
    }
  }

  /**
   * Search document types by query
   */
  async searchDocumentTypes(searchInput: SearchDocumentTypesInput): Promise<DocumentTypesResponse> {
    try {
      const params = new URLSearchParams();
      if (searchInput.query) params.append('query', searchInput.query);
      if (searchInput.category) params.append('category', searchInput.category);
      if (searchInput.limit) params.append('limit', searchInput.limit.toString());
      if (searchInput.sortBy) params.append('sortBy', searchInput.sortBy);
      if (searchInput.sortOrder) params.append('sortOrder', searchInput.sortOrder);

      const response = await fetch(`${this.baseUrl}/document-types/search?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching document types:', error);
      return {
        success: false,
        message: 'Failed to search document types',
      };
    }
  }

  /**
   * Create document type
   */
  async createDocumentType(input: {
    name: string;
    description?: string;
    category?: string;
  }): Promise<DocumentTypesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/document-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating document type:', error);
      return {
        success: false,
        message: 'Failed to create document type',
      };
    }
  }

  /**
   * Update document type
   */
  async updateDocumentType(typeId: string, input: {
    name?: string;
    description?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<DocumentTypesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/document-types/${typeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating document type:', error);
      return {
        success: false,
        message: 'Failed to update document type',
      };
    }
  }

  /**
   * Delete document type
   */
  async deleteDocumentType(typeId: string): Promise<DocumentTypesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/document-types/${typeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting document type:', error);
      return {
        success: false,
        message: 'Failed to delete document type',
      };
    }
  }

  /**
   * Get document type by ID
   */
  async getDocumentType(typeId: string): Promise<DocumentTypesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/document-types/${typeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching document type:', error);
      return {
        success: false,
        message: 'Failed to fetch document type',
      };
    }
  }
}

export const documentTypesService = new DocumentTypesService();
