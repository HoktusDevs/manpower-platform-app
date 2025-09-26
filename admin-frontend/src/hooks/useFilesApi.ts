/**
 * Files API Hooks
 * React Query hooks for file operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FilesService } from '../services/filesService';
import type { File, FilesResponse } from '../services/filesService';

// Query keys factory
export const FILES_QUERY_KEYS = {
  all: ['files'] as const,
  lists: () => [...FILES_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: { limit?: number; nextToken?: string }) =>
    [...FILES_QUERY_KEYS.lists(), filters] as const,
  details: () => [...FILES_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...FILES_QUERY_KEYS.details(), id] as const,
  byFolder: (folderId: string) => [...FILES_QUERY_KEYS.all, 'folder', folderId] as const,
};

/**
 * Hook to fetch files by folder ID
 */
export const useGetFilesByFolder = (folderId: string, limit?: number) => {
  return useQuery({
    queryKey: FILES_QUERY_KEYS.byFolder(folderId),
    queryFn: async () => {
      const response = await FilesService.getFilesByFolder(folderId, limit);
      return response.files || [];
    },
    enabled: !!folderId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch all files
 */
export const useGetAllFiles = (limit?: number, nextToken?: string) => {
  return useQuery({
    queryKey: FILES_QUERY_KEYS.list({ limit, nextToken }),
    queryFn: async () => {
      console.log('🔍 useGetAllFiles: Fetching all files...');
      const response = await FilesService.getAllFiles(limit, nextToken);
      console.log('📄 useGetAllFiles: Response:', response);
      console.log('📊 useGetAllFiles: Files count:', response.files?.length || 0);
      return response.files || [];
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch a single file
 */
export const useGetFile = (fileId: string, enabled = true) => {
  return useQuery({
    queryKey: FILES_QUERY_KEYS.detail(fileId),
    queryFn: async () => {
      const response = await FilesService.getFile(fileId);
      return response;
    },
    enabled: !!fileId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to delete a file
 */
export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      const response = await FilesService.deleteFile(fileId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete file');
      }
      return response;
    },
    onSuccess: (data, fileId) => {
      // Invalidate and refetch files queries
      queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEYS.all });
      
      // Also invalidate folders queries to update file counts
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
};

/**
 * Hook to delete multiple files
 */
export const useDeleteFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileIds: string[]) => {
      const response = await FilesService.deleteFiles(fileIds);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete files');
      }
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch files queries
      queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEYS.all });
      
      // Also invalidate folders queries to update file counts
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
};
