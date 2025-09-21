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
      if (input.type !== undefined) updates.type = input.type;
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

      // Get all descendants recursively
      const getAllDescendants = async (parentId: string): Promise<string[]> => {
        const children = await this.dynamoService.getFoldersByParent(parentId, userId);
        let descendants = children.map(c => c.folderId);
        
        for (const child of children) {
          const childDescendants = await getAllDescendants(child.folderId);
          descendants = [...descendants, ...childDescendants];
        }
        
        return descendants;
      };

      // Get all descendants
      const descendants = await getAllDescendants(folderId);
      const allFoldersToDelete = [folderId, ...descendants];

      // Sort by depth (deepest first)
      const getFolderDepth = async (folderId: string): Promise<number> => {
        const folder = await this.dynamoService.getFolder(folderId, userId);
        if (!folder) return 0;
        
        let depth = 0;
        let currentParent = folder.parentId;
        while (currentParent) {
          depth++;
          const parentFolder = await this.dynamoService.getFolder(currentParent, userId);
          currentParent = parentFolder?.parentId || null;
        }
        return depth;
      };

      // Sort folders by depth (descending - deepest first)
      const sortedFolders = await Promise.all(
        allFoldersToDelete.map(async (id) => ({
          id,
          depth: await getFolderDepth(id)
        }))
      );

      const sortedFolderIds = sortedFolders
        .sort((a, b) => b.depth - a.depth)
        .map(f => f.id);

      console.log('Deleting folders in order:', sortedFolderIds);

      // Delete folders one by one in the correct order
      const deletedFolders = [];
      const errors = [];

      for (const id of sortedFolderIds) {
        try {
          await this.dynamoService.updateFolder(id, userId, { isActive: false });
          deletedFolders.push(id);
        } catch (error) {
          console.error(`Error deleting folder ${id}:`, error);
          errors.push(`${id}: ${error}`);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          message: `Partially deleted. Errors: ${errors.join(', ')}`,
        };
      }

      return {
        success: true,
        message: `Folder and ${descendants.length} subfolders deleted successfully`,
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
      // Get all folders to calculate depth
      const allFoldersResult = await this.dynamoService.getFoldersByUser(userId);
      const allFolders = allFoldersResult.folders;
      
      // Calculate depth for each folder
      const getFolderDepth = (folderId: string): number => {
        const folder = allFolders.find((f: any) => f.folderId === folderId);
        if (!folder) return 0;
        
        let depth = 0;
        let currentParent = folder.parentId;
        while (currentParent) {
          depth++;
          const parentFolder = allFolders.find((f: any) => f.folderId === currentParent);
          currentParent = parentFolder?.parentId || undefined;
        }
        return depth;
      };

      // Sort folders by depth (descending - deepest first)
      const sortedFolderIds = folderIds.sort((a, b) => {
        const depthA = getFolderDepth(a);
        const depthB = getFolderDepth(b);
        return depthB - depthA; // Deeper folders first
      });

      console.log('Deleting folders in order:', sortedFolderIds.map(id => {
        const folder = allFolders.find((f: any) => f.folderId === id);
        return { id, name: folder?.name, depth: getFolderDepth(id) };
      }));

      const deletedFolders = [];
      const errors = [];

      for (const folderId of sortedFolderIds) {
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