import { InternalCreateFolderRequest, FolderServiceResponse } from '../types';

export class FoldersServiceClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    // Dynamic URL based on environment
    this.baseUrl = process.env.FOLDERS_SERVICE_URL || 'https://83upriwf35.execute-api.us-east-1.amazonaws.com/dev';
    this.apiKey = process.env.INTERNAL_API_KEY || 'default-internal-key';
  }

  async createApplicantFolder(
    applicantUserId: string, 
    jobFolderId: string, 
    adminUserId: string,
    applicationId: string,
    additionalMetadata?: { [key: string]: any }
  ): Promise<FolderServiceResponse> {
    try {
      console.log(`FoldersServiceClient: Creating applicant folder for userId "${applicantUserId}" in job folder "${jobFolderId}"`);

      const requestData: InternalCreateFolderRequest = {
        apiKey: this.apiKey,
        userId: adminUserId, // Usar el admin como owner de la carpeta
        folderData: {
          applicantUserId: applicantUserId, // Enviar el userId del postulante para que folders-service busque su nombre
          type: 'Postulante',
          parentId: jobFolderId,
          metadata: {
            applicationId: applicationId,
            createdBy: 'applications-service',
            createdAt: new Date().toISOString(),
            ...additionalMetadata
          }
        }
      };

      const response = await fetch(`${this.baseUrl}/folders/internal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json() as any;

      if (!response.ok) {
        console.error('FoldersServiceClient: Error creating applicant folder:', result);
        return {
          success: false,
          message: result.message || 'Failed to create applicant folder',
        };
      }

      console.log('FoldersServiceClient: Applicant folder created successfully:', result.folder?.folderId);
      return result;
    } catch (error) {
      console.error('FoldersServiceClient: Network error:', error);
      return {
        success: false,
        message: 'Network error when creating applicant folder',
      };
    }
  }

  // Get folder by ID
  async getFolder(folderId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/folders/${folderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        console.error('FoldersServiceClient: Error getting folder:', response.statusText);
        return null;
      }

      const result = await response.json() as any;
      return result.folder || null;
    } catch (error) {
      console.error('FoldersServiceClient: Network error getting folder:', error);
      return null;
    }
  }

  // Delete folder by application ID and job folder
  async deleteFolderByApplicationId(applicationId: string, jobFolderId: string, adminUserId: string): Promise<FolderServiceResponse> {
    try {
      console.log(`FoldersServiceClient: Searching for applicant folder in job folder "${jobFolderId}" with applicationId "${applicationId}"`);

      // Get all folders in the job folder
      const listResponse = await fetch(`${this.baseUrl}/folders?parentId=${jobFolderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminUserId,
        },
      });

      if (!listResponse.ok) {
        console.warn('FoldersServiceClient: Could not list folders:', listResponse.statusText);
        return {
          success: true, // Non-blocking - folder may not exist
          message: 'Could not list folders in job folder',
        };
      }

      const listResult = await listResponse.json() as any;
      const folders = listResult.folders || [];

      // Find folder with matching applicationId in metadata
      const targetFolder = folders.find((folder: any) =>
        folder.metadata?.applicationId === applicationId
      );

      if (!targetFolder) {
        console.warn(`FoldersServiceClient: No folder found for applicationId "${applicationId}"`);
        return {
          success: true, // Not an error - folder may not exist
          message: 'No folder found for this application',
        };
      }

      // Delete the folder
      const folderId = targetFolder.folderId;
      console.log(`FoldersServiceClient: Deleting folder ${folderId} (${targetFolder.name}) for applicationId "${applicationId}"`);

      const deleteResponse = await fetch(`${this.baseUrl}/folders/${folderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminUserId,
        },
      });

      const deleteResult = await deleteResponse.json() as any;

      if (!deleteResponse.ok) {
        console.error('FoldersServiceClient: Error deleting folder:', deleteResult);
        return {
          success: false,
          message: deleteResult.message || 'Failed to delete application folder',
        };
      }

      console.log(`FoldersServiceClient: Folder ${folderId} deleted successfully`);
      return deleteResult;
    } catch (error) {
      console.error('FoldersServiceClient: Error deleting folder by applicationId:', error);
      return {
        success: false,
        message: 'Network error when deleting application folder',
      };
    }
  }

  // Health check for folders-service
  async checkFoldersServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      });

      return response.ok;
    } catch (error) {
      console.error('FoldersServiceClient: Health check failed:', error);
      return false;
    }
  }
}
