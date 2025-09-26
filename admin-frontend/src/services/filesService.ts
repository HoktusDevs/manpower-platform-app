/**
 * Files Service - Service for managing files
 */

// API Configuration
const FILES_BASE_URL = (import.meta.env.VITE_FILES_API_URL || 'https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev') + '/files';

// Helper to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('cognito_access_token');
};

// Unified fetch wrapper
async function fetchWithAuth<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => `HTTP error! status: ${response.status}`);
      throw new Error(errorText);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// Types
export interface File {
  documentId: string;
  userId: string;
  documentType: string;
  folderId: string;
  originalName: string;
  fileName: string;
  fileType: string;
  fileExtension: string;
  fileSize: number;
  s3Key: string;
  s3Bucket: string;
  isPublic: boolean;
  tags: string[];
  uploadedAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface FilesResponse {
  success: boolean;
  files?: File[];
  message?: string;
  error?: string;
}

export class FilesService {
  /**
   * Get files by folder ID
   */
  static async getFilesByFolder(folderId: string, limit?: number): Promise<FilesResponse> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = queryString
      ? `${FILES_BASE_URL}/folder/${folderId}?${queryString}`
      : `${FILES_BASE_URL}/folder/${folderId}`;

    return fetchWithAuth<FilesResponse>(url);
  }

  /**
   * Get all files
   */
  static async getAllFiles(limit?: number, nextToken?: string): Promise<FilesResponse> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (nextToken) params.append('nextToken', nextToken);

    const queryString = params.toString();
    const url = queryString
      ? `${FILES_BASE_URL}?${queryString}`
      : FILES_BASE_URL;

    return fetchWithAuth<FilesResponse>(url);
  }

  /**
   * Get a single file by ID
   */
  static async getFile(fileId: string): Promise<FilesResponse> {
    return fetchWithAuth<FilesResponse>(`${FILES_BASE_URL}/${fileId}`);
  }

  /**
   * Delete a file
   */
  static async deleteFile(fileId: string): Promise<FilesResponse> {
    return fetchWithAuth<FilesResponse>(`${FILES_BASE_URL}/${fileId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Delete multiple files
   */
  static async deleteFiles(fileIds: string[]): Promise<FilesResponse> {
    return fetchWithAuth<FilesResponse>(`${FILES_BASE_URL}/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ fileIds }),
    });
  }
}
