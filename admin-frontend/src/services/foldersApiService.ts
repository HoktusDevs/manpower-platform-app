/**
 * Folders API Service
 * Service layer for folders-service microservice using Alova
 */

import { foldersAlova } from '../lib/alova';
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
  static createFolder(input: CreateFolderInput) {
    return foldersAlova.Post<FolderResponse>(
      API_CONFIG.folders.endpoints.base,
      input
    );
  }

  /**
   * Get all folders
   */
  static getAllFolders(limit?: number, nextToken?: string) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (nextToken) params.append('nextToken', nextToken);

    const queryString = params.toString();
    const url = queryString
      ? `${API_CONFIG.folders.endpoints.base}?${queryString}`
      : API_CONFIG.folders.endpoints.base;

    return foldersAlova.Get<FolderResponse>(url);
  }

  /**
   * Get a single folder by ID
   */
  static getFolder(folderId: string) {
    return foldersAlova.Get<FolderResponse>(
      API_CONFIG.folders.endpoints.byId(folderId)
    );
  }

  /**
   * Get folder children (subfolders)
   */
  static getFolderChildren(folderId: string, limit?: number) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = queryString
      ? `${API_CONFIG.folders.endpoints.children(folderId)}?${queryString}`
      : API_CONFIG.folders.endpoints.children(folderId);

    return foldersAlova.Get<FolderResponse>(url);
  }

  /**
   * Get root folders (folders without parent)
   */
  static getRootFolders() {
    return foldersAlova.Get<FolderResponse>(
      API_CONFIG.folders.endpoints.root
    );
  }

  /**
   * Update a folder
   */
  static updateFolder(folderId: string, input: UpdateFolderInput) {
    return foldersAlova.Put<FolderResponse>(
      API_CONFIG.folders.endpoints.byId(folderId),
      input
    );
  }

  /**
   * Delete a single folder
   */
  static deleteFolder(folderId: string) {
    return foldersAlova.Delete<FolderResponse>(
      API_CONFIG.folders.endpoints.byId(folderId)
    );
  }

  /**
   * Delete multiple folders
   */
  static deleteFolders(folderIds: string[]) {
    return foldersAlova.Delete<FolderResponse>(
      API_CONFIG.folders.endpoints.batch,
      { folderIds }
    );
  }
}

