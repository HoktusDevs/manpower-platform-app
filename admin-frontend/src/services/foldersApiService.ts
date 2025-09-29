/**
 * Folders API Service
 * Service layer for folders-service microservice using Axios
 */

import { foldersAxios } from '../lib/axios';
import { API_CONFIG } from '../config/api.config';

// Types matching backend expectations
export interface CreateFolderInput {
  name: string;
  type: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateFolderInput {
  name?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface Folder {
  userId: string;
  folderId: string;
  name: string;
  type: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  path?: string;
  childrenCount?: number;
  metadata?: Record<string, unknown>;
}

export interface FolderResponse {
  success: boolean;
  message: string;
  folder?: Folder;
  folders?: Folder[];
  nextToken?: string;
  deletedCount?: number;
  results?: Array<{ folderId: string; success: boolean; message: string }>;
}

/**
 * Folders API Service
 * Clean and organized service for folder operations
 */
export class FoldersApiService {
  /**
   * Create a new folder
   */
  static async createFolder(input: CreateFolderInput): Promise<FolderResponse> {
    return foldersAxios.post(
      API_CONFIG.folders.endpoints.base,
      input
    );
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
      ? `${API_CONFIG.folders.endpoints.base}?${queryString}`
      : API_CONFIG.folders.endpoints.base;

    return foldersAxios.get(url);
  }

  /**
   * Get a single folder by ID
   */
  static async getFolder(folderId: string): Promise<FolderResponse> {
    return foldersAxios.get(
      API_CONFIG.folders.endpoints.byId(folderId)
    );
  }

  /**
   * Get folder children (subfolders)
   */
  static async getFolderChildren(folderId: string, limit?: number): Promise<FolderResponse> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = queryString
      ? `${API_CONFIG.folders.endpoints.children(folderId)}?${queryString}`
      : API_CONFIG.folders.endpoints.children(folderId);

    return foldersAxios.get(url);
  }

  /**
   * Get root folders (folders without parent)
   */
  static async getRootFolders(): Promise<FolderResponse> {
    return foldersAxios.get(
      API_CONFIG.folders.endpoints.root
    );
  }

  /**
   * Update a folder
   */
  static async updateFolder(folderId: string, input: UpdateFolderInput): Promise<FolderResponse> {
    return foldersAxios.put(
      API_CONFIG.folders.endpoints.byId(folderId),
      input
    );
  }

  /**
   * Delete a single folder
   */
  static async deleteFolder(folderId: string): Promise<FolderResponse> {
    return foldersAxios.delete(
      API_CONFIG.folders.endpoints.byId(folderId)
    );
  }

  /**
   * Delete multiple folders
   */
  static async deleteFolders(folderIds: string[]): Promise<FolderResponse> {
    return foldersAxios.delete(
      API_CONFIG.folders.endpoints.batch,
      { data: { folderIds } }
    );
  }
}

