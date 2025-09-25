import { useState, useMemo } from 'react';
import {
  useGetAllFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useDeleteFolders,
} from '../../../hooks/useFoldersApi';
import { useFolderJobSync } from '../../../hooks/useFolderJobSync';
import { jobsService, type CreateJobInput } from '../../../services/jobsService';
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
const folderToFolderRow = (folder: { folderId: string; name: string; type: string; createdAt: string; parentId?: string | null; files?: unknown[] }): FolderRow => ({
  id: folder.folderId,
  name: folder.name,
  type: folder.type,
  createdAt: folder.createdAt,
  parentId: folder.parentId || null,
  files: folder.files || [],
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
  const { syncJobsAfterFolderDeletion, syncJobsAfterMultipleFolderDeletion } = useFolderJobSync();
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
        console.log('📁 Carpeta creada:', result.folder);
        
        // Si es carpeta tipo "Cargo", crear job automáticamente
        if (data.type === 'Cargo' && result.folder.folderId) {
          console.log('🚀 Creando job automáticamente para carpeta tipo "Cargo"...');
          await createJobForCargoFolder(result.folder.folderId, data.name);
        }
      }
    } catch {
      throw new Error('Failed to create folder');
    }
  };

  /**
   * Create job automatically for Cargo type folder
   */
  const createJobForCargoFolder = async (folderId: string, folderName: string): Promise<void> => {
    try {
      console.log('🚀 Creando job para carpeta tipo "Cargo":', folderName);
      
      // Crear job básico basado en el nombre de la carpeta
      const jobInput: CreateJobInput = {
        title: folderName,
        description: `Descripción del cargo: ${folderName}`,
        companyName: 'Empresa por definir',
        requirements: 'Requisitos por definir',
        salary: '',
        location: 'Por definir',
        employmentType: 'FULL_TIME',
        experienceLevel: 'ENTRY_LEVEL',
        benefits: '',
        schedule: '',
        expiresAt: undefined,
        requiredDocuments: [],
        folderId: folderId
      };

      const response = await jobsService.createJob(jobInput);
      
      if (response.success) {
        console.log('✅ Job creado automáticamente:', response.jobs?.[0]?.jobId);
      } else {
        console.error('❌ Error al crear job automáticamente:', response.message);
      }
    } catch {
      console.error('❌ Error en createJobForCargoFolder');
      // No lanzar error para no romper la creación de carpeta
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
      } catch {
      throw new Error('Failed to create folder');
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
      
      // Sync jobs after multiple folder deletion
      const foldersToDelete = allIdsToDelete.map(id => {
        const folder = folders.find(f => f.id === id);
        return { id, type: folder?.type || 'Unknown' };
      });
      
      const folderIds = foldersToDelete.map(f => f.id);
      const folderTypes = foldersToDelete.map(f => f.type);
      
      console.log('🗑️ Sincronizando jobs después de eliminación múltiple...');
      await syncJobsAfterMultipleFolderDeletion(folderIds, folderTypes);
      
    } catch {
      throw new Error('Failed to create folder');
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
      console.log('Folder updated successfully:', { folderId, input, timestamp: new Date().toISOString() });
    } catch {
      throw new Error('Failed to create folder');
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
    console.log('🔄 refreshFolders: Iniciando recarga de carpetas...');
    try {
      // Forzar invalidación de cache y recarga
      await loadFolders();
      console.log('✅ refreshFolders: Carpetas recargadas exitosamente');
    } catch {
      console.error('❌ refreshFolders: Error al recargar carpetas');
    }
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