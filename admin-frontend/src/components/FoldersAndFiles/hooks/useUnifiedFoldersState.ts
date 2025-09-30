import { useState, useMemo } from 'react';
import {
  useGetAllFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useDeleteFolders,
} from '../../../hooks/useUnifiedFolders';
import { useGetAllFiles } from '../../../hooks/useFilesApi';
import { useCreateStandaloneFolder } from '../../../services/unifiedJobFolderService';
import type {
  FolderRow,
  CreateFolderData,
  UseFoldersStateReturn
} from '../types';

// Helper function to convert backend Folder to frontend FolderRow
const folderToFolderRow = (folder: { folderId: string; name: string; type: string; createdAt: string; parentId?: string | null; files?: unknown[] }): FolderRow => ({
  id: folder.folderId,
  name: folder.name,
  type: folder.type,
  createdAt: folder.createdAt,
  parentId: folder.parentId || null,
  files: folder.files || [],
});

export const useUnifiedFoldersState = (
  onDeleteSuccess?: () => void,
  onDeleteError?: (error: Error) => void,
  onCreateSuccess?: () => void,
  onCreateError?: (error: Error) => void
): UseFoldersStateReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // React Query hooks using unified system
  const { data: backendFolders = [], isLoading, refetch: loadFolders } = useGetAllFolders();
  const { data: allFiles = [], refetch: loadFiles } = useGetAllFiles();
  const createFolderMutation = useCreateFolder(onCreateSuccess, onCreateError);
  const createStandaloneFolderMutation = useCreateStandaloneFolder();
  const updateFolderMutation = useUpdateFolder();
  const deleteFolderMutation = useDeleteFolder();
  const deleteFoldersMutation = useDeleteFolders(onDeleteSuccess, onDeleteError);

  // Convert backend folders to frontend format with files
  const folders = useMemo(() => {
    console.log('🔄 useUnifiedFoldersState: Processing folders and files...');
    console.log('📁 Backend folders count:', backendFolders.length);
    console.log('📄 All files count:', allFiles.length);
    console.log('📄 All files with folderIds:', allFiles.map(f => ({name: f.originalName, folderId: f.folderId})));
    
    // Group files by folderId
    const filesByFolder = allFiles.reduce((acc, file) => {
      if (!acc[file.folderId]) {
        acc[file.folderId] = [];
      }
      acc[file.folderId].push(file);
      return acc;
    }, {} as Record<string, typeof allFiles>);

    console.log('📁 Files by folder:', filesByFolder);

    const result = backendFolders.map(folder => {
      const folderRow = folderToFolderRow(folder);
      // Add files to the folder
      folderRow.files = filesByFolder[folder.folderId] || [];
      console.log(`📁 Folder ${folder.name} (${folder.folderId}): ${folderRow.files.length} files`);
      return folderRow;
    });

    // console.log('✅ Processed folders:', result); // Reduced noise
    return result;
  }, [backendFolders, allFiles]);

  // Memoized filtered folders for performance
  const filteredFolders = useMemo(() => {
    // If searching, show all matching folders regardless of hierarchy and location
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();

      return folders.filter(folder => {
        // Match folder name or type
        const folderMatches =
          folder.name.toLowerCase().includes(lowerSearchTerm) ||
          folder.type.toLowerCase().includes(lowerSearchTerm);

        // Match any file name within the folder
        const hasMatchingFile = folder.files && Array.isArray(folder.files) &&
          folder.files.some((file: any) =>
            file.originalName?.toLowerCase().includes(lowerSearchTerm) ||
            file.name?.toLowerCase().includes(lowerSearchTerm)
          );

        return folderMatches || hasMatchingFile;
      });
    }

    // Show folders in current directory level
    // If currentFolderId is null, show only root folders (parentId is null)
    // If currentFolderId is set, show folders with that parentId
    if (currentFolderId === null) {
      // Show only root-level folders (those without a parent or with ROOT as parent)
      return folders.filter(folder =>
        folder.parentId === null ||
        folder.parentId === undefined ||
        folder.parentId === "ROOT"
      );
    }
    return folders.filter(folder => folder.parentId === currentFolderId);
  }, [folders, searchTerm, currentFolderId]);

  /**
   * Create new folder without job creation for all types
   */
  const createFolder = async (data: CreateFolderData, parentId: string | null = null): Promise<void> => {
    try {
      // Para carpetas tipo "Cargo", extraer solo el nombre del cargo
      const folderName = data.type === 'Cargo' ? extractJobTitle(data.name) : data.name;

      const input = {
        name: folderName,
        type: data.type,
        parentId: parentId || undefined,
      };

      // Use standalone folder creation for "Cargo" type (no job creation)
      // Use regular folder creation for other types
      const result = data.type === 'Cargo'
        ? await createStandaloneFolderMutation.mutateAsync(input)
        : await createFolderMutation.mutateAsync(input);

      // Console.log for tracking
      if (result.folder) {
        console.log('📁 Carpeta creada:', result.folder);
        console.log('✅ No se creará job automáticamente para carpetas tipo "Cargo"');
      }
    } catch (error) {
      console.error('❌ Error creating folder:', error);
      throw new Error('Failed to create folder');
    }
  };

  /**
   * Extract job title from folder name (remove region prefix)
   * Example: "Los Lagos - Transportista" -> "Transportista"
   */
  const extractJobTitle = (folderName: string): string => {
    // Si contiene " - ", tomar solo la parte después del guión
    const parts = folderName.split(' - ');
    return parts.length > 1 ? parts[parts.length - 1].trim() : folderName;
  };


  /**
   * Delete folder by ID using unified service
   */
  const deleteFolder = async (folderId: string): Promise<void> => {
    const folderToDelete = folders.find(f => f.id === folderId);
    if (!folderToDelete) return;

    try {
      await deleteFolderMutation.mutateAsync(folderId);
      console.log('✅ Folder deleted using unified service');
    } catch (error) {
      console.error('❌ Error deleting folder:', error);
      throw new Error('Failed to delete folder');
    }
  };

  /**
   * Delete multiple folders by IDs with unified job deletion
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

      // Use unified service for batch folder deletion (includes job deletion)
      await deleteFoldersMutation.mutateAsync(allIdsToDelete);

      console.log('✅ Folders and associated jobs deleted using unified service');
    } catch (error) {
      console.error('❌ Error deleting folders:', error);
      throw new Error('Failed to delete folders');
    }
  };

  /**
   * Update folder name
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

      console.log('✅ Folder updated successfully:', { folderId, input });
    } catch (error) {
      console.error('❌ Error updating folder:', error);
      throw new Error('Failed to update folder');
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
   * Get current folder
   */
  const getCurrentFolder = (): FolderRow | null => {
    return currentFolderId ? getFolderById(currentFolderId) || null : null;
  };

  /**
   * Get breadcrumb path for current location
   */
  const getBreadcrumbPath = (): FolderRow[] => {
    if (!currentFolderId) return [];

    const path: FolderRow[] = [];
    let currentFolder = getFolderById(currentFolderId);

    while (currentFolder) {
      path.unshift(currentFolder);
      currentFolder = currentFolder.parentId ? getFolderById(currentFolder.parentId) : undefined;
    }

    return path;
  };

  /**
   * Refresh folders and files data
   */
  const refreshFolders = async (): Promise<void> => {
    await Promise.all([
      loadFolders(),
      loadFiles()
    ]);
  };

  return {
    // Data
    folders: folders, // All folders (unfiltered)
    filteredFolders: filteredFolders, // Filtered folders based on search/navigation
    isLoading,
    searchTerm,
    currentFolderId,

    // Actions
    createFolder,
    deleteFolder,
    deleteFolders,
    updateFolder,
    refreshFolders,
    setSearchTerm,

    // Navigation
    navigateToFolder,
    navigateBack,
    navigateToRoot,

    // Utilities
    getFolderById,
    getSubfolders,
    getCurrentFolder,
    getBreadcrumbPath,
  };
};