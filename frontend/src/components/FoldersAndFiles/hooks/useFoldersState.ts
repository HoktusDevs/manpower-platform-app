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

  // Memoized filtered folders for performance
  const filteredFolders = useMemo(() => {
    if (!searchTerm.trim()) return folders;
    
    return folders.filter(folder =>
      folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      folder.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [folders, searchTerm]);

  /**
   * Generate unique folder ID
   */
  const generateFolderId = (): string => {
    return `folder_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  };

  /**
   * Create new folder
   */
  const createFolder = (data: CreateFolderData): void => {
    const newFolder: FolderRow = {
      id: generateFolderId(),
      name: data.name,
      type: data.type,
      createdAt: new Date().toISOString(),
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

  return {
    folders,
    filteredFolders,
    searchTerm,
    createFolder,
    deleteFolder,
    updateFolder,
    getFolderById,
    setSearchTerm,
  };
};