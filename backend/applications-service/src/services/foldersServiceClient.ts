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
