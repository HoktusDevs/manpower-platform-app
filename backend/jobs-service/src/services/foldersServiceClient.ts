import { FolderServiceCreateRequest, FolderServiceResponse } from '../types';

export class FoldersServiceClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    // Dynamic URL based on environment
    this.baseUrl = process.env.FOLDERS_SERVICE_URL || 'http://localhost:3004';
    this.apiKey = process.env.INTERNAL_API_KEY || 'default-internal-key';
  }

  async createJobFolder(folderName: string, parentFolderId: string, userId: string): Promise<FolderServiceResponse> {
    try {
      console.log(`FoldersServiceClient: Creating job folder "${folderName}" in parent "${parentFolderId}"`);

      const requestData = {
        apiKey: this.apiKey,
        userId: userId,
        folderData: {
          name: folderName,
          type: 'Cargo',
          parentId: parentFolderId
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
        console.error('FoldersServiceClient: Error creating folder:', result);
        return {
          success: false,
          message: result.message || 'Failed to create folder',
        };
      }

      console.log('FoldersServiceClient: Folder created successfully:', result.folder?.folderId);
      return result;
    } catch (error) {
      console.error('FoldersServiceClient: Network error:', error);
      return {
        success: false,
        message: 'Network error when creating folder',
      };
    }
  }

  async deleteJobFolder(folderId: string, userId: string): Promise<FolderServiceResponse> {
    try {
      console.log(`FoldersServiceClient: Deleting job folder "${folderId}"`);

      // For now, we'll implement this when needed
      // The folders-service would need a delete endpoint for internal use
      console.log('FoldersServiceClient: Delete functionality not yet implemented');

      return {
        success: true,
        message: 'Delete functionality not yet implemented',
      };
    } catch (error) {
      console.error('FoldersServiceClient: Error deleting folder:', error);
      return {
        success: false,
        message: 'Error deleting folder',
      };
    }
  }

  // Health check for folders-service
  async checkFoldersServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/local/health`, {
        method: 'GET',
      });

      return response.ok;
    } catch (error) {
      console.error('FoldersServiceClient: Health check failed:', error);
      return false;
    }
  }
}