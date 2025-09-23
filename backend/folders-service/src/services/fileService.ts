import { File } from '../types';

export interface FileServiceResponse {
  success: boolean;
  message: string;
  files?: File[];
}

export class FileService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.FILES_SERVICE_URL || 'https://api-gateway-url/files';
  }

  async getFilesByFolder(folderId: string, userId: string): Promise<FileServiceResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/files/folder/${folderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'default-internal-key'}`,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: 'Failed to fetch files from files service',
        };
      }

      const data = await response.json();
      return data as FileServiceResponse;
    } catch (error) {
      console.error('Error fetching files from files service:', error);
      return {
        success: false,
        message: 'Error connecting to files service',
      };
    }
  }
}
