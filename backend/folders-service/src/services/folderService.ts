import { v4 as uuidv4 } from 'uuid';
import { Folder, FolderModel } from '../models/Folder';
import { DynamoService } from './dynamoService';
import { MockDynamoService } from './mockDynamoService';
import { UserService } from './userService';
import { CreateFolderInput, UpdateFolderInput, FolderResponse, FolderQuery } from '../types';
import { FileService } from './fileService';

export class FolderService {
  private dynamoService: DynamoService | MockDynamoService;
  private userService: UserService;
  private fileService: FileService;

  constructor() {
    // Forzar uso de datos reales en desarrollo
    const isLocal = false; // process.env.STAGE === 'local' || process.env.NODE_ENV === 'local';
    if (isLocal) {
      console.log('FolderService: Using MockDynamoService for local development');
      this.dynamoService = new MockDynamoService();
    } else {
      console.log('FolderService: Using real DynamoService for production');
      this.dynamoService = new DynamoService();
    }
    this.userService = new UserService();
    this.fileService = new FileService();
  }

  async createFolder(input: CreateFolderInput, userId: string): Promise<FolderResponse> {
    try {
      // Generate uniqueKey for duplicate detection (efficient GSI query)
      const normalizedName = (input.name || '').toLowerCase().trim();
      const normalizedParentId = input.parentId || 'ROOT';
      const uniqueKey = `${userId}#${normalizedName}#${input.type}#${normalizedParentId}`;

      // Check for duplicate using GSI (O(1) instead of O(n) scan)
      const duplicateFolder = await this.dynamoService.getFolderByUniqueKey(uniqueKey);

      if (duplicateFolder) {
        console.log(`⚠️ Duplicate folder detected: ${input.name} (${input.type}) under parent ${input.parentId}`);
        // Return existing folder instead of creating duplicate (idempotent operation)
        return {
          success: true,
          message: 'Folder already exists, returning existing folder',
          folder: {
            ...duplicateFolder,
            path: await this.buildFolderPath(duplicateFolder),
          },
        };
      }

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
      // This is for internal system calls (e.g., from applications-service)
      // No authorization check needed

      let folderName = input.name;

      // Si se proporciona applicantUserId, buscar el usuario y usar su nombre
      if (input.applicantUserId && !input.name) {
        console.log(`FolderService: Looking up applicant user with ID: ${input.applicantUserId}`);
        const userResult = await this.userService.getUserById(input.applicantUserId);

        if (userResult.success && userResult.user) {
          folderName = this.userService.generateFolderName(userResult.user);
          console.log(`FolderService: Using user name for folder: ${folderName}`);
        } else {
          console.warn(`FolderService: Could not find user with ID ${input.applicantUserId}, using fallback name`);
          folderName = `Postulante-${input.applicantUserId}`;
        }
      }

      // Validar que tenemos un nombre para la carpeta
      if (!folderName) {
        return {
          success: false,
          message: 'Folder name is required',
        };
      }

      // Generate uniqueKey for duplicate detection (efficient GSI query)
      const folderType = input.type || 'Postulante';
      const normalizedName = folderName.toLowerCase().trim();
      const normalizedParentId = input.parentId || 'ROOT';
      const uniqueKey = `${systemUserId}#${normalizedName}#${folderType}#${normalizedParentId}`;

      // Check for duplicate using GSI (O(1) instead of O(n) scan)
      const duplicateFolder = await this.dynamoService.getFolderByUniqueKey(uniqueKey);

      if (duplicateFolder) {
        console.log(`⚠️ Duplicate system folder detected: ${folderName} (${folderType}) under parent ${input.parentId}`);
        // Return existing folder instead of creating duplicate (idempotent operation)
        return {
          success: true,
          message: 'System folder already exists, returning existing folder',
          folder: {
            ...duplicateFolder,
            path: await this.buildFolderPath(duplicateFolder),
          },
        };
      }

      const folderId = uuidv4();
      const folderModel = new FolderModel({
        folderId,
        userId: systemUserId,
        name: folderName,
        type: input.type || 'Postulante',
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
        result.folders.map(async (folder) => {
          const folderWithPath = {
            ...folder,
            path: await this.buildFolderPath(folder),
          };

          // Si el tipo es "Postulante", obtener los archivos de la carpeta
          if (folder.type === 'Postulante') {
            try {
              const filesResponse = await this.fileService.getFilesByFolder(folder.folderId, userId);
              if (filesResponse.success && filesResponse.files) {
                return {
                  ...folderWithPath,
                  files: filesResponse.files,
                };
              } else {
                // Si no se pueden obtener archivos, incluir array vacío
                return {
                  ...folderWithPath,
                  files: [],
                };
              }
            } catch (error) {
              console.error(`Error fetching files for folder ${folder.folderId}:`, error);
              // En caso de error, incluir array vacío
              return {
                ...folderWithPath,
                files: [],
              };
            }
          }

          return folderWithPath;
        })
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
          currentParent = parentFolder?.parentId || undefined;
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
          // Delete all files in this folder before deleting the folder
          try {
            const filesResult = await this.fileService.getFilesByFolder(id, userId);
            if (filesResult.success && filesResult.files && filesResult.files.length > 0) {
              console.log(`🗑️ Deleting ${filesResult.files.length} files from folder ${id}`);

              for (const file of filesResult.files) {
                try {
                  await this.fileService.deleteFile(file.documentId, userId);
                  console.log(`✅ Deleted file: ${file.fileName}`);
                } catch (fileError) {
                  console.error(`❌ Error deleting file ${file.documentId}:`, fileError);
                  // Continue deleting other files
                }
              }
            }
          } catch (filesError) {
            console.warn(`⚠️ Could not delete files from folder ${id}:`, filesError);
            // Continue with folder deletion even if file deletion fails
          }

          // Now delete/deactivate the folder
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