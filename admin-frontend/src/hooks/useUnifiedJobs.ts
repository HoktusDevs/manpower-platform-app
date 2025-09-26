/**
 * Unified Jobs Hooks
 * React Query hooks for job operations with proper cache synchronization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsService } from '../services/jobsService';
import type { JobPosting, CreateJobInput } from '../services/jobsService';
import type { Folder } from '../services/foldersApiService';

// Query keys factory
export const JOBS_QUERY_KEYS = {
  all: ['jobs'] as const,
  lists: () => [...JOBS_QUERY_KEYS.all, 'list'] as const,
  list: (params?: unknown) => [...JOBS_QUERY_KEYS.lists(), params] as const,
  details: () => [...JOBS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...JOBS_QUERY_KEYS.details(), id] as const,
  published: () => [...JOBS_QUERY_KEYS.all, 'published'] as const,
  byFolder: (folderId: string) => [...JOBS_QUERY_KEYS.all, 'folder', folderId] as const,
  folders: ['folders'] as const,
};

// Helper to generate optimistic IDs
const generateOptimisticId = () => `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Hook to fetch all jobs
 */
export const useGetAllJobs = (params?: unknown) => {
  return useQuery({
    queryKey: JOBS_QUERY_KEYS.list(params),
    queryFn: async () => {
      const response = await jobsService.getAllJobs();
      return response.jobs || [];
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch published jobs
 */
export const useGetPublishedJobs = () => {
  return useQuery({
    queryKey: JOBS_QUERY_KEYS.published(),
    queryFn: async () => {
      const response = await jobsService.getPublishedJobs();
      return response.jobs || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch a single job
 */
export const useGetJob = (jobId: string, enabled = true) => {
  return useQuery({
    queryKey: JOBS_QUERY_KEYS.detail(jobId),
    queryFn: async () => {
      const response = await jobsService.getJob(jobId);
      return response.job;
    },
    enabled: !!jobId && enabled,
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch jobs by folder
 */
export const useGetJobsByFolder = (folderId: string, enabled = true) => {
  return useQuery({
    queryKey: JOBS_QUERY_KEYS.byFolder(folderId),
    queryFn: async () => {
      const response = await jobsService.getJobsByFolder(folderId);
      return response.jobs || [];
    },
    enabled: !!folderId && enabled,
    staleTime: 1000 * 60 * 2,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to create a job with optimistic updates
 */
export const useCreateJob = (onSuccess?: () => void, onError?: (error: Error) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateJobInput) => {
      const response = await jobsService.createJob(input);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create job');
      }
      return response.job;
    },
    onMutate: async (input: CreateJobInput) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: JOBS_QUERY_KEYS.all });

      // Snapshot previous values
      const previousJobs = queryClient.getQueriesData({ queryKey: JOBS_QUERY_KEYS.all });

      // Create optimistic job
      const optimisticJob: JobPosting = {
        jobId: generateOptimisticId(),
        title: input.title,
        description: input.description,
        companyName: input.companyName,
        companyId: input.companyId,
        location: input.location,
        salary: input.salary,
        employmentType: input.employmentType,
        experienceLevel: input.experienceLevel,
        requirements: input.requirements,
        benefits: input.benefits,
        schedule: input.schedule,
        expiresAt: input.expiresAt,
        folderId: input.folderId,
        jobFolderId: input.folderId,
        status: input.status || 'DRAFT',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user',
        requiredDocuments: input.requiredDocuments || [],
      };

      // Update all job queries optimistically
      queryClient.setQueriesData(
        { queryKey: JOBS_QUERY_KEYS.lists() },
        (old: JobPosting[] | undefined) => {
          if (!old) return [optimisticJob];
          return [...old, optimisticJob];
        }
      );

      return { previousJobs, optimisticId: optimisticJob.jobId };
    },
    onSuccess: (data, _variables, context) => {
      // Replace optimistic job with real data
      if (context?.optimisticId && data) {
        queryClient.setQueriesData(
          { queryKey: JOBS_QUERY_KEYS.lists() },
          (old: JobPosting[] | undefined) => {
            if (!old) return old;
            return old.map((job) =>
              job.jobId === context.optimisticId ? data : job
            );
          }
        );
      }
      onSuccess?.();
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousJobs) {
        context.previousJobs.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    },
    onSettled: () => {
      // Invalidate all job queries and folder queries
      queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.folders });
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook to update a job with optimistic updates
 */
export const useUpdateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, input }: { jobId: string; input: Partial<CreateJobInput> }) => {
      const response = await jobsService.updateJob({ jobId, ...input });
      if (!response.success) {
        throw new Error(response.message || 'Failed to update job');
      }
      return response.job;
    },
    onMutate: async ({ jobId, input }) => {
      await queryClient.cancelQueries({ queryKey: JOBS_QUERY_KEYS.all });

      const previousJobs = queryClient.getQueriesData({ queryKey: JOBS_QUERY_KEYS.all });

      // Update all job queries optimistically
      queryClient.setQueriesData(
        { queryKey: JOBS_QUERY_KEYS.lists() },
        (old: JobPosting[] | undefined) => {
          if (!old) return old;
          return old.map((job) =>
            job.jobId === jobId
              ? { ...job, ...input, updatedAt: new Date().toISOString() }
              : job
          );
        }
      );

      return { previousJobs };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousJobs) {
        context.previousJobs.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.folders });
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook to delete a job with optimistic updates and cascade delete associated folder
 */
export const useDeleteJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      // Get the job data from cache to find associated folder
      const allJobs = queryClient.getQueryData<JobPosting[]>(JOBS_QUERY_KEYS.lists());
      const jobToDelete = allJobs?.find(j => j.jobId === jobId);

      // Delete the job first
      const response = await jobsService.deleteJob(jobId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete job');
      }

      // If job found, look for and delete associated "Cargo" folder
      if (jobToDelete) {
        // Get all folders from cache
        const foldersData = queryClient.getQueriesData<Folder[]>({ queryKey: ['folders'] });
        const folders = foldersData?.[0]?.[1] || [];

        // Find folder with matching name and type "Cargo"
        const associatedFolder = folders.find(
          folder => folder.name === jobToDelete.title && folder.type === 'Cargo'
        );

        // Delete the folder if found
        if (associatedFolder) {
          try {
            const { FoldersService } = await import('../services/foldersService');
            await FoldersService.deleteFolder(associatedFolder.folderId);
            console.log(`✅ Deleted associated folder: ${associatedFolder.name}`);
          } catch (error) {
            console.error('Failed to delete associated folder:', error);
            // Continue even if folder deletion fails
          }
        }
      }

      return response;
    },
    onMutate: async (jobId: string) => {
      await queryClient.cancelQueries({ queryKey: JOBS_QUERY_KEYS.all });
      await queryClient.cancelQueries({ queryKey: ['folders'] });

      const previousJobs = queryClient.getQueriesData({ queryKey: JOBS_QUERY_KEYS.all });
      const previousFolders = queryClient.getQueriesData({ queryKey: ['folders'] });

      // Get job data to check for associated folder
      const allJobs = queryClient.getQueryData<JobPosting[]>(JOBS_QUERY_KEYS.lists());
      const jobToDelete = allJobs?.find(j => j.jobId === jobId);

      // Remove job optimistically from all queries
      queryClient.setQueriesData(
        { queryKey: JOBS_QUERY_KEYS.lists() },
        (old: JobPosting[] | undefined) => {
          if (!old) return old;
          return old.filter((job) => job.jobId !== jobId);
        }
      );

      // If job found, also remove associated folder optimistically
      if (jobToDelete) {
        queryClient.setQueriesData(
          { queryKey: ['folders'] },
          (old: Folder[] | undefined) => {
            if (!old) return old;
            return old.filter((folder) =>
              !(folder.name === jobToDelete.title && folder.type === 'Cargo')
            );
          }
        );
      }

      return { previousJobs, previousFolders };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousJobs) {
        context.previousJobs.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousFolders) {
        context.previousFolders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook to delete multiple jobs with optimistic updates and cascade delete associated folders
 */
export const useDeleteJobs = (onSuccess?: () => void, onError?: (error: Error) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobIds: string[]) => {
      // Get jobs data from cache to find associated folders
      const allJobs = queryClient.getQueryData<JobPosting[]>(JOBS_QUERY_KEYS.lists());
      const jobsToDelete = allJobs?.filter(j => jobIds.includes(j.jobId)) || [];

      // Delete jobs using batch endpoint
      const jobsResult = await jobsService.deleteJobs(jobIds);
      if (!jobsResult.success) {
        throw new Error(jobsResult.message || 'Failed to delete jobs');
      }

      // Find and delete associated "Cargo" folders
      if (jobsToDelete.length > 0) {
        // Get all folders from cache
        const foldersData = queryClient.getQueriesData<Folder[]>({ queryKey: ['folders'] });
        const folders = foldersData?.[0]?.[1] || [];

        // Import FoldersService dynamically to avoid circular dependencies
        const { FoldersService } = await import('../services/foldersService');

        // Delete associated folders
        const deleteFolderPromises = jobsToDelete.map(job => {
          const associatedFolder = folders.find(
            folder => folder.name === job.title && folder.type === 'Cargo'
          );
          if (associatedFolder) {
            return FoldersService.deleteFolder(associatedFolder.folderId)
              .then(() => console.log(`✅ Deleted associated folder: ${associatedFolder.name}`))
              .catch(error => console.error(`Failed to delete folder ${associatedFolder.name}:`, error));
          }
          return Promise.resolve();
        });

        await Promise.allSettled(deleteFolderPromises);
      }

      return {
        deletedCount: jobsResult.results?.deletedCount || jobIds.length,
        failedCount: jobsResult.results?.failedCount || 0
      };
    },
    onMutate: async (jobIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: JOBS_QUERY_KEYS.all });
      await queryClient.cancelQueries({ queryKey: ['folders'] });

      const previousJobs = queryClient.getQueriesData({ queryKey: JOBS_QUERY_KEYS.all });
      const previousFolders = queryClient.getQueriesData({ queryKey: ['folders'] });

      // Get jobs data to check for associated folders
      const allJobs = queryClient.getQueryData<JobPosting[]>(JOBS_QUERY_KEYS.lists());
      const jobsToDelete = allJobs?.filter(j => jobIds.includes(j.jobId)) || [];
      const jobTitles = jobsToDelete.map(j => j.title);

      // Remove jobs optimistically from all queries
      queryClient.setQueriesData(
        { queryKey: JOBS_QUERY_KEYS.lists() },
        (old: JobPosting[] | undefined) => {
          if (!old) return old;
          return old.filter((job) => !jobIds.includes(job.jobId));
        }
      );

      // Remove associated folders optimistically
      if (jobTitles.length > 0) {
        queryClient.setQueriesData(
          { queryKey: ['folders'] },
          (old: Folder[] | undefined) => {
            if (!old) return old;
            return old.filter((folder) =>
              !(jobTitles.includes(folder.name) && folder.type === 'Cargo')
            );
          }
        );
      }

      return { previousJobs, previousFolders };
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error, _variables, context) => {
      if (context?.previousJobs) {
        context.previousJobs.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousFolders) {
        context.previousFolders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook to toggle job status (PUBLISHED/PAUSED)
 */
export const useToggleJobStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, newStatus }: { jobId: string; newStatus: 'PUBLISHED' | 'PAUSED' }) => {
      const response = await jobsService.updateJob({ jobId, status: newStatus });
      if (!response.success) {
        throw new Error(response.message || 'Failed to update job status');
      }
      return response.job;
    },
    onMutate: async ({ jobId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: JOBS_QUERY_KEYS.all });

      const previousJobs = queryClient.getQueriesData({ queryKey: JOBS_QUERY_KEYS.all });

      // Update job status optimistically
      queryClient.setQueriesData(
        { queryKey: JOBS_QUERY_KEYS.lists() },
        (old: JobPosting[] | undefined) => {
          if (!old) return old;
          return old.map((job) =>
            job.jobId === jobId
              ? { ...job, status: newStatus, updatedAt: new Date().toISOString() }
              : job
          );
        }
      );

      return { previousJobs };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousJobs) {
        context.previousJobs.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.all });
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook to check service health
 */
export const useJobsHealthCheck = (enabled = true) => {
  return useQuery({
    queryKey: [...JOBS_QUERY_KEYS.all, 'health'],
    queryFn: () => jobsService.checkHealth(),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
};