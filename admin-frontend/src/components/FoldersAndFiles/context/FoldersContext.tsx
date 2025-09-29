import React, { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useUnifiedFoldersState } from '../hooks/useUnifiedFoldersState';
import { useWebSocket } from '../../../hooks/useWebSocket';
import {
  useCreateFolderOptimistic,
  useUpdateFolderOptimistic,
  useDeleteFolderOptimistic,
  useDeleteFoldersOptimistic,
  type CreateFolderInput,
  type UpdateFolderInput
} from '../../../hooks/useFoldersApiOptimistic';
import type { UseFoldersStateReturn } from '../types';

interface FoldersProviderProps {
  children: ReactNode;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: Error) => void;
  onCreateSuccess?: () => void;
  onCreateError?: (error: Error) => void;
}

interface FoldersContextValue extends UseFoldersStateReturn {
  webSocket: {
    isConnected: boolean;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  };
  // Optimistic methods that provide instant feedback
  optimistic: {
    createFolder: (data: CreateFolderInput, parentId?: string | null) => void;
    updateFolder: (id: string, data: UpdateFolderInput) => void;
    deleteFolder: (id: string) => void;
    deleteFolders: (ids: string[]) => void;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isBatchDeleting: boolean;
  };
}

const FoldersContext = createContext<FoldersContextValue | null>(null);

export const FoldersProvider: React.FC<FoldersProviderProps> = ({
  children,
  onDeleteSuccess,
  onDeleteError,
  onCreateSuccess,
  onCreateError
}) => {
  const foldersState = useUnifiedFoldersState(onDeleteSuccess, onDeleteError, onCreateSuccess, onCreateError);

  // Optimistic mutation hooks
  const createFolderMutation = useCreateFolderOptimistic(
    (folder) => {
      onCreateSuccess?.();
      console.log('✅ Folder created optimistically:', folder);
    },
    (error) => {
      onCreateError?.(error);
      console.error('❌ Error creating folder optimistically:', error);
    }
  );

  const updateFolderMutation = useUpdateFolderOptimistic(
    (folder) => {
      console.log('✅ Folder updated optimistically:', folder);
    },
    (error) => {
      console.error('❌ Error updating folder optimistically:', error);
    }
  );

  const deleteFolderMutation = useDeleteFolderOptimistic(
    (folderId) => {
      onDeleteSuccess?.();
      console.log('✅ Folder deleted optimistically:', folderId);
    },
    (error) => {
      onDeleteError?.(error);
      console.error('❌ Error deleting folder optimistically:', error);
    }
  );

  const deleteFoldersMutation = useDeleteFoldersOptimistic(
    () => {
      onDeleteSuccess?.();
      console.log('✅ Folders batch deleted optimistically');
    },
    (error) => {
      onDeleteError?.(error);
      console.error('❌ Error batch deleting folders optimistically:', error);
    }
  );

  // Optimistic wrapper functions
  const optimisticCreateFolder = useCallback((data: CreateFolderInput, parentId?: string | null) => {
    const folderInput = {
      ...data,
      parentId: parentId || undefined
    };
    createFolderMutation.mutate(folderInput);
  }, [createFolderMutation]);

  const optimisticUpdateFolder = useCallback((id: string, data: UpdateFolderInput) => {
    updateFolderMutation.mutate({ folderId: id, input: data });
  }, [updateFolderMutation]);

  const optimisticDeleteFolder = useCallback((id: string) => {
    deleteFolderMutation.mutate(id);
  }, [deleteFolderMutation]);

  const optimisticDeleteFolders = useCallback((ids: string[]) => {
    deleteFoldersMutation.mutate(ids);
  }, [deleteFoldersMutation]);

  // Handle real-time folder updates
  const handleFolderUpdate = useCallback((event: { action: string; data?: { folder?: unknown; id?: string } }) => {
    console.log('🔄 Real-time folder update received:', event);

    switch (event.action) {
      case 'folder_created':
        console.log('📁 New folder created in real-time:', event.data);
        if (event.data?.folder) {
          console.log('📁 Folder data:', event.data.folder);
        }
        // Force refresh to ensure UI updates
        console.log('🔄 Triggering folder refresh...');
        foldersState.refreshFolders().then(() => {
          console.log('✅ Folders refreshed successfully');
        }).catch((error) => {
          console.error('❌ Error refreshing folders:', error);
        });
        break;

      case 'folder_updated':
        console.log('📝 Folder updated in real-time:', event.data.folder);
        // Force refresh to ensure UI updates
        foldersState.refreshFolders().then(() => {
          console.log('✅ Folders refreshed after update');
        }).catch((error) => {
          console.error('❌ Error refreshing folders after update:', error);
        });
        break;

      case 'folder_deleted':
        console.log('🗑️ Folder deleted in real-time:', event.data.folderId);
        // Force refresh to ensure UI updates
        foldersState.refreshFolders().then(() => {
          console.log('✅ Folders refreshed after deletion');
        }).catch((error) => {
          console.error('❌ Error refreshing folders after deletion:', error);
        });
        break;

      default:
        console.log('ℹ️ Unknown folder update action:', event.action);
    }
  }, [foldersState]);

  // Handle real-time file updates
  const handleFileUpdate = useCallback((event: { action: string; data?: { file?: unknown; id?: string } }) => {
    console.log('🔄 Real-time file update received:', event);

    switch (event.action) {
      case 'file_created':
        console.log('📄 New file created in real-time:', event.data);
        if (event.data?.file) {
          console.log('📄 File data:', event.data.file);
        }
        // Force refresh to ensure UI updates
        console.log('🔄 Triggering folder refresh for file changes...');
        foldersState.refreshFolders().then(() => {
          console.log('✅ Folders refreshed after file creation');
        }).catch((error) => {
          console.error('❌ Error refreshing folders after file creation:', error);
        });
        break;

      case 'file_updated':
        console.log('📝 File updated in real-time:', event.data.file);
        // Force refresh to ensure UI updates
        foldersState.refreshFolders().then(() => {
          console.log('✅ Folders refreshed after file update');
        }).catch((error) => {
          console.error('❌ Error refreshing folders after file update:', error);
        });
        break;

      case 'file_deleted':
        console.log('🗑️ File deleted in real-time:', event.data.fileId);
        // Force refresh to ensure UI updates
        foldersState.refreshFolders().then(() => {
          console.log('✅ Folders refreshed after file deletion');
        }).catch((error) => {
          console.error('❌ Error refreshing folders after file deletion:', error);
        });
        break;

      default:
        console.log('ℹ️ Unknown file update action:', event.action);
    }
  }, [foldersState]);

  // Initialize WebSocket connection
  const { isConnected, connectionStatus } = useWebSocket(handleFolderUpdate, handleFileUpdate, true);

  const contextValue: FoldersContextValue = {
    ...foldersState,
    webSocket: {
      isConnected,
      connectionStatus
    },
    optimistic: {
      createFolder: optimisticCreateFolder,
      updateFolder: optimisticUpdateFolder,
      deleteFolder: optimisticDeleteFolder,
      deleteFolders: optimisticDeleteFolders,
      isCreating: createFolderMutation.isPending,
      isUpdating: updateFolderMutation.isPending,
      isDeleting: deleteFolderMutation.isPending,
      isBatchDeleting: deleteFoldersMutation.isPending,
    }
  };

  return (
    <FoldersContext.Provider value={contextValue}>
      {children}
    </FoldersContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFoldersContext = (): FoldersContextValue => {
  const context = useContext(FoldersContext);
  if (!context) {
    throw new Error('useFoldersContext must be used within a FoldersProvider');
  }
  return context;
};

// Optional version that doesn't throw
// eslint-disable-next-line react-refresh/only-export-components
export const useFoldersContextOptional = (): FoldersContextValue | null => {
  const context = useContext(FoldersContext);
  return context;
};