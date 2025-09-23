import { randomUUID } from 'crypto';
import { DynamoService } from './dynamoService';
import { DocumentTypeModel } from '../models/DocumentType';
import { 
  CreateDocumentTypeInput, 
  UpdateDocumentTypeInput, 
  DocumentTypeResponse,
  SearchDocumentTypesInput,
  CreateFromJobDocumentsInput
} from '../types';

export class DocumentTypeService {
  private dynamoService: DynamoService;

  constructor() {
    this.dynamoService = new DynamoService();
  }

  async createDocumentType(input: CreateDocumentTypeInput): Promise<DocumentTypeResponse> {
    try {
      // Check if document type already exists
      const existing = await this.dynamoService.findDocumentTypeByName(input.name);
      if (existing) {
        return {
          success: false,
          message: 'Document type with this name already exists',
        };
      }

      // Generate unique type ID
      const typeId = randomUUID();

      // Auto-generate category if not provided
      const category = input.category || DocumentTypeModel.generateCategory(input.name);

      // Create document type model
      const documentTypeModel = new DocumentTypeModel({
        typeId,
        name: input.name,
        description: input.description,
        category,
        createdBy: input.createdBy,
        isActive: true,
        usageCount: 0
      });

      // Validate document type data
      if (!documentTypeModel.isValid()) {
        return {
          success: false,
          message: 'Invalid document type data. Please check required fields.',
        };
      }

      // Create the document type in database
      const createdDocumentType = await this.dynamoService.createDocumentType(documentTypeModel);

      return {
        success: true,
        message: 'Document type created successfully',
        documentType: createdDocumentType,
      };
    } catch (error) {
      console.error('Error in createDocumentType:', error);
      return {
        success: false,
        message: 'Internal server error while creating document type',
      };
    }
  }

  async getDocumentType(typeId: string): Promise<DocumentTypeResponse> {
    try {
      const documentType = await this.dynamoService.getDocumentType(typeId);
      
      if (!documentType) {
        return {
          success: false,
          message: 'Document type not found',
        };
      }

      return {
        success: true,
        message: 'Document type retrieved successfully',
        documentType,
      };
    } catch (error) {
      console.error('Error in getDocumentType:', error);
      return {
        success: false,
        message: 'Internal server error while retrieving document type',
      };
    }
  }

  async getAllDocumentTypes(): Promise<DocumentTypeResponse> {
    try {
      const documentTypes = await this.dynamoService.getAllDocumentTypes();
      
      return {
        success: true,
        message: 'Document types retrieved successfully',
        documentTypes,
      };
    } catch (error) {
      console.error('Error in getAllDocumentTypes:', error);
      return {
        success: false,
        message: 'Internal server error while retrieving document types',
      };
    }
  }

  async searchDocumentTypes(searchInput: SearchDocumentTypesInput): Promise<DocumentTypeResponse> {
    try {
      const documentTypes = await this.dynamoService.searchDocumentTypes(searchInput);
      
      return {
        success: true,
        message: 'Document types search completed successfully',
        documentTypes,
      };
    } catch (error) {
      console.error('Error in searchDocumentTypes:', error);
      return {
        success: false,
        message: 'Internal server error while searching document types',
      };
    }
  }

  async updateDocumentType(input: UpdateDocumentTypeInput): Promise<DocumentTypeResponse> {
    try {
      const { typeId, ...updates } = input;
      
      const updatedDocumentType = await this.dynamoService.updateDocumentType(typeId, updates);
      
      if (!updatedDocumentType) {
        return {
          success: false,
          message: 'Document type not found or no changes made',
        };
      }

      return {
        success: true,
        message: 'Document type updated successfully',
        documentType: updatedDocumentType,
      };
    } catch (error) {
      console.error('Error in updateDocumentType:', error);
      return {
        success: false,
        message: 'Internal server error while updating document type',
      };
    }
  }

  async deleteDocumentType(typeId: string): Promise<DocumentTypeResponse> {
    try {
      // Check if document type exists
      const existing = await this.dynamoService.getDocumentType(typeId);
      if (!existing) {
        return {
          success: false,
          message: 'Document type not found',
        };
      }

      await this.dynamoService.deleteDocumentType(typeId);

      return {
        success: true,
        message: 'Document type deleted successfully',
      };
    } catch (error) {
      console.error('Error in deleteDocumentType:', error);
      return {
        success: false,
        message: 'Internal server error while deleting document type',
      };
    }
  }

  async createFromJobDocuments(input: CreateFromJobDocumentsInput): Promise<DocumentTypeResponse> {
    try {
      const createdTypes: any[] = [];
      const errors: string[] = [];

      for (const documentName of input.documents) {
        try {
          // Check if document type already exists
          const existing = await this.dynamoService.findDocumentTypeByName(documentName);
          if (existing) {
            // Increment usage count for existing type
            await this.dynamoService.incrementUsageCount(existing.typeId);
            createdTypes.push({ ...existing, wasExisting: true });
            continue;
          }

          // Create new document type
          const typeId = randomUUID();
          const category = DocumentTypeModel.generateCategory(documentName);

          const documentTypeModel = new DocumentTypeModel({
            typeId,
            name: documentName,
            category,
            createdBy: input.createdBy,
            isActive: true,
            usageCount: 1,
            lastUsedAt: new Date().toISOString()
          });

          const createdType = await this.dynamoService.createDocumentType(documentTypeModel);
          createdTypes.push({ ...createdType, wasExisting: false });
        } catch (error) {
          console.error(`Error creating document type for "${documentName}":`, error);
          errors.push(`Failed to create document type for "${documentName}"`);
        }
      }

      return {
        success: true,
        message: `Processed ${input.documents.length} documents. Created ${createdTypes.filter(t => !t.wasExisting).length} new types, updated ${createdTypes.filter(t => t.wasExisting).length} existing types.`,
        documentTypes: createdTypes,
      };
    } catch (error) {
      console.error('Error in createFromJobDocuments:', error);
      return {
        success: false,
        message: 'Internal server error while processing job documents',
      };
    }
  }

  async incrementUsageCount(typeId: string): Promise<DocumentTypeResponse> {
    try {
      const updatedDocumentType = await this.dynamoService.incrementUsageCount(typeId);
      
      if (!updatedDocumentType) {
        return {
          success: false,
          message: 'Document type not found',
        };
      }

      return {
        success: true,
        message: 'Usage count incremented successfully',
        documentType: updatedDocumentType,
      };
    } catch (error) {
      console.error('Error in incrementUsageCount:', error);
      return {
        success: false,
        message: 'Internal server error while incrementing usage count',
      };
    }
  }

  async checkExistingDocumentTypes(documentNames: string[]): Promise<{
    existing: string[];
    new: string[];
  }> {
    try {
      const existing: string[] = [];
      const newDocuments: string[] = [];

      for (const documentName of documentNames) {
        const existingType = await this.dynamoService.findDocumentTypeByName(documentName);
        if (existingType) {
          existing.push(documentName);
        } else {
          newDocuments.push(documentName);
        }
      }

      return { existing, new: newDocuments };
    } catch (error) {
      console.error('Error in checkExistingDocumentTypes:', error);
      return {
        existing: [],
        new: documentNames
      };
    }
  }
}
