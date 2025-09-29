/**
 * Enhanced Folders API Hooks with Optimistic Updates
 * Improved version with better UX, error handling, and performance
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FoldersApiService } from '../services/foldersApiService';
import type { CreateFolderInput, UpdateFolderInput, Folder } from '../services/foldersApiService';

// Re-export types for convenience
export type { Folder, CreateFolderInput, UpdateFolderInput } from '../services/foldersApiService';

// Query keys factory for better organization
const FOLDERS_QUERY_KEYS = {
  all: ['folders'] as const,
  lists: () => [...FOLDERS_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: { limit?: number; nextToken?: string }) =>
    [...FOLDERS_QUERY_KEYS.lists(), filters] as const,
  details: () => [...FOLDERS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...FOLDERS_QUERY_KEYS.details(), id] as const,
  children: (parentId: string) => [...FOLDERS_QUERY_KEYS.all, 'children', parentId] as const,
  root: () => [...FOLDERS_QUERY_KEYS.all, 'root'] as const,
};

// Optimistic folder states for better UX feedback
export enum OptimisticState {
  CREATING = 'creating',
  UPDATING = 'updating',
  DELETING = 'deleting',
  NONE = 'none'
}

// Enhanced folder type with optimistic state
export interface OptimisticFolder extends Folder {
  _optimisticState?: OptimisticState;
  _optimisticId?: string;
}

/**
 * Utility function to handle optimistic updates across all folder queries
 */
const updateAllFolderQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (data: unknown) => unknown
) => {
  const existingQueries = queryClient.getQueryCache().findAll({
    queryKey: FOLDERS_QUERY_KEYS.all
  });

  const previousData = new Map();

  existingQueries.forEach(query => {
    previousData.set(query.queryKey, query.state.data);
    queryClient.setQueryData(query.queryKey, updater);
  });

  return previousData;
};

/**
 * Enhanced hook to fetch all folders with optimistic states
 */
export const useGetAllFoldersOptimistic = (limit?: number, nextToken?: string) => {
  return useQuery({
    queryKey: FOLDERS_QUERY_KEYS.list({ limit, nextToken }),
    queryFn: async () => {
      const response = await FoldersApiService.getAllFolders(limit, nextToken);
      // Remove optimistic states from server data
      const folders = (response.folders || []).map((folder: OptimisticFolder) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _optimisticState, _optimisticId, ...cleanFolder } = folder;
        return cleanFolder as Folder;
      });
      return folders;
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });
};

/**
 * Enhanced hook to create a folder with instant feedback
 */
export const useCreateFolderOptimistic = (onSuccess?: (folder: Folder) => void, onError?: (error: Error) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFolderInput) => {
      // Small delay to show optimistic state
      await new Promise(resolve => setTimeout(resolve, 100));
      return await FoldersApiService.createFolder(input);
    },

    onMutate: async (input: CreateFolderInput) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });

      const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;

      // Create optimistic folder with loading state
      const optimisticFolder: OptimisticFolder = {
        userId: 'temp-user',
        folderId: optimisticId,
        name: input.name,
        type: input.type,
        parentId: input.parentId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        path: undefined,
        childrenCount: 0,
        metadata: input.metadata || {},
        _optimisticState: OptimisticState.CREATING,
        _optimisticId: optimisticId
      };

      // Update all folder queries optimistically
      const previousData = updateAllFolderQueries(queryClient, (old: unknown) => {
        if (!old) return [optimisticFolder];

        if (Array.isArray(old)) {
          return [optimisticFolder, ...old];
        } else if (old && typeof old === 'object' && 'folders' in old) {
          return {
            ...old,
            folders: [optimisticFolder, ...((old as { folders: OptimisticFolder[] }).folders || [])]
          };
        }
        return old;
      });

      return { previousData, optimisticId };
    },

    onSuccess: (data, variables, context) => {
      if (!data.folder || !context) return;

      // Replace optimistic folder with real data
      updateAllFolderQueries(queryClient, (old: unknown) => {
        if (!old) return old;

        if (Array.isArray(old)) {
          return old.map((folder: OptimisticFolder) =>
            folder._optimisticId === context.optimisticId ? data.folder! : folder
          );
        } else if (old && typeof old === 'object' && 'folders' in old) {
          return {
            ...old,
            folders: (old as { folders: OptimisticFolder[] }).folders.map((folder: OptimisticFolder) =>
              folder._optimisticId === context.optimisticId ? data.folder! : folder
            )
          };
        }
        return old;
      });

      onSuccess?.(data.folder);
    },

    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousData) {
        context.previousData.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      onError?.(error);
    },

    onSettled: () => {
      // Gentle refresh to sync with server
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all, exact: false, refetchType: 'none' });
    },

    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Enhanced hook to update a folder with instant feedback
 */
export const useUpdateFolderOptimistic = (onSuccess?: (folder: Folder) => void, onError?: (error: Error) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, input }: { folderId: string; input: UpdateFolderInput }) => {
      // Small delay to show optimistic state
      await new Promise(resolve => setTimeout(resolve, 50));
      return await FoldersApiService.updateFolder(folderId, input);
    },

    onMutate: async ({ folderId, input }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });

      // Update all folder queries optimistically
      const previousData = updateAllFolderQueries(queryClient, (old: unknown) => {
        if (!old) return old;

        const updateFolder = (folder: OptimisticFolder) => {
          if (folder.folderId === folderId) {
            return {
              ...folder,
              ...input,
              updatedAt: new Date().toISOString(),
              _optimisticState: OptimisticState.UPDATING
            };
          }
          return folder;
        };

        if (Array.isArray(old)) {
          return old.map(updateFolder);
        } else if (old && typeof old === 'object' && 'folders' in old) {
          return {
            ...old,
            folders: (old as { folders: OptimisticFolder[] }).folders.map(updateFolder)
          };
        }
        return old;
      });

      return { previousData, folderId, input };
    },

    onSuccess: (data, variables, context) => {
      if (!data.folder || !context) return;

      // Update with real server data and remove optimistic state
      updateAllFolderQueries(queryClient, (old: unknown) => {
        if (!old) return old;

        const updateFolder = (folder: OptimisticFolder) => {
          if (folder.folderId === context.folderId) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _optimisticState, _optimisticId, ...cleanFolder } = data.folder as OptimisticFolder;
            return cleanFolder;
          }
          return folder;
        };

        if (Array.isArray(old)) {
          return old.map(updateFolder);
        } else if (old && typeof old === 'object' && 'folders' in old) {
          return {
            ...old,
            folders: (old as { folders: OptimisticFolder[] }).folders.map(updateFolder)
          };
        }
        return old;
      });

      onSuccess?.(data.folder);
    },

    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousData) {
        context.previousData.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      onError?.(error);
    },

    onSettled: () => {
      // Gentle refresh to sync with server
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all, exact: false, refetchType: 'none' });
    },

    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Enhanced hook to delete a folder with instant feedback
 */
export const useDeleteFolderOptimistic = (
  onSuccess?: (folderId: string) => void,
  onError?: (error: Error) => void,
  onJobSync?: (folderId: string, folderType: string) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      // Small delay to show deletion state
      await new Promise(resolve => setTimeout(resolve, 200));
      return await FoldersApiService.deleteFolder(folderId);
    },

    onMutate: async (folderId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });

      // Mark folder as deleting first (for visual feedback)
      updateAllFolderQueries(queryClient, (old: unknown) => {
        if (!old) return old;

        const updateFolder = (folder: OptimisticFolder) => {
          if (folder.folderId === folderId) {
            return {
              ...folder,
              _optimisticState: OptimisticState.DELETING
            };
          }
          return folder;
        };

        if (Array.isArray(old)) {
          return old.map(updateFolder);
        } else if (old && typeof old === 'object' && 'folders' in old) {
          return {
            ...old,
            folders: (old as { folders: OptimisticFolder[] }).folders.map(updateFolder)
          };
        }
        return old;
      });

      // Wait a moment for visual feedback, then remove
      await new Promise(resolve => setTimeout(resolve, 300));

      // Now remove the folder completely
      const previousData = updateAllFolderQueries(queryClient, (old: unknown) => {
        if (!old) return old;

        if (Array.isArray(old)) {
          return old.filter((folder: OptimisticFolder) => folder.folderId !== folderId);
        } else if (old && typeof old === 'object' && 'folders' in old) {
          return {
            ...old,
            folders: (old as { folders: OptimisticFolder[] }).folders.filter(
              (folder: OptimisticFolder) => folder.folderId !== folderId
            )
          };
        }
        return old;
      });

      return { previousData, folderId };
    },

    onSuccess: (data, folderId) => {
      // The optimistic update already removed the folder
      if (onJobSync && data.folder) {
        onJobSync(folderId, data.folder.type);
      }
      onSuccess?.(folderId);
    },

    onError: (error, folderId, context) => {
      // Rollback optimistic updates
      if (context?.previousData) {
        context.previousData.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      onError?.(error);
    },

    onSettled: () => {
      // Gentle refresh to sync with server
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all, exact: false, refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: ['jobs'], exact: false, refetchType: 'none' });
    },

    retry: 1, // Less retries for deletions
    retryDelay: 2000,
  });
};

/**
 * Enhanced hook to delete multiple folders with instant feedback
 */
export const useDeleteFoldersOptimistic = (
  onSuccess?: () => void,
  onError?: (error: Error) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderIds: string[]) => {
      // Small delay to show deletion states
      await new Promise(resolve => setTimeout(resolve, 300));
      return await FoldersApiService.deleteFolders(folderIds);
    },

    onMutate: async (folderIds: string[]) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });

      // Mark folders as deleting first
      updateAllFolderQueries(queryClient, (old: unknown) => {
        if (!old) return old;

        const updateFolder = (folder: OptimisticFolder) => {
          if (folderIds.includes(folder.folderId)) {
            return {
              ...folder,
              _optimisticState: OptimisticState.DELETING
            };
          }
          return folder;
        };

        if (Array.isArray(old)) {
          return old.map(updateFolder);
        } else if (old && typeof old === 'object' && 'folders' in old) {
          return {
            ...old,
            folders: (old as { folders: OptimisticFolder[] }).folders.map(updateFolder)
          };
        }
        return old;
      });

      // Wait for visual feedback
      await new Promise(resolve => setTimeout(resolve, 400));

      // Now remove the folders completely
      const previousData = updateAllFolderQueries(queryClient, (old: unknown) => {
        if (!old) return old;

        if (Array.isArray(old)) {
          return old.filter((folder: OptimisticFolder) => !folderIds.includes(folder.folderId));
        } else if (old && typeof old === 'object' && 'folders' in old) {
          return {
            ...old,
            folders: (old as { folders: OptimisticFolder[] }).folders.filter(
              (folder: OptimisticFolder) => !folderIds.includes(folder.folderId)
            )
          };
        }
        return old;
      });

      return { previousData, folderIds };
    },

    onSuccess: () => {
      onSuccess?.();
    },

    onError: (error, folderIds, context) => {
      // Rollback optimistic updates
      if (context?.previousData) {
        context.previousData.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      onError?.(error);
    },

    onSettled: () => {
      // Gentle refresh to sync with server
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all, exact: false, refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: ['jobs'], exact: false, refetchType: 'none' });
    },

    retry: 1,
    retryDelay: 2000,
  });
};

/**
 * Hook to check if a folder is in an optimistic state
 */
export const useFolderOptimisticState = (folderId: string) => {
  const queryClient = useQueryClient();

  const queries = queryClient.getQueryCache().findAll({
    queryKey: FOLDERS_QUERY_KEYS.all
  });

  for (const query of queries) {
    const data = query.state.data;
    let folders: OptimisticFolder[] = [];

    if (Array.isArray(data)) {
      folders = data;
    } else if (data && typeof data === 'object' && 'folders' in data) {
      folders = (data as { folders: OptimisticFolder[] }).folders || [];
    }

    const folder = folders.find(f => f.folderId === folderId || f._optimisticId === folderId);
    if (folder?._optimisticState) {
      return folder._optimisticState;
    }
  }

  return OptimisticState.NONE;
};