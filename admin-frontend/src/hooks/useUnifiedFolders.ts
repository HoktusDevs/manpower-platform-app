/**
 * Unified Folders Hooks
 * React Query hooks for folder operations with proper cache synchronization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FoldersService } from '../services/foldersService';
import { jobsService } from '../services/jobsService';
import type { CreateFolderInput, UpdateFolderInput, Folder } from '../services/foldersApiService';
import type { JobPosting } from '../services/jobsService';

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
      // Invalidate all folder queries
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
      // Note: Jobs are NOT invalidated when creating folders to avoid unnecessary refetches
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
      // Note: Jobs are NOT invalidated when updating folders to avoid unnecessary refetches
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook to delete a folder with optimistic updates and cascade delete associated job
 */
export const useDeleteFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      // Get the folder data from cache to check if it's a "Cargo" type
      const allFolders = queryClient.getQueryData<Folder[]>(FOLDERS_QUERY_KEYS.lists());
      const folderToDelete = allFolders?.find(f => f.folderId === folderId);

      // If it's a "Cargo" folder, also delete the associated job
      if (folderToDelete && folderToDelete.type === 'Cargo') {
        // Get all jobs from cache
        const jobsData = queryClient.getQueriesData<JobPosting[]>({ queryKey: ['jobs'] });
        const jobs = jobsData?.[0]?.[1] || [];

        // Find job with matching title
        const associatedJob = jobs.find(job => job.title === folderToDelete.name);

        // Delete the job if found
        if (associatedJob) {
          try {
            await jobsService.deleteJob(associatedJob.jobId);
            console.log(`✅ Deleted associated job: ${associatedJob.title}`);
          } catch (error) {
            console.error('Failed to delete associated job:', error);
            // Continue with folder deletion even if job deletion fails
          }
        }
      }

      // Delete the folder
      const response = await FoldersService.deleteFolder(folderId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete folder');
      }
      return response;
    },
    onMutate: async (folderId: string) => {
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
      await queryClient.cancelQueries({ queryKey: ['jobs'] });

      const previousFolders = queryClient.getQueriesData({ queryKey: FOLDERS_QUERY_KEYS.all });
      const previousJobs = queryClient.getQueriesData({ queryKey: ['jobs'] });

      // Get folder data to check for associated job
      const allFolders = queryClient.getQueryData<Folder[]>(FOLDERS_QUERY_KEYS.lists());
      const folderToDelete = allFolders?.find(f => f.folderId === folderId);

      // Remove folder optimistically from all queries
      queryClient.setQueriesData(
        { queryKey: FOLDERS_QUERY_KEYS.lists() },
        (old: Folder[] | undefined) => {
          if (!old) return old;
          return old.filter((folder) => folder.folderId !== folderId);
        }
      );

      // If it's a "Cargo" folder, also remove associated job optimistically
      if (folderToDelete && folderToDelete.type === 'Cargo') {
        queryClient.setQueriesData(
          { queryKey: ['jobs'] },
          (old: JobPosting[] | undefined) => {
            if (!old) return old;
            return old.filter((job) => job.title !== folderToDelete.name);
          }
        );
      }

      return { previousFolders, previousJobs, wasCargoFolder: folderToDelete?.type === 'Cargo' };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFolders) {
        context.previousFolders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousJobs) {
        context.previousJobs.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
      // Only invalidate jobs if we deleted a "Cargo" folder (which may have an associated job)
      if (context?.wasCargoFolder) {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      }
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook to delete multiple folders with optimistic updates and cascade delete associated jobs
 */
export const useDeleteFolders = (onSuccess?: () => void, onError?: (error: Error) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderIds: string[]) => {
      // Get folders data from cache to check for "Cargo" types
      const allFolders = queryClient.getQueryData<Folder[]>(FOLDERS_QUERY_KEYS.lists());
      const foldersToDelete = allFolders?.filter(f => folderIds.includes(f.folderId)) || [];

      // Find and delete associated jobs for "Cargo" folders
      const cargoFolders = foldersToDelete.filter(f => f.type === 'Cargo');
      if (cargoFolders.length > 0) {
        // Get all jobs from cache
        const jobsData = queryClient.getQueriesData<JobPosting[]>({ queryKey: ['jobs'] });
        const jobs = jobsData?.[0]?.[1] || [];

        // Delete associated jobs
        const deleteJobPromises = cargoFolders.map(folder => {
          const associatedJob = jobs.find(job => job.title === folder.name);
          if (associatedJob) {
            return jobsService.deleteJob(associatedJob.jobId)
              .then(() => console.log(`✅ Deleted associated job: ${associatedJob.title}`))
              .catch(error => console.error(`Failed to delete job ${associatedJob.title}:`, error));
          }
          return Promise.resolve();
        });

        await Promise.allSettled(deleteJobPromises);
      }

      // Delete the folders
      const response = await FoldersService.deleteFolders(folderIds);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete folders');
      }
      return response;
    },
    onMutate: async (folderIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
      await queryClient.cancelQueries({ queryKey: ['jobs'] });

      const previousFolders = queryClient.getQueriesData({ queryKey: FOLDERS_QUERY_KEYS.all });
      const previousJobs = queryClient.getQueriesData({ queryKey: ['jobs'] });

      // Get folders data to check for associated jobs
      const allFolders = queryClient.getQueryData<Folder[]>(FOLDERS_QUERY_KEYS.lists());
      const foldersToDelete = allFolders?.filter(f => folderIds.includes(f.folderId)) || [];
      const cargoFolderNames = foldersToDelete.filter(f => f.type === 'Cargo').map(f => f.name);

      // Remove folders optimistically from all queries
      queryClient.setQueriesData(
        { queryKey: FOLDERS_QUERY_KEYS.lists() },
        (old: Folder[] | undefined) => {
          if (!old) return old;
          return old.filter((folder) => !folderIds.includes(folder.folderId));
        }
      );

      // Remove associated jobs optimistically
      if (cargoFolderNames.length > 0) {
        queryClient.setQueriesData(
          { queryKey: ['jobs'] },
          (old: JobPosting[] | undefined) => {
            if (!old) return old;
            return old.filter((job) => !cargoFolderNames.includes(job.title));
          }
        );
      }

      return { previousFolders, previousJobs, hasCargoFolders: cargoFolderNames.length > 0 };
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
      if (context?.previousJobs) {
        context.previousJobs.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    },
    onSettled: (_data, _error, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
      // Only invalidate jobs if we deleted "Cargo" folders (which may have associated jobs)
      if (context?.hasCargoFolders) {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      }
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