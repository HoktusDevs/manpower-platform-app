/**
 * Unified Folders Hooks
 * React Query hooks for folder operations with proper cache synchronization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FoldersService } from '../services/foldersService';
import type { CreateFolderInput, UpdateFolderInput, Folder } from '../services/foldersApiService';

// Query keys factory
export const FOLDERS_QUERY_KEYS = {
  all: ['folders'] as const,
  lists: () => [...FOLDERS_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: { limit?: number; nextToken?: string }) =>
    [...FOLDERS_QUERY_KEYS.lists(), filters] as const,
  details: () => [...FOLDERS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...FOLDERS_QUERY_KEYS.details(), id] as const,
  children: (parentId: string) => [...FOLDERS_QUERY_KEYS.all, 'children', parentId] as const,
  root: () => [...FOLDERS_QUERY_KEYS.all, 'root'] as const,
  type: (type: string) => [...FOLDERS_QUERY_KEYS.all, 'type', type] as const,
  search: (query: string) => [...FOLDERS_QUERY_KEYS.all, 'search', query] as const,
  jobs: ['jobs'] as const,
};

// Helper to generate optimistic IDs
const generateOptimisticId = () => `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Hook to fetch all folders
 */
export const useGetAllFolders = (limit?: number, nextToken?: string) => {
  return useQuery({
    queryKey: FOLDERS_QUERY_KEYS.list({ limit, nextToken }),
    queryFn: async () => {
      const response = await FoldersService.getAllFolders(limit, nextToken);
      return response.folders || [];
    },
    staleTime: 30 * 1000, // 30 seconds
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
      const response = await FoldersService.getFolder(folderId);
      return response.folder;
    },
    enabled: !!folderId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
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
      const response = await FoldersService.getFolderChildren(folderId, limit);
      return response.folders || [];
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
      const response = await FoldersService.getRootFolders();
      return response.folders || [];
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
      const response = await FoldersService.createFolder(input);
      if (!response.success || !response.folder) {
        throw new Error(response.message || 'Failed to create folder');
      }
      return response;
    },
    onMutate: async (input: CreateFolderInput) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });

      // Snapshot previous values
      const previousFolders = queryClient.getQueriesData({ queryKey: FOLDERS_QUERY_KEYS.all });

      // Create optimistic folder
      const optimisticFolder: Folder = {
        userId: 'temp-user',
        folderId: generateOptimisticId(),
        name: input.name,
        type: input.type,
        parentId: input.parentId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        path: undefined,
        childrenCount: 0,
        metadata: input.metadata || {},
      };

      // Update all folder queries optimistically
      queryClient.setQueriesData(
        { queryKey: FOLDERS_QUERY_KEYS.lists() },
        (old: Folder[] | undefined) => {
          if (!old) return [optimisticFolder];
          return [...old, optimisticFolder];
        }
      );

      return { previousFolders, optimisticId: optimisticFolder.folderId };
    },
    onSuccess: (data, _variables, context) => {
      // Replace optimistic folder with real data
      if (context?.optimisticId) {
        queryClient.setQueriesData(
          { queryKey: FOLDERS_QUERY_KEYS.lists() },
          (old: Folder[] | undefined) => {
            if (!old) return old;
            return old.map((folder) =>
              folder.folderId === context.optimisticId ? data.folder! : folder
            );
          }
        );
      }
      onSuccess?.();
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousFolders) {
        context.previousFolders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    },
    onSettled: () => {
      // Invalidate all folder queries and job queries
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.jobs });
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook to update a folder with optimistic updates
 */
export const useUpdateFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, input }: { folderId: string; input: UpdateFolderInput }) => {
      const response = await FoldersService.updateFolder(folderId, input);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update folder');
      }
      return response;
    },
    onMutate: async ({ folderId, input }) => {
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });

      const previousFolders = queryClient.getQueriesData({ queryKey: FOLDERS_QUERY_KEYS.all });

      // Update all folder queries optimistically
      queryClient.setQueriesData(
        { queryKey: FOLDERS_QUERY_KEYS.lists() },
        (old: Folder[] | undefined) => {
          if (!old) return old;
          return old.map((folder) =>
            folder.folderId === folderId
              ? { ...folder, ...input, updatedAt: new Date().toISOString() }
              : folder
          );
        }
      );

      return { previousFolders };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFolders) {
        context.previousFolders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.jobs });
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook to delete a folder with optimistic updates
 */
export const useDeleteFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      const response = await FoldersService.deleteFolder(folderId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete folder');
      }
      return response;
    },
    onMutate: async (folderId: string) => {
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });

      const previousFolders = queryClient.getQueriesData({ queryKey: FOLDERS_QUERY_KEYS.all });

      // Remove folder optimistically from all queries
      queryClient.setQueriesData(
        { queryKey: FOLDERS_QUERY_KEYS.lists() },
        (old: Folder[] | undefined) => {
          if (!old) return old;
          return old.filter((folder) => folder.folderId !== folderId);
        }
      );

      return { previousFolders };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFolders) {
        context.previousFolders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.jobs });
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
      const response = await FoldersService.deleteFolders(folderIds);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete folders');
      }
      return response;
    },
    onMutate: async (folderIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });

      const previousFolders = queryClient.getQueriesData({ queryKey: FOLDERS_QUERY_KEYS.all });

      // Remove folders optimistically from all queries
      queryClient.setQueriesData(
        { queryKey: FOLDERS_QUERY_KEYS.lists() },
        (old: Folder[] | undefined) => {
          if (!old) return old;
          return old.filter((folder) => !folderIds.includes(folder.folderId));
        }
      );

      return { previousFolders };
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error, _variables, context) => {
      if (context?.previousFolders) {
        context.previousFolders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.jobs });
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook to search folders
 */
export const useSearchFolders = (query: string, enabled = true) => {
  return useQuery({
    queryKey: FOLDERS_QUERY_KEYS.search(query),
    queryFn: async () => {
      const response = await FoldersService.searchFolders(query);
      return response.folders || [];
    },
    enabled: !!query && enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to get folders by type
 */
export const useGetFoldersByType = (type: string, enabled = true) => {
  return useQuery({
    queryKey: FOLDERS_QUERY_KEYS.type(type),
    queryFn: async () => {
      const response = await FoldersService.getFoldersByType(type);
      return response.folders || [];
    },
    enabled: !!type && enabled,
    staleTime: 1000 * 60 * 5,
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to move folder to new parent
 */
export const useMoveFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, newParentId }: { folderId: string; newParentId: string | null }) => {
      const response = await FoldersService.moveFolder(folderId, newParentId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to move folder');
      }
      return response;
    },
    onMutate: async ({ folderId, newParentId }) => {
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });

      const previousFolders = queryClient.getQueriesData({ queryKey: FOLDERS_QUERY_KEYS.all });

      // Update folder parent optimistically
      queryClient.setQueriesData(
        { queryKey: FOLDERS_QUERY_KEYS.lists() },
        (old: Folder[] | undefined) => {
          if (!old) return old;
          return old.map((folder) =>
            folder.folderId === folderId
              ? { ...folder, parentId: newParentId, updatedAt: new Date().toISOString() }
              : folder
          );
        }
      );

      return { previousFolders };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFolders) {
        context.previousFolders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};