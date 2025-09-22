import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from './dynamoService';
import { HoktusOrchestratorService } from './hoktusOrchestratorService';
import { OCRDocumentModel } from '../models/OCRDocument';
import { ProcessDocumentsRequest, ProcessDocumentsResponse, HoktusCallbackRequest, APIResponse } from '../types';

export class OCRService {
  private dynamoService: DynamoService;
  public hoktusService: HoktusOrchestratorService;

  constructor() {
    this.dynamoService = new DynamoService();
    this.hoktusService = new HoktusOrchestratorService();
  }

  async processDocuments(
    ownerUserName: string,
    documents: Array<{
      file_name: string;
      file_url: string;
      platform_document_id: string;
    }>
  ): Promise<APIResponse<ProcessDocumentsResponse>> {
    try {
      // Generate unique request ID
      const requestId = uuidv4();
      
      // Save documents to database
      const savedDocuments: OCRDocumentModel[] = [];
      
      for (const doc of documents) {
        const document = new OCRDocumentModel({
          id: doc.platform_document_id, // Use platform_document_id as id
          fileName: doc.file_name,
          fileUrl: doc.file_url,
          platformDocumentId: doc.platform_document_id,
          ownerUserName,
          status: 'pending'
        });
        
        await this.dynamoService.saveDocument(document);
        savedDocuments.push(document);
      }

      // Download files from S3 and upload to Hoktus
      const hoktusDocuments = [];
      
      for (const doc of documents) {
        try {
          console.log('Processing document:', doc);
          console.log('doc.file_name:', doc.file_name);
          console.log('doc.file_url:', doc.file_url);
          console.log('doc.platform_document_id:', doc.platform_document_id);
          
          // Use the original S3 URL directly - Hoktus can access S3 URLs
          const hoktusDoc = {
            file_name: doc.file_name,
            file_url: doc.file_url,
            platform_document_id: doc.platform_document_id
          };
          
          console.log('Adding document to Hoktus:', hoktusDoc);
          hoktusDocuments.push(hoktusDoc);
        } catch (error: any) {
          console.error(`Error processing file ${doc.file_name}:`, error);
          // Update document status to failed
          const document = savedDocuments.find(d => d.platformDocumentId === doc.platform_document_id);
          if (document) {
            document.updateStatus('failed', `File processing error: ${error.message}`);
            await this.dynamoService.saveDocument(document);
          }
        }
      }

      if (hoktusDocuments.length === 0) {
        return {
          success: false,
          error: 'No files could be processed'
        };
      }

      // Prepare request for Hoktus Orchestrator
      const hoktusRequest: ProcessDocumentsRequest = {
        owner_user_name: ownerUserName,
        url_response: this.hoktusService.buildCallbackUrl(),
        documents: hoktusDocuments
      };

      // Send request to Hoktus Orchestrator
      const hoktusResponse = await this.hoktusService.processDocuments(hoktusRequest);
      
      // Update documents with Hoktus request ID
      for (const document of savedDocuments) {
        if (document.status !== 'failed') {
          document.setHoktusRequestId(hoktusResponse.requestId);
          await this.dynamoService.saveDocument(document);
        }
      }

      return {
        success: true,
        data: {
          success: true,
          requestId: hoktusResponse.requestId,
          documents: savedDocuments.map(doc => ({
            id: doc.id,
            platform_document_id: doc.platformDocumentId,
            status: doc.status
          })),
          message: 'Documents sent for OCR processing'
        }
      };

    } catch (error: any) {
      console.error('Error processing documents:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to process documents'
      };
    }
  }

  async handleCallback(callbackData: HoktusCallbackRequest): Promise<APIResponse> {
    try {
      console.log('Received callback from Hoktus Orchestrator:', callbackData);

      // Update each document with the results
      for (const docResult of callbackData.documents) {
        const document = await this.dynamoService.getDocument(docResult.platform_document_id);
        
        if (!document) {
          console.warn(`Document not found: ${docResult.platform_document_id}`);
          continue;
        }

        if (docResult.status === 'completed' && docResult.result) {
          document.setOCRResult(docResult.result);
          await this.dynamoService.saveDocument(document);
        } else if (docResult.status === 'failed') {
          document.updateStatus('failed', docResult.error);
          await this.dynamoService.saveDocument(document);
        }
      }

      return {
        success: true,
        message: 'Callback processed successfully'
      };

    } catch (error: any) {
      console.error('Error handling callback:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to process callback'
      };
    }
  }

  async getDocumentStatus(documentId: string): Promise<APIResponse<OCRDocumentModel>> {
    try {
      const document = await this.dynamoService.getDocument(documentId);
      
      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }

      return {
        success: true,
        data: document
      };

    } catch (error: any) {
      console.error('Error getting document status:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to get document status'
      };
    }
  }

  async getDocumentsByStatus(status: string): Promise<APIResponse<OCRDocumentModel[]>> {
    try {
      const documents = await this.dynamoService.getDocumentsByStatus(status);
      
      return {
        success: true,
        data: documents
      };

    } catch (error: any) {
      console.error('Error getting documents by status:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to get documents by status'
      };
    }
  }


  private generatePublicFileUrl(platformDocumentId: string): string {
    const baseUrl = process.env.CALLBACK_BASE_URL || 'https://xtspcl5cj6.execute-api.us-east-1.amazonaws.com/dev';
    return `${baseUrl}/api/ocr/public-file/${platformDocumentId}`;
  }

  async getDocumentByPlatformId(platformDocumentId: string): Promise<APIResponse<OCRDocumentModel>> {
    try {
      const document = await this.dynamoService.getDocumentByPlatformId(platformDocumentId);
      
      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }

      return {
        success: true,
        data: document
      };

    } catch (error: any) {
      console.error('Error getting document by platform ID:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to get document'
      };
    }
  }
}
