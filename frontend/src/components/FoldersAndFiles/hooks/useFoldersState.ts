import { useState, useMemo } from 'react';
import { FOLDER_OPERATION_MESSAGES } from '../types';
import type { 
  FolderRow, 
  CreateFolderData, 
  UseFoldersStateReturn
} from '../types';

/**
 * Custom hook to manage folders state and operations
 * Follows Single Responsibility Principle - only handles folder data
 */
export const useFoldersState = (): UseFoldersStateReturn => {
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Memoized filtered folders for performance - show only folders in current directory level
  const filteredFolders = useMemo(() => {
    // If searching, show all matching folders regardless of hierarchy and location
    if (searchTerm.trim()) {
      return folders.filter(folder =>
        folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        folder.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Show folders in current directory level
    // If currentFolderId is null, show root folders (no parentId)
    // If currentFolderId is set, show folders with that parentId
    if (currentFolderId === null) {
      return folders.filter(folder => !folder.parentId || folder.parentId === null);
    }
    return folders.filter(folder => folder.parentId === currentFolderId);
  }, [folders, searchTerm, currentFolderId]);

  /**
   * Generate unique folder ID
   */
  const generateFolderId = (): string => {
    return `folder_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  };

  /**
   * Create new folder
   */
  const createFolder = (data: CreateFolderData, parentId: string | null = null): void => {
    const newFolder: FolderRow = {
      id: generateFolderId(),
      name: data.name,
      type: data.type,
      createdAt: new Date().toISOString(),
      parentId: parentId || null,
    };

    setFolders(prevFolders => [newFolder, ...prevFolders]);
    
    // Console.log for tracking
    console.log(FOLDER_OPERATION_MESSAGES.CREATE_SUCCESS, {
      id: newFolder.id,
      name: newFolder.name,
      type: newFolder.type,
      createdAt: newFolder.createdAt,
      totalFolders: folders.length + 1
    });
  };

  /**
   * Delete folder by ID
   */
  const deleteFolder = (folderId: string): void => {
    const folderToDelete = folders.find(f => f.id === folderId);
    if (!folderToDelete) return;

    setFolders(prevFolders => prevFolders.filter(f => f.id !== folderId));
    
    // Console.log for tracking
    console.log(FOLDER_OPERATION_MESSAGES.DELETE_SUCCESS, {
      id: folderToDelete.id,
      name: folderToDelete.name,
      type: folderToDelete.type
    });
  };


  /**
   * Update existing folder with new data
   */
  const updateFolder = (folderId: string, data: CreateFolderData): void => {
    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex === -1) return;

    setFolders(prevFolders => 
      prevFolders.map(folder => 
        folder.id === folderId 
          ? { ...folder, name: data.name, type: data.type }
          : folder
      )
    );
    
    // Console.log for tracking
    console.log('📝 Carpeta actualizada', {
      id: folderId,
      newName: data.name,
      newType: data.type,
      timestamp: new Date().toISOString()
    });
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

  return {
    folders,
    filteredFolders,
    searchTerm,
    currentFolderId,
    createFolder,
    deleteFolder,
    updateFolder,
    getFolderById,
    getSubfolders,
    navigateToFolder,
    navigateBack,
    navigateToRoot,
    getCurrentFolder,
    getBreadcrumbPath,
    setSearchTerm,
  };
};