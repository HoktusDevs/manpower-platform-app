import React, { createContext, useContext, useCallback, useRef } from 'react';
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
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'disabled';
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

  // Debounce ref to prevent excessive refreshes
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const REFRESH_DEBOUNCE_MS = 500; // 500ms debounce

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

  // Debounced refresh function to prevent loops
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      // console.log('🔄 Performing debounced folder refresh...'); // Reduced noise
      foldersState.refreshFolders().then(() => {
        // console.log('✅ Folders refreshed successfully'); // Reduced noise
      }).catch((error) => {
        console.error('❌ Error refreshing folders:', error);
      });
    }, REFRESH_DEBOUNCE_MS);
  }, [foldersState, REFRESH_DEBOUNCE_MS]);

  // Handle real-time folder updates
  const handleFolderUpdate = useCallback((event: { action: string; data?: { folder?: unknown; id?: string } }) => {
    // console.log('🔄 Real-time folder update received:', event); // Reduced noise

    switch (event.action) {
      case 'folder_created':
        console.log('📁 New folder created via WebSocket');
        debouncedRefresh();
        break;

      case 'folder_updated':
        console.log('📝 Folder updated via WebSocket');
        debouncedRefresh();
        break;

      case 'folder_deleted':
        console.log('🗑️ Folder deleted via WebSocket');
        debouncedRefresh();
        break;

      case 'file_created':
        console.log('📄 New file created via WebSocket');
        debouncedRefresh();
        break;

      case 'file_updated':
        console.log('📝 File updated via WebSocket');
        debouncedRefresh();
        break;

      case 'file_deleted':
        console.log('🗑️ File deleted via WebSocket');
        debouncedRefresh();
        break;

      default:
        // console.log('ℹ️ Unknown folder update action:', event.action); // Reduced noise
        break;
    }
  }, [debouncedRefresh]);

  // Handle real-time file updates
  const handleFileUpdate = useCallback((event: { action: string; data?: { file?: unknown; id?: string } }) => {
    // console.log('🔄 Real-time file update received:', event); // Reduced noise

    switch (event.action) {
      case 'file_created':
        console.log('📄 New file created via WebSocket');
        debouncedRefresh();
        break;

      case 'file_updated':
        console.log('📝 File updated via WebSocket');
        debouncedRefresh();
        break;

      case 'file_deleted':
        console.log('🗑️ File deleted via WebSocket');
        debouncedRefresh();
        break;

      default:
        // console.log('ℹ️ Unknown file update action:', event.action); // Reduced noise
        break;
    }
  }, [debouncedRefresh]);

  // Handle real-time document processing updates
  const handleDocumentProcessingUpdate = useCallback((event: {
    type: string;
    documentId?: string;
    status?: string;
    processingStatus?: string;
    phase?: string;
    message?: string;
    finalDecision?: string;
    documentType?: string;
  }) => {
    console.log('🔄 Document processing update received:', event);

    // Solo refrescar cuando hay cambios relevantes
    if (event.type === 'document_processing_update') {
      const { status, processingStatus, phase, message } = event;

      console.log(`📊 Document ${event.documentId}: ${message || status}`);
      console.log(`   Phase: ${phase}, Status: ${processingStatus}`);

      // Refrescar para actualizar el estado en la UI
      debouncedRefresh();
    }
  }, [debouncedRefresh]);

  // Initialize WebSocket connection - Re-enabled with better error handling
  const { isConnected, connectionStatus } = useWebSocket(
    handleFolderUpdate,
    handleFileUpdate,
    true,
    handleDocumentProcessingUpdate
  );

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