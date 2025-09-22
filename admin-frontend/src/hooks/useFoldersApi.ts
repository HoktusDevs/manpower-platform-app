
/**
 * Folders API Hooks
 * TanStack Query hooks for folder operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FoldersApiService } from '../services/foldersApiService';
import type { CreateFolderInput, UpdateFolderInput } from '../services/foldersApiService';

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

/**
 * Hook to fetch all folders
 */
export const useGetAllFolders = (limit?: number, nextToken?: string) => {
  return useQuery({
    queryKey: FOLDERS_QUERY_KEYS.list({ limit, nextToken }),
    queryFn: async () => {
      try {
        const response = await FoldersApiService.getAllFolders(limit, nextToken);
        return response.folders || [];
      } catch (error) {
        console.error('Error fetching folders:', error);
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds - short enough to allow refetch when needed
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch a single folder
 */
export const useGetFolder = (folderId: string, enabled = true) => {
  return useQuery({
    queryKey: FOLDERS_QUERY_KEYS.detail(folderId),
    queryFn: async () => {
      try {
        const response = await FoldersApiService.getFolder(folderId);
        return response.folder;
      } catch (error) {
        console.error('Error fetching folder:', error);
        throw error;
      }
    },
    enabled: !!folderId && enabled,
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch folder children
 */
export const useGetFolderChildren = (folderId: string, limit?: number) => {
  return useQuery({
    queryKey: FOLDERS_QUERY_KEYS.children(folderId),
    queryFn: async () => {
      try {
        const response = await FoldersApiService.getFolderChildren(folderId, limit);
        return response.folders || [];
      } catch (error) {
        console.error('Error fetching folder children:', error);
        throw error;
      }
    },
    enabled: !!folderId,
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch root folders
 */
export const useGetRootFolders = () => {
  return useQuery({
    queryKey: FOLDERS_QUERY_KEYS.root(),
    queryFn: async () => {
      try {
        const response = await FoldersApiService.getRootFolders();
        return response.folders || [];
      } catch (error) {
        console.error('Error fetching root folders:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to create a folder with optimistic updates
 */
export const useCreateFolder = (onSuccess?: () => void, onError?: (error: Error) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFolderInput) => {
      const response = await FoldersApiService.createFolder(input).send();
      return response;
    },
    onMutate: async (input: CreateFolderInput) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });

      // Get all existing folder queries
      const existingQueries = queryClient.getQueryCache().findAll({
        queryKey: FOLDERS_QUERY_KEYS.all
      });

      // Snapshot all previous values
      const previousData = new Map();
      existingQueries.forEach(query => {
        previousData.set(query.queryKey, query.state.data);
      });

      // Create optimistic folder
      const optimisticFolder = {
        userId: 'temp-user',
        folderId: `temp-${Date.now()}`,
        name: input.name,
        type: input.type,
        parentId: input.parentId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        path: undefined,
        childrenCount: 0,
        metadata: input.metadata || {}
      };

      // Update all folder queries optimistically
      existingQueries.forEach(query => {
        queryClient.setQueryData(query.queryKey, (old: unknown) => {
          if (!old) return old;
          
          if (Array.isArray(old)) {
            return [...old, optimisticFolder];
          } else if (old && typeof old === 'object' && 'folders' in old) {
            return {
              ...old,
              folders: [...((old as { folders?: unknown[] }).folders || []), optimisticFolder]
            };
          }
          return old;
        });
      });

      return { previousData };
    },
    onSuccess: (data) => {
      // Update all folder queries with real data
      const existingQueries = queryClient.getQueryCache().findAll({
        queryKey: FOLDERS_QUERY_KEYS.all
      });

      existingQueries.forEach(query => {
        queryClient.setQueryData(query.queryKey, (old: unknown) => {
          if (!old) return old;
          
          if (Array.isArray(old)) {
            // Replace optimistic folder with real data
            return old.map((folder: unknown) => 
              folder && typeof folder === 'object' && 'folderId' in folder && 
              typeof folder.folderId === 'string' && folder.folderId.startsWith('temp-') 
                ? data.folder : folder
            );
          } else if (old && typeof old === 'object' && 'folders' in old) {
            return {
              ...old,
              folders: (old as { folders: unknown[] }).folders.map((folder: unknown) => 
                folder && typeof folder === 'object' && 'folderId' in folder && 
                typeof folder.folderId === 'string' && folder.folderId.startsWith('temp-') 
                  ? data.folder : folder
              )
            };
          }
          return old;
        });
      });
      
      console.log('Folder created successfully:', data);
      onSuccess?.();
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error('Error creating folder:', error);
      onError?.(error);
    },
    onSettled: () => {
      // Don't invalidate - we already updated optimistically and with real data
      // queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook to update a folder
 */
export const useUpdateFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, input }: { folderId: string; input: UpdateFolderInput }) => {
      try {
        return await FoldersApiService.updateFolder(folderId, input);
      } catch (error) {
        console.error('Error updating folder:', error);
        throw error;
      }
    },
    onMutate: async ({ folderId, input }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });

      // Get all existing folder queries
      const existingQueries = queryClient.getQueryCache().findAll({
        queryKey: FOLDERS_QUERY_KEYS.all
      });

      // Snapshot all previous values
      const previousData = new Map();
      existingQueries.forEach(query => {
        previousData.set(query.queryKey, query.state.data);
      });

      // Update all folder queries optimistically
      existingQueries.forEach(query => {
        queryClient.setQueryData(query.queryKey, (old: unknown) => {
          if (!old) return old;
          
          if (Array.isArray(old)) {
            return old.map((folder: unknown) => 
              folder && typeof folder === 'object' && 'folderId' in folder && 
              typeof folder.folderId === 'string' && folder.folderId === folderId
                ? { ...folder, name: input.name || (folder as any).name, type: input.type || (folder as any).type }
                : folder
            );
          } else if (old && typeof old === 'object' && 'folders' in old) {
            return {
              ...old,
              folders: (old as { folders: unknown[] }).folders.map((folder: unknown) => 
                folder && typeof folder === 'object' && 'folderId' in folder && 
                typeof folder.folderId === 'string' && folder.folderId === folderId
                  ? { ...folder, name: input.name || (folder as any).name, type: input.type || (folder as any).type }
                  : folder
              )
            };
          }
          return old;
        });
      });

      return { previousData };
    },
    onSuccess: (data) => {
      console.log('Folder updated successfully:', data);
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error('Error updating folder:', error);
    },
    onSettled: () => {
      // Don't invalidate - we already updated optimistically and with real data
      // queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook to delete a folder with optimistic updates
 */
export const useDeleteFolder = (onJobSync?: (folderId: string, folderType: string) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      try {
        return await FoldersApiService.deleteFolder(folderId);
      } catch (error) {
        console.error('Error deleting folder:', error);
        throw error;
      }
    },
    onMutate: async (folderId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });

      // Get all existing folder queries
      const existingQueries = queryClient.getQueryCache().findAll({
        queryKey: FOLDERS_QUERY_KEYS.all
      });

      // Snapshot all previous values
      const previousData = new Map();
      existingQueries.forEach(query => {
        previousData.set(query.queryKey, query.state.data);
      });

      // Update all folder queries optimistically - remove the folder
      existingQueries.forEach(query => {
        queryClient.setQueryData(query.queryKey, (old: unknown) => {
          if (!old) return old;
          
          if (Array.isArray(old)) {
            return old.filter((folder: unknown) => 
              folder && typeof folder === 'object' && 'folderId' in folder && 
              typeof folder.folderId === 'string' && folder.folderId !== folderId
            );
          } else if (old && typeof old === 'object' && 'folders' in old) {
            return {
              ...old,
              folders: (old as { folders: unknown[] }).folders.filter((folder: unknown) => 
                folder && typeof folder === 'object' && 'folderId' in folder && 
                typeof folder.folderId === 'string' && folder.folderId !== folderId
              )
            };
          }
          return old;
        });
      });

      return { previousData };
    },
    onSuccess: (data, folderId) => {
      console.log('Folder deleted successfully:', data);
      // The optimistic update already removed the folder, so we just confirm success
      // No need to update cache again since deletion is already reflected
      
      // Trigger job sync if callback provided
      if (onJobSync && data?.folder) {
        onJobSync(folderId, data.folder.type);
      }
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error('Error deleting folder:', error);
    },
    onSettled: () => {
      // Don't invalidate - we already updated optimistically and with real data
      // queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook to delete multiple folders with optimistic updates
 */
export const useDeleteFolders = (onSuccess?: () => void, onError?: (error: Error) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderIds: string[]) => {
      try {
        return await FoldersApiService.deleteFolders(folderIds);
      } catch (error) {
        console.error('Error deleting folders:', error);
        throw error;
      }
    },
    onMutate: async (folderIds: string[]) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });

      // Get all existing folder queries
      const existingQueries = queryClient.getQueryCache().findAll({
        queryKey: FOLDERS_QUERY_KEYS.all
      });

      // Snapshot all previous values
      const previousData = new Map();
      existingQueries.forEach(query => {
        previousData.set(query.queryKey, query.state.data);
      });

      // Update all folder queries optimistically - remove the folders
      existingQueries.forEach(query => {
        queryClient.setQueryData(query.queryKey, (old: unknown) => {
          if (!old) return old;
          
          if (Array.isArray(old)) {
            return old.filter((folder: unknown) => 
              folder && typeof folder === 'object' && 'folderId' in folder && 
              typeof folder.folderId === 'string' && !folderIds.includes(folder.folderId)
            );
          } else if (old && typeof old === 'object' && 'folders' in old) {
            return {
              ...old,
              folders: (old as { folders: unknown[] }).folders.filter((folder: unknown) => 
                folder && typeof folder === 'object' && 'folderId' in folder && 
                typeof folder.folderId === 'string' && !folderIds.includes(folder.folderId)
              )
            };
          }
          return old;
        });
      });

      return { previousData };
    },
    onSuccess: (data) => {
      console.log('Folders deleted successfully:', data);
      // The optimistic update already removed the folders, so we just confirm success
      // No need to update cache again since deletion is already reflected
      onSuccess?.();
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error('Error deleting folders:', error);
      onError?.(error);
    },
    onSettled: () => {
      // Don't invalidate - we already updated optimistically and with real data
      // queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};