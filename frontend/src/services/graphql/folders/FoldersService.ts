/**
 * Folders GraphQL Service
 * Handles all folders-related GraphQL operations
 * 
 * IMPORTANT: This service maintains exact same interface as original graphqlService
 * to ensure zero breaking changes during refactoring
 */

import { cognitoAuthService } from '../../cognitoAuthService';
import type { 
  Folder, 
  CreateFolderInput, 
  UpdateFolderInput, 
  FoldersStats 
} from './types';

// GraphQL Operations - Extracted from original graphqlService.ts
const GET_ALL_FOLDERS = `
  query GetAllFolders($parentId: String, $limit: Int) {
    getAllFolders(parentId: $parentId, limit: $limit) {
      userId
      folderId
      name
      type
      parentId
      createdAt
      updatedAt
      childrenCount
    }
  }
`;

const GET_FOLDER = `
  query GetFolder($folderId: String!) {
    getFolder(folderId: $folderId) {
      userId
      folderId
      name
      type
      parentId
      createdAt
      updatedAt
      childrenCount
    }
  }
`;

const GET_FOLDER_CHILDREN = `
  query GetFolderChildren($parentId: String!) {
    getFolderChildren(parentId: $parentId) {
      userId
      folderId
      name
      type
      parentId
      createdAt
      updatedAt
      childrenCount
    }
  }
`;

const GET_FOLDER_PATH = `
  query GetFolderPath($folderId: String!) {
    getFolderPath(folderId: $folderId) {
      userId
      folderId
      name
      type
      parentId
      createdAt
      updatedAt
    }
  }
`;

const GET_FOLDERS_STATS = `
  query GetFoldersStats {
    getFoldersStats {
      totalFolders
      rootFolders
      averageDepth
      mostUsedTypes {
        type
        count
      }
    }
  }
`;

const CREATE_FOLDER = `
  mutation CreateFolder($input: CreateFolderInput!) {
    createFolder(input: $input) {
      userId
      folderId
      name
      type
      parentId
      createdAt
      updatedAt
      childrenCount
    }
  }
`;

const UPDATE_FOLDER = `
  mutation UpdateFolder($input: UpdateFolderInput!) {
    updateFolder(input: $input) {
      userId
      folderId
      name
      type
      parentId
      createdAt
      updatedAt
      childrenCount
    }
  }
`;

const DELETE_FOLDER = `
  mutation DeleteFolder($folderId: String!) {
    deleteFolder(folderId: $folderId)
  }
`;

export class FoldersService {
  private executeQuery: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;
  private executeMutation: <T>(mutation: string, variables?: Record<string, unknown>) => Promise<T>;

  constructor(
    executeQuery: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
    executeMutation: <T>(mutation: string, variables?: Record<string, unknown>) => Promise<T>
  ) {
    this.executeQuery = executeQuery;
    this.executeMutation = executeMutation;
  }

  /**
   * ADMIN ONLY: Get all folders
   * Exact same implementation as original graphqlService
   */
  async getAllFolders(parentId?: string, limit?: number): Promise<Folder[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access folders');
    }

    try {
      const result = await this.executeQuery<{ getAllFolders: Folder[] | null }>(
        GET_ALL_FOLDERS,
        { parentId, limit }
      );
      return result.getAllFolders || [];
    } catch (error) {
      // Re-throw authentication errors to trigger auto-logout
      if (error instanceof Error && 
          (error.message.includes('No valid authentication token') || 
           error.message.includes('Authorization failed'))) {
        throw error;
      }
      return [];
    }
  }

  /**
   * ADMIN ONLY: Get specific folder
   * Exact same implementation as original graphqlService
   */
  async getFolder(folderId: string): Promise<Folder | null> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access folders');
    }

    const result = await this.executeQuery<{ getFolder: Folder | null }>(
      GET_FOLDER,
      { folderId }
    );
    return result.getFolder;
  }

  /**
   * ADMIN ONLY: Get folder children (subfolders)
   * Exact same implementation as original graphqlService
   */
  async getFolderChildren(parentId: string): Promise<Folder[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access folders');
    }

    try {
      const result = await this.executeQuery<{ getFolderChildren: Folder[] | null }>(
        GET_FOLDER_CHILDREN,
        { parentId }
      );
      return result.getFolderChildren || [];
    } catch (error) {
      // Re-throw authentication errors to trigger auto-logout
      if (error instanceof Error && 
          (error.message.includes('No valid authentication token') || 
           error.message.includes('Authorization failed'))) {
        throw error;
      }
      return [];
    }
  }

  /**
   * ADMIN ONLY: Get folder hierarchy path (breadcrumbs)
   * Exact same implementation as original graphqlService
   */
  async getFolderPath(folderId: string): Promise<Folder[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access folders');
    }

    try {
      const result = await this.executeQuery<{ getFolderPath: Folder[] | null }>(
        GET_FOLDER_PATH,
        { folderId }
      );
      return result.getFolderPath || [];
    } catch (error) {
      // Re-throw authentication errors to trigger auto-logout
      if (error instanceof Error && 
          (error.message.includes('No valid authentication token') || 
           error.message.includes('Authorization failed'))) {
        throw error;
      }
      return [];
    }
  }

  /**
   * ADMIN ONLY: Get folders statistics
   * Exact same implementation as original graphqlService
   */
  async getFoldersStats(): Promise<FoldersStats> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access folder statistics');
    }

    const result = await this.executeQuery<{ getFoldersStats: FoldersStats }>(GET_FOLDERS_STATS);
    return result.getFoldersStats;
  }

  /**
   * ADMIN ONLY: Create folder
   * Exact same implementation as original graphqlService
   */
  async createFolder(input: CreateFolderInput): Promise<Folder> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can create folders');
    }

    const result = await this.executeMutation<{ createFolder: Folder }>(
      CREATE_FOLDER,
      { input }
    );
    return result.createFolder;
  }

  /**
   * ADMIN ONLY: Update folder
   * Exact same implementation as original graphqlService
   */
  async updateFolder(input: UpdateFolderInput): Promise<Folder> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can update folders');
    }

    const result = await this.executeMutation<{ updateFolder: Folder }>(
      UPDATE_FOLDER,
      { input }
    );
    return result.updateFolder;
  }

  /**
   * ADMIN ONLY: Delete folder
   * Exact same implementation as original graphqlService
   */
  async deleteFolder(folderId: string): Promise<boolean> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can delete folders');
    }

    const result = await this.executeMutation<{ deleteFolder: boolean }>(
      DELETE_FOLDER,
      { folderId }
    );
    return result.deleteFolder;
  }

  /**
   * ADMIN ONLY: Delete multiple folders
   * Exact same implementation as original graphqlService
   */
  async deleteFolders(folderIds: string[]): Promise<boolean> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can delete folders');
    }

    if (!folderIds || folderIds.length === 0) {
      throw new Error('At least one folder ID is required');
    }

    try {
      // Use individual deleteFolder calls since AppSync doesn't support BatchDeleteItem
      for (const folderId of folderIds) {
        await this.deleteFolder(folderId);
      }
      return true;
    } catch (error) {
      throw error;
    }
  }
}