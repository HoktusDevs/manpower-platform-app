/**
 * Folders Service - Pure fetch implementation
 * Replaces Alova with native fetch for consistency with React Query
 */

import type { CreateFolderInput, UpdateFolderInput, FolderResponse } from './foldersApiService';

// API Configuration
const FOLDERS_BASE_URL = (import.meta.env.VITE_FOLDERS_API_URL || 'https://83upriwf35.execute-api.us-east-1.amazonaws.com/dev') + '/folders';

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

/**
 * Folders Service using native fetch
 * Direct replacement for Alova-based service
 */
export class FoldersService {
  /**
   * Create a new folder
   */
  static async createFolder(input: CreateFolderInput): Promise<FolderResponse> {
    return fetchWithAuth<FolderResponse>(`${FOLDERS_BASE_URL}`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Get all folders
   */
  static async getAllFolders(limit?: number, nextToken?: string): Promise<FolderResponse> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (nextToken) params.append('nextToken', nextToken);

    const queryString = params.toString();
    const url = queryString
      ? `${FOLDERS_BASE_URL}?${queryString}`
      : FOLDERS_BASE_URL;

    return fetchWithAuth<FolderResponse>(url);
  }

  /**
   * Get a single folder by ID
   */
  static async getFolder(folderId: string): Promise<FolderResponse> {
    return fetchWithAuth<FolderResponse>(`${FOLDERS_BASE_URL}/${folderId}`);
  }

  /**
   * Get folder children (subfolders)
   */
  static async getFolderChildren(folderId: string, limit?: number): Promise<FolderResponse> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = queryString
      ? `${FOLDERS_BASE_URL}/${folderId}/children?${queryString}`
      : `${FOLDERS_BASE_URL}/${folderId}/children`;

    return fetchWithAuth<FolderResponse>(url);
  }

  /**
   * Get root folders (folders without parent)
   */
  static async getRootFolders(): Promise<FolderResponse> {
    return fetchWithAuth<FolderResponse>(`${FOLDERS_BASE_URL}/root`);
  }

  /**
   * Update a folder
   */
  static async updateFolder(folderId: string, input: UpdateFolderInput): Promise<FolderResponse> {
    return fetchWithAuth<FolderResponse>(`${FOLDERS_BASE_URL}/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  /**
   * Delete a single folder
   */
  static async deleteFolder(folderId: string): Promise<FolderResponse> {
    return fetchWithAuth<FolderResponse>(`${FOLDERS_BASE_URL}/${folderId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Delete multiple folders
   */
  static async deleteFolders(folderIds: string[]): Promise<FolderResponse> {
    return fetchWithAuth<FolderResponse>(`${FOLDERS_BASE_URL}/batch`, {
      method: 'DELETE',
      body: JSON.stringify({ folderIds }),
    });
  }

  /**
   * Get folders by type
   */
  static async getFoldersByType(type: string): Promise<FolderResponse> {
    return fetchWithAuth<FolderResponse>(`${FOLDERS_BASE_URL}/type/${type}`);
  }

  /**
   * Search folders by name
   */
  static async searchFolders(query: string): Promise<FolderResponse> {
    const params = new URLSearchParams({ q: query });
    return fetchWithAuth<FolderResponse>(`${FOLDERS_BASE_URL}/search?${params}`);
  }

  /**
   * Move folder to new parent
   */
  static async moveFolder(folderId: string, newParentId: string | null): Promise<FolderResponse> {
    return fetchWithAuth<FolderResponse>(`${FOLDERS_BASE_URL}/${folderId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ parentId: newParentId }),
    });
  }

  /**
   * Get folder tree (hierarchical structure)
   */
  static async getFolderTree(rootId?: string): Promise<FolderResponse> {
    const url = rootId
      ? `${FOLDERS_BASE_URL}/tree/${rootId}`
      : `${FOLDERS_BASE_URL}/tree`;
    return fetchWithAuth<FolderResponse>(url);
  }

  /**
   * Check if folder name exists
   */
  static async checkFolderExists(name: string, parentId?: string): Promise<{ exists: boolean }> {
    const params = new URLSearchParams({ name });
    if (parentId) params.append('parentId', parentId);

    return fetchWithAuth<{ exists: boolean }>(`${FOLDERS_BASE_URL}/exists?${params}`);
  }

  /**
   * Batch update folders
   */
  static async batchUpdateFolders(updates: Array<{ folderId: string; update: UpdateFolderInput }>): Promise<FolderResponse> {
    return fetchWithAuth<FolderResponse>(`${FOLDERS_BASE_URL}/batch`, {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    });
  }
}