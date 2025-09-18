import { v4 as uuidv4 } from 'uuid';
import { Folder, FolderModel } from '../models/Folder';
import { DynamoService } from './dynamoService';
import { MockDynamoService } from './mockDynamoService';
import { CreateFolderInput, UpdateFolderInput, FolderResponse, FolderQuery } from '../types';

export class FolderService {
  private dynamoService: DynamoService | MockDynamoService;

  constructor() {
    const isLocal = process.env.STAGE === 'local';
    if (isLocal) {
      console.log('FolderService: Using MockDynamoService for local development');
      this.dynamoService = new MockDynamoService();
    } else {
      console.log('FolderService: Using real DynamoService for production');
      this.dynamoService = new DynamoService();
    }
  }

  async createFolder(input: CreateFolderInput, userId: string): Promise<FolderResponse> {
    try {
      const folderId = uuidv4();
      const folderModel = new FolderModel({
        folderId,
        userId,
        name: input.name,
        type: input.type,
        parentId: input.parentId,
        metadata: input.metadata,
      });

      // If parentId exists, verify parent folder exists
      if (input.parentId) {
        const parentFolder = await this.dynamoService.getFolder(input.parentId, userId);
        if (!parentFolder) {
          return {
            success: false,
            message: 'Parent folder not found',
          };
        }
      }

      const folder = await this.dynamoService.createFolder(folderModel);

      return {
        success: true,
        message: 'Folder created successfully',
        folder: {
          ...folder,
          path: await this.buildFolderPath(folder),
        },
      };
    } catch (error) {
      console.error('Error creating folder:', error);
      return {
        success: false,
        message: 'Failed to create folder',
      };
    }
  }

  async createSystemFolder(input: CreateFolderInput, systemUserId: string): Promise<FolderResponse> {
    try {
      // This is for internal system calls (e.g., from jobs-service)
      // No authorization check needed
      const folderId = uuidv4();
      const folderModel = new FolderModel({
        folderId,
        userId: systemUserId,
        name: input.name,
        type: input.type || 'application',
        parentId: input.parentId,
        metadata: input.metadata,
      });

      const folder = await this.dynamoService.createFolder(folderModel);

      return {
        success: true,
        message: 'System folder created successfully',
        folder: {
          ...folder,
          path: await this.buildFolderPath(folder),
        },
      };
    } catch (error) {
      console.error('Error creating system folder:', error);
      return {
        success: false,
        message: 'Failed to create system folder',
      };
    }
  }

  async getFolder(folderId: string, userId: string): Promise<FolderResponse> {
    try {
      const folder = await this.dynamoService.getFolder(folderId, userId);

      if (!folder) {
        return {
          success: false,
          message: 'Folder not found',
        };
      }

      // Get children count
      const children = await this.dynamoService.getFoldersByParent(folderId, userId);

      return {
        success: true,
        message: 'Folder retrieved successfully',
        folder: {
          ...folder,
          path: await this.buildFolderPath(folder),
          childrenCount: children.length,
        },
      };
    } catch (error) {
      console.error('Error getting folder:', error);
      return {
        success: false,
        message: 'Failed to retrieve folder',
      };
    }
  }

  async getAllFolders(userId: string, limit?: number, nextToken?: string): Promise<FolderResponse> {
    try {
      const result = await this.dynamoService.getFoldersByUser(userId, limit, nextToken);

      const foldersWithPath = await Promise.all(
        result.folders.map(async (folder) => ({
          ...folder,
          path: await this.buildFolderPath(folder),
        }))
      );

      return {
        success: true,
        message: 'Folders retrieved successfully',
        folders: foldersWithPath,
      };
    } catch (error) {
      console.error('Error getting folders:', error);
      return {
        success: false,
        message: 'Failed to retrieve folders',
      };
    }
  }

  async getFolderChildren(folderId: string, userId: string, limit?: number): Promise<FolderResponse> {
    try {
      const folders = await this.dynamoService.getFoldersByParent(folderId, userId, limit);

      const foldersWithPath = await Promise.all(
        folders.map(async (folder) => ({
          ...folder,
          path: await this.buildFolderPath(folder),
        }))
      );

      return {
        success: true,
        message: 'Child folders retrieved successfully',
        folders: foldersWithPath,
      };
    } catch (error) {
      console.error('Error getting folder children:', error);
      return {
        success: false,
        message: 'Failed to retrieve child folders',
      };
    }
  }

  async getRootFolders(userId: string): Promise<FolderResponse> {
    try {
      const folders = await this.dynamoService.getRootFolders(userId);

      const foldersWithPath = await Promise.all(
        folders.map(async (folder) => ({
          ...folder,
          path: await this.buildFolderPath(folder),
        }))
      );

      return {
        success: true,
        message: 'Root folders retrieved successfully',
        folders: foldersWithPath,
      };
    } catch (error) {
      console.error('Error getting root folders:', error);
      return {
        success: false,
        message: 'Failed to retrieve root folders',
      };
    }
  }

  async updateFolder(input: UpdateFolderInput, userId: string): Promise<FolderResponse> {
    try {
      const existingFolder = await this.dynamoService.getFolder(input.folderId, userId);

      if (!existingFolder) {
        return {
          success: false,
          message: 'Folder not found',
        };
      }

      const updates: Partial<Folder> = {};

      if (input.name !== undefined) updates.name = input.name;
      if (input.metadata !== undefined) {
        updates.metadata = { ...existingFolder.metadata, ...input.metadata };
      }

      const updatedFolder = await this.dynamoService.updateFolder(input.folderId, userId, updates);

      return {
        success: true,
        message: 'Folder updated successfully',
        folder: updatedFolder ? {
          ...updatedFolder,
          path: await this.buildFolderPath(updatedFolder),
        } : undefined,
      };
    } catch (error) {
      console.error('Error updating folder:', error);
      return {
        success: false,
        message: 'Failed to update folder',
      };
    }
  }

  async deleteFolder(folderId: string, userId: string): Promise<FolderResponse> {
    try {
      const folder = await this.dynamoService.getFolder(folderId, userId);

      if (!folder) {
        return {
          success: false,
          message: 'Folder not found',
        };
      }

      // Check if folder has children
      const children = await this.dynamoService.getFoldersByParent(folderId, userId);

      if (children.length > 0) {
        return {
          success: false,
          message: 'Cannot delete folder with children. Delete children first.',
        };
      }

      // Mark as inactive instead of deleting
      await this.dynamoService.updateFolder(folderId, userId, { isActive: false });

      return {
        success: true,
        message: 'Folder deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting folder:', error);
      return {
        success: false,
        message: 'Failed to delete folder',
      };
    }
  }

  async deleteFolders(folderIds: string[], userId: string): Promise<FolderResponse> {
    try {
      const deletedFolders = [];
      const errors = [];

      for (const folderId of folderIds) {
        const result = await this.deleteFolder(folderId, userId);
        if (result.success) {
          deletedFolders.push(folderId);
        } else {
          errors.push(`${folderId}: ${result.message}`);
        }
      }

      return {
        success: true,
        message: `Deleted ${deletedFolders.length} folders. ${errors.length > 0 ? `Errors: ${errors.join(', ')}` : ''}`,
      };
    } catch (error) {
      console.error('Error deleting folders:', error);
      return {
        success: false,
        message: 'Failed to delete folders',
      };
    }
  }

  async queryFolders(query: FolderQuery): Promise<FolderResponse> {
    try {
      const result = await this.dynamoService.queryFolders(query);

      const foldersWithPath = await Promise.all(
        result.folders.map(async (folder) => ({
          ...folder,
          path: await this.buildFolderPath(folder),
        }))
      );

      return {
        success: true,
        message: 'Folders queried successfully',
        folders: foldersWithPath,
      };
    } catch (error) {
      console.error('Error querying folders:', error);
      return {
        success: false,
        message: 'Failed to query folders',
      };
    }
  }

  private async buildFolderPath(folder: Folder): Promise<string> {
    const pathComponents = [folder.name];
    let currentFolder = folder;

    while (currentFolder.parentId) {
      const parentFolder = await this.dynamoService.getFolder(currentFolder.parentId, folder.userId);
      if (!parentFolder) break;
      pathComponents.unshift(parentFolder.name);
      currentFolder = parentFolder;
    }

    return '/' + pathComponents.join('/');
  }
}