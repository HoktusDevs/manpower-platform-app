import { useState, useMemo } from 'react';
import { FOLDER_OPERATION_MESSAGES } from '../types';
import {
  useGetAllFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useDeleteFolders,
} from '../../../hooks/useFoldersApi';
import { useFolderJobSync } from '../../../hooks/useFolderJobSync';
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
const folderToFolderRow = (folder: { folderId: string; name: string; type: string; createdAt: string; parentId?: string | null }): FolderRow => ({
  id: folder.folderId,
  name: folder.name,
  type: folder.type,
  createdAt: folder.createdAt,
  parentId: folder.parentId || null,
});

export const useFoldersState = (
  onDeleteSuccess?: () => void,
  onDeleteError?: (error: Error) => void,
  onCreateSuccess?: () => void,
  onCreateError?: (error: Error) => void
): UseFoldersStateReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // React Query hooks
  const { data: backendFolders = [], isLoading, refetch: loadFolders } = useGetAllFolders();
  const { syncJobsAfterFolderDeletion } = useFolderJobSync();
  const createFolderMutation = useCreateFolder(onCreateSuccess, onCreateError);
  const updateFolderMutation = useUpdateFolder();
  const deleteFolderMutation = useDeleteFolder(syncJobsAfterFolderDeletion);
  const deleteFoldersMutation = useDeleteFolders(onDeleteSuccess, onDeleteError);

  // Convert backend folders to frontend format
  const folders = useMemo(() => {
    return backendFolders.map(folderToFolderRow);
  }, [backendFolders]);

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
      const input = {
        name: data.name,
        type: data.type,
        parentId: parentId || undefined,
      };

      const result = await createFolderMutation.mutateAsync(input);

      // Console.log for tracking
      if (result.folder) {
        console.log(FOLDER_OPERATION_MESSAGES.CREATE_SUCCESS, {
          id: result.folder.folderId,
          name: result.folder.name,
          type: result.folder.type,
          createdAt: result.folder.createdAt
        });
      }
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
      await deleteFolderMutation.mutateAsync(folderId);
      
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
    if (!Array.isArray(folderIds) || folderIds.length === 0) {
      return;
    }

    const foldersToDelete = folders.filter(f => folderIds.includes(f.id));
    if (foldersToDelete.length === 0) {
      return;
    }

    // Find all descendants for each folder to delete (cascade deletion)
    const getAllDescendants = (parentId: string): string[] => {
      const children = folders.filter(f => f.parentId === parentId);
      let descendants = children.map(c => c.id);
      
      children.forEach(child => {
        descendants = [...descendants, ...getAllDescendants(child.id)];
      });
      
      return descendants;
    };

    // Build complete list including all descendants
    const allFoldersToDelete = new Set(folderIds);
    folderIds.forEach(folderId => {
      const descendants = getAllDescendants(folderId);
      descendants.forEach(id => allFoldersToDelete.add(id));
    });

    const allIdsToDelete = Array.from(allFoldersToDelete);

    try {
      if (allIdsToDelete.length === 0) {
        throw new Error('No folders to delete');
      }
      
      // Sort folders by depth (children first, parents last)
      const getFolderDepth = (folderId: string): number => {
        const folder = folders.find(f => f.id === folderId);
        if (!folder) return 0;
        
        let depth = 0;
        let currentParent = folder.parentId;
        while (currentParent) {
          depth++;
          const parentFolder = folders.find(f => f.id === currentParent);
          currentParent = parentFolder?.parentId || null;
        }
        return depth;
      };

      // Sort by depth (descending - deepest first)
      const sortedIdsToDelete = allIdsToDelete.sort((a, b) => {
        const depthA = getFolderDepth(a);
        const depthB = getFolderDepth(b);
        return depthB - depthA; // Deeper folders first
      });

      console.log('Deleting folders in order:', sortedIdsToDelete.map(id => {
        const folder = folders.find(f => f.id === id);
        return { id, name: folder?.name, depth: getFolderDepth(id) };
      }));
      
      await deleteFoldersMutation.mutateAsync(sortedIdsToDelete);
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
      const input = {
        name: data.name,
        type: data.type
      };

      await updateFolderMutation.mutateAsync({ folderId, input });
      
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