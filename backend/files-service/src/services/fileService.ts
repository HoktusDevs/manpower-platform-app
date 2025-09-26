import { v4 as uuidv4 } from 'uuid';
import { File, FileModel } from '../models/File';
import { DynamoService } from './dynamoService';
import { S3Service } from './s3Service';
import { MockDynamoService } from './mockDynamoService';
import { MockS3Service } from './mockS3Service';
import {
  UploadFileInput,
  UpdateFileInput,
  FileResponse,
  UploadResponse,
  BulkUploadInput,
  BulkUploadResponse,
  PresignedUrlRequest,
  FileQuery
} from '../types';

export class FileService {
  private dynamoService: DynamoService | MockDynamoService;
  private s3Service: S3Service | MockS3Service;

  constructor() {
    // Forzar uso de datos reales en desarrollo
    const isLocal = false; // process.env.STAGE === 'local';

    if (isLocal) {
      console.log('FileService: Using mock services for local development');
      this.dynamoService = new MockDynamoService();
      this.s3Service = new MockS3Service();
    } else {
      console.log('FileService: Using real AWS services');
      this.dynamoService = new DynamoService();
      this.s3Service = new S3Service();
    }
  }

  async getAllFiles(userId: string, limit?: number, nextToken?: string): Promise<FileResponse> {
    try {
      const result = await this.dynamoService.getFilesByUser(userId, limit, nextToken);

      return {
        success: true,
        message: 'Files retrieved successfully',
        files: result.files,
      };
    } catch (error) {
      console.error('Error getting files:', error);
      return {
        success: false,
        message: 'Failed to retrieve files',
      };
    }
  }

  async getFile(fileId: string, userId: string): Promise<FileResponse> {
    try {
      const file = await this.dynamoService.getFile(fileId, userId);

      if (!file) {
        return {
          success: false,
          message: 'File not found',
        };
      }

      return {
        success: true,
        message: 'File retrieved successfully',
        file,
      };
    } catch (error) {
      console.error('Error getting file:', error);
      return {
        success: false,
        message: 'Failed to retrieve file',
      };
    }
  }

  async getFilesByFolder(folderId: string, userId: string, limit?: number): Promise<FileResponse> {
    try {
      const files = await this.dynamoService.getFilesByFolder(folderId, userId, limit);

      return {
        success: true,
        message: 'Files retrieved successfully',
        files,
      };
    } catch (error) {
      console.error('Error getting files by folder:', error);
      return {
        success: false,
        message: 'Failed to retrieve files',
      };
    }
  }

  async getUploadUrl(input: UploadFileInput, userId: string): Promise<UploadResponse> {
    try {
      if (!this.s3Service.isValidFileSize(input.fileSize)) {
        return {
          success: false,
          message: 'File size exceeds maximum allowed size',
        };
      }

      if (!this.s3Service.isValidFileType(input.fileType)) {
        return {
          success: false,
          message: 'File type not allowed',
        };
      }

      const documentId = uuidv4();
      const fileModel = new FileModel({
        documentId,
        userId,
        documentType: 'file',
        folderId: input.folderId,
        originalName: input.originalName,
        fileName: input.originalName,
        fileType: input.fileType,
        fileExtension: FileModel.getFileExtension(input.originalName),
        fileSize: input.fileSize,
        s3Bucket: process.env.S3_BUCKET!,
        isPublic: input.isPublic || false,
        description: input.description,
        tags: input.tags || [],
      });

      const s3Key = fileModel.generateS3Key();
      fileModel.s3Key = s3Key;

      const presignedRequest: PresignedUrlRequest = {
        fileName: input.originalName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        folderId: input.folderId,
      };

      const presignedResponse = await this.s3Service.generatePresignedUploadUrl(presignedRequest);

      fileModel.s3Key = presignedResponse.s3Key;

      const file = await this.dynamoService.createFile(fileModel);

      return {
        success: true,
        message: 'Upload URL generated successfully',
        file,
        uploadUrl: presignedResponse.uploadUrl,
      };
    } catch (error) {
      console.error('Error generating upload URL:', error);
      return {
        success: false,
        message: 'Failed to generate upload URL',
      };
    }
  }

  async confirmUpload(fileId: string, userId: string): Promise<FileResponse> {
    try {
      const file = await this.dynamoService.getFile(fileId, userId);

      if (!file) {
        return {
          success: false,
          message: 'File not found',
        };
      }

      const downloadUrl = await this.s3Service.generatePresignedDownloadUrl(file.s3Key);

      const updatedFile = await this.dynamoService.updateFile(fileId, userId, {
        downloadUrl,
      });

      return {
        success: true,
        message: 'Upload confirmed successfully',
        file: updatedFile!,
      };
    } catch (error) {
      console.error('Error confirming upload:', error);
      return {
        success: false,
        message: 'Failed to confirm upload',
      };
    }
  }

  async getBulkUploadUrls(input: BulkUploadInput, userId: string): Promise<BulkUploadResponse> {
    try {
      const results = [];

      for (const fileInput of input.files) {
        try {
          const uploadInput: UploadFileInput = {
            folderId: input.folderId,
            originalName: fileInput.originalName,
            fileType: fileInput.fileType,
            fileSize: fileInput.fileSize,
            description: fileInput.description,
            tags: fileInput.tags,
          };

          const result = await this.getUploadUrl(uploadInput, userId);

          results.push({
            originalName: fileInput.originalName,
            success: result.success,
            file: result.file,
            uploadUrl: result.uploadUrl,
            error: result.success ? undefined : result.message,
          });
        } catch (error) {
          results.push({
            originalName: fileInput.originalName,
            success: false,
            error: 'Failed to process file',
          });
        }
      }

      return {
        success: true,
        message: 'Bulk upload URLs generated',
        results,
      };
    } catch (error) {
      console.error('Error generating bulk upload URLs:', error);
      return {
        success: false,
        message: 'Failed to generate bulk upload URLs',
        results: [],
      };
    }
  }

  async updateFile(input: UpdateFileInput, userId: string): Promise<FileResponse> {
    try {
      const existingFile = await this.dynamoService.getFile(input.fileId, userId);

      if (!existingFile) {
        return {
          success: false,
          message: 'File not found',
        };
      }

      const updates: Partial<File> = {};

      if (input.originalName !== undefined) updates.originalName = input.originalName;
      if (input.description !== undefined) updates.description = input.description;
      if (input.tags !== undefined) updates.tags = input.tags;
      if (input.isPublic !== undefined) updates.isPublic = input.isPublic;
      if (input.hoktusDecision !== undefined) updates.hoktusDecision = input.hoktusDecision;

      const updatedFile = await this.dynamoService.updateFile(input.fileId, userId, updates);

      return {
        success: true,
        message: 'File updated successfully',
        file: updatedFile!,
      };
    } catch (error) {
      console.error('Error updating file:', error);
      return {
        success: false,
        message: 'Failed to update file',
      };
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<FileResponse> {
    try {
      const file = await this.dynamoService.getFile(fileId, userId);

      if (!file) {
        return {
          success: false,
          message: 'File not found',
        };
      }

      await this.s3Service.deleteFile(file.s3Key);
      await this.dynamoService.deleteFile(fileId, userId);

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting file:', error);
      return {
        success: false,
        message: 'Failed to delete file',
      };
    }
  }

  async deleteFiles(fileIds: string[], userId: string): Promise<FileResponse> {
    try {
      const deletedFiles = [];
      const errors = [];

      for (const fileId of fileIds) {
        try {
          const result = await this.deleteFile(fileId, userId);
          if (result.success) {
            deletedFiles.push(fileId);
          } else {
            errors.push(`${fileId}: ${result.message}`);
          }
        } catch (error) {
          errors.push(`${fileId}: Failed to delete`);
        }
      }

      return {
        success: true,
        message: `Deleted ${deletedFiles.length} files. ${errors.length > 0 ? `Errors: ${errors.join(', ')}` : ''}`,
      };
    } catch (error) {
      console.error('Error deleting files:', error);
      return {
        success: false,
        message: 'Failed to delete files',
      };
    }
  }

  async getDownloadUrl(fileId: string, userId: string): Promise<{ success: boolean; message: string; downloadUrl?: string }> {
    try {
      const file = await this.dynamoService.getFile(fileId, userId);

      if (!file) {
        return {
          success: false,
          message: 'File not found',
        };
      }

      const downloadUrl = await this.s3Service.generatePresignedDownloadUrl(file.s3Key);

      return {
        success: true,
        message: 'Download URL generated successfully',
        downloadUrl,
      };
    } catch (error) {
      console.error('Error generating download URL:', error);
      return {
        success: false,
        message: 'Failed to generate download URL',
      };
    }
  }

  async getPublicFile(fileId: string): Promise<FileResponse> {
    try {
      const file = await this.dynamoService.getPublicFile(fileId);

      if (!file) {
        return {
          success: false,
          message: 'Public file not found',
        };
      }

      const downloadUrl = await this.s3Service.generatePresignedDownloadUrl(file.s3Key);

      return {
        success: true,
        message: 'Public file retrieved successfully',
        file: {
          ...file,
          downloadUrl,
        },
      };
    } catch (error) {
      console.error('Error getting public file:', error);
      return {
        success: false,
        message: 'Failed to retrieve public file',
      };
    }
  }

  async queryFiles(query: FileQuery): Promise<FileResponse> {
    try {
      const result = await this.dynamoService.queryFiles(query);

      return {
        success: true,
        message: 'Files queried successfully',
        files: result.files,
      };
    } catch (error) {
      console.error('Error querying files:', error);
      return {
        success: false,
        message: 'Failed to query files',
      };
    }
  }

  async updateFileStatus(fileId: string, status: string, processingResult?: any): Promise<FileResponse> {
    try {
      console.log(`Updating file ${fileId} status to ${status}`);
      
      const result = await this.dynamoService.updateFileStatus(fileId, status, processingResult);

      return {
        success: true,
        message: 'File status updated successfully',
        file: result,
      };
    } catch (error) {
      console.error('Error updating file status:', error);
      return {
        success: false,
        message: 'Failed to update file status',
      };
    }
  }
}