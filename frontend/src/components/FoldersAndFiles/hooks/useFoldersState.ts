import { useState, useMemo, useEffect } from 'react';
import { FOLDER_OPERATION_MESSAGES } from '../types';
import { graphqlService, type Folder, type CreateFolderInput, type UpdateFolderInput } from '../../../services/graphqlService';
import type { 
  FolderRow, 
  CreateFolderData, 
  UseFoldersStateReturn
} from '../types';

/**
 * Custom hook to manage folders state and operations
 * Follows Single Responsibility Principle - only handles folder data
 */
// Helper function to convert backend Folder to frontend FolderRow
const folderToFolderRow = (folder: Folder): FolderRow => ({
  id: folder.folderId,
  name: folder.name,
  type: folder.type,
  createdAt: folder.createdAt,
  parentId: folder.parentId || null,
});

// Helper function to convert frontend CreateFolderData to backend CreateFolderInput
const createFolderDataToInput = (data: CreateFolderData, parentId?: string | null): CreateFolderInput => ({
  name: data.name,
  type: data.type,
  parentId: parentId || undefined,
});

export const useFoldersState = (): UseFoldersStateReturn => {
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * Load folders from backend
   */
  const loadFolders = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const backendFolders = await graphqlService.getAllFolders();
      const frontendFolders = backendFolders.map(folderToFolderRow);
      setFolders(frontendFolders);
    } catch (error) {
      console.error('Error loading folders:', error);
      // Keep existing folders on error
    } finally {
      setIsLoading(false);
    }
  };

  // Load folders on component mount
  useEffect(() => {
    loadFolders();
  }, []);

  // Memoized filtered folders for performance
  const filteredFolders = useMemo(() => {
    // If searching, show all matching folders regardless of hierarchy and location
    if (searchTerm.trim()) {
      return folders.filter(folder =>
        folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        folder.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Show folders in current directory level
    // If currentFolderId is null, show only root folders (parentId is null)
    // If currentFolderId is set, show folders with that parentId
    if (currentFolderId === null) {
      // Show only root-level folders (those without a parent)
      return folders.filter(folder => folder.parentId === null || folder.parentId === undefined);
    }
    return folders.filter(folder => folder.parentId === currentFolderId);
  }, [folders, searchTerm, currentFolderId]);


  /**
   * Create new folder
   */
  const createFolder = async (data: CreateFolderData, parentId: string | null = null): Promise<void> => {
    try {
      const input = createFolderDataToInput(data, parentId);
      const backendFolder = await graphqlService.createFolder(input);
      
      // Reload all folders from backend to avoid duplicates
      await loadFolders();
      
      // Console.log for tracking
      console.log(FOLDER_OPERATION_MESSAGES.CREATE_SUCCESS, {
        id: backendFolder.folderId,
        name: backendFolder.name,
        type: backendFolder.type,
        createdAt: backendFolder.createdAt
      });
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  };

  /**
   * Delete folder by ID
   */
  const deleteFolder = async (folderId: string): Promise<void> => {
    const folderToDelete = folders.find(f => f.id === folderId);
    if (!folderToDelete) return;

    try {
      await graphqlService.deleteFolder(folderId);
      
      // Reload all folders from backend to ensure consistency
      await loadFolders();
      
      // Console.log for tracking
      console.log(FOLDER_OPERATION_MESSAGES.DELETE_SUCCESS, {
        id: folderToDelete.id,
        name: folderToDelete.name,
        type: folderToDelete.type
      });
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  };

  /**
   * Delete multiple folders by IDs
   */
  const deleteFolders = async (folderIds: string[]): Promise<void> => {
    const foldersToDelete = folders.filter(f => folderIds.includes(f.id));
    if (foldersToDelete.length === 0) return;

    try {
      await graphqlService.deleteFolders(folderIds);
      
      // Reload all folders from backend to ensure consistency
      await loadFolders();
      
      // Console.log for tracking
      console.log(`${FOLDER_OPERATION_MESSAGES.DELETE_SUCCESS} (${foldersToDelete.length} carpetas)`, {
        deletedFolders: foldersToDelete.map(f => ({ id: f.id, name: f.name, type: f.type })),
        count: foldersToDelete.length
      });
    } catch (error) {
      console.error('Error deleting folders:', error);
      throw error;
    }
  };


  /**
   * Update existing folder with new data
   */
  const updateFolder = async (folderId: string, data: CreateFolderData): Promise<void> => {
    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex === -1) return;

    try {
      const input: UpdateFolderInput = {
        folderId: folderId,
        name: data.name,
        type: data.type
      };
      
      await graphqlService.updateFolder(input);
      
      // Reload all folders from backend to ensure consistency
      await loadFolders();
      
      // Console.log for tracking
      console.log('📝 Carpeta actualizada', {
        id: folderId,
        newName: data.name,
        newType: data.type,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  };

  /**
   * Get folder by ID for editing
   */
  const getFolderById = (folderId: string): FolderRow | undefined => {
    return folders.find(f => f.id === folderId);
  };

  /**
   * Get subfolders for a given parent folder ID
   */
  const getSubfolders = (parentId: string): FolderRow[] => {
    return folders.filter(f => f.parentId === parentId);
  };

  /**
   * Navigate into a folder (like double-clicking in Windows Explorer)
   */
  const navigateToFolder = (folderId: string): void => {
    setCurrentFolderId(folderId);
  };

  /**
   * Navigate back to parent folder
   */
  const navigateBack = (): void => {
    if (currentFolderId) {
      const currentFolder = getFolderById(currentFolderId);
      setCurrentFolderId(currentFolder?.parentId || null);
    }
  };

  /**
   * Navigate to root folder
   */
  const navigateToRoot = (): void => {
    setCurrentFolderId(null);
  };

  /**
   * Get current folder information
   */
  const getCurrentFolder = (): FolderRow | null => {
    return currentFolderId ? getFolderById(currentFolderId) || null : null;
  };

  /**
   * Get breadcrumb path from root to current folder
   */
  const getBreadcrumbPath = (): FolderRow[] => {
    if (!currentFolderId) return [];
    
    const path: FolderRow[] = [];
    let currentId: string | null | undefined = currentFolderId;
    
    while (currentId) {
      const folder = getFolderById(currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    
    return path;
  };

  /**
   * Force reload all folders from backend
   */
  const refreshFolders = async (): Promise<void> => {
    await loadFolders();
  };

  return {
    folders,
    filteredFolders,
    searchTerm,
    currentFolderId,
    isLoading,
    createFolder,
    deleteFolder,
    deleteFolders,
    updateFolder,
    getFolderById,
    getSubfolders,
    navigateToFolder,
    navigateBack,
    navigateToRoot,
    getCurrentFolder,
    getBreadcrumbPath,
    setSearchTerm,
    refreshFolders,
  };
};