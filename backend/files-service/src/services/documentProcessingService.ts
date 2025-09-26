/**
 * Service for integrating with document processing microservice
 */

import axios from 'axios';

const DOCUMENT_PROCESSING_BASE_URL = process.env.DOCUMENT_PROCESSING_URL || 'https://b3wt34nt9h.execute-api.us-east-1.amazonaws.com/dev';

export interface FileProcessingRequest {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  folderId: string;
  userId: string;
}

export interface FileProcessingResult {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'error';
  fileType?: string;
  contentAnalysis?: any;
  validationResults?: any;
  observations?: any[];
  processedAt?: string;
  processingTime?: number;
  error?: string;
}

export class DocumentProcessingService {
  /**
   * Send file to document processing microservice
   */
  static async processFile(request: FileProcessingRequest): Promise<FileProcessingResult> {
    try {
      console.log(`Sending file ${request.fileId} to document processing microservice`);
      
      const response = await axios.post(
        `${DOCUMENT_PROCESSING_BASE_URL}/api/v1/folders/process-file`,
        {
          fileId: request.fileId,
          fileName: request.fileName,
          fileUrl: request.fileUrl,
          fileSize: request.fileSize,
          folderId: request.folderId,
          userId: request.userId
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      console.log(`File ${request.fileId} processing response:`, response.data);
      
      return {
        status: response.data.status || 'completed',
        fileType: response.data.result?.fileType,
        contentAnalysis: response.data.result?.contentAnalysis,
        validationResults: response.data.result?.validationResults,
        observations: response.data.result?.observations,
        processedAt: response.data.result?.processedAt,
        processingTime: response.data.result?.processingTime
      };
      
    } catch (error: any) {
      console.error(`Error processing file ${request.fileId}:`, error);
      
      return {
        status: 'error',
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get file processing status
   */
  static async getFileStatus(fileId: string): Promise<FileProcessingResult> {
    try {
      console.log(`Getting status for file ${fileId}`);
      
      const response = await axios.get(
        `${DOCUMENT_PROCESSING_BASE_URL}/api/v1/folders/file-status/${fileId}`,
        {
          timeout: 10000 // 10 seconds timeout
        }
      );

      console.log(`File ${fileId} status response:`, response.data);
      
      return {
        status: response.data.status || 'unknown',
        fileType: response.data.processingResult?.fileType,
        contentAnalysis: response.data.processingResult?.contentAnalysis,
        validationResults: response.data.processingResult?.validationResults,
        observations: response.data.processingResult?.observations,
        processedAt: response.data.updatedAt,
        processingTime: response.data.processingResult?.processingTime,
        error: response.data.error
      };
      
    } catch (error: any) {
      console.error(`Error getting status for file ${fileId}:`, error);
      
      return {
        status: 'error',
        error: error.message || 'Unknown error occurred'
      };
    }
  }
}
