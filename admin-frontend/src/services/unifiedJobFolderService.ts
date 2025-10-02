/**
 * Unified Job-Folder Service
 * Handles atomic operations for jobs and folders with consistent caching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { JobPosting, CreateJobInput } from './jobsService';
import type { Folder, CreateFolderInput, UpdateFolderInput } from './foldersApiService';
import { FOLDERS_QUERY_KEYS } from '../hooks/useUnifiedFolders';

// Unified types
export interface JobWithFolder extends JobPosting {
  folder?: Folder;
}

export interface FolderWithJobs extends Folder {
  jobs?: JobPosting[];
}

export interface CreateJobWithFolderInput {
  job: Omit<CreateJobInput, 'folderId'>;
  folderName?: string;
  parentFolderId?: string;
  skipFolderCreation?: boolean;
}

export interface UnifiedMutationResult {
  job?: JobPosting;
  folder?: Folder;
  success: boolean;
  message: string;
}

// Query keys factory for consistent cache management
// IMPORTANT: Using shared FOLDERS_QUERY_KEYS for cache synchronization
export const UNIFIED_QUERY_KEYS = {
  all: ['unified'] as const,
  jobs: () => [...UNIFIED_QUERY_KEYS.all, 'jobs'] as const,
  jobsList: (params?: unknown) => [...UNIFIED_QUERY_KEYS.jobs(), params ?? {}] as const,
  // Use shared folders keys for cache synchronization
  folders: () => FOLDERS_QUERY_KEYS.all,
  foldersList: () => FOLDERS_QUERY_KEYS.lists(), // Use lists() without params for general queries
  jobFolder: (jobId: string) => [...UNIFIED_QUERY_KEYS.all, 'job-folder', jobId] as const,
};

// API Configuration
const JOBS_BASE_URL = import.meta.env.VITE_JOBS_SERVICE_URL || 'https://pa3itplx4f.execute-api.us-east-1.amazonaws.com/dev';
const FOLDERS_BASE_URL = (import.meta.env.VITE_FOLDERS_API_URL || 'https://83upriwf35.execute-api.us-east-1.amazonaws.com/dev') + '/folders';

// Helper to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('cognito_access_token');
};

// Unified fetch wrapper with consistent error handling
async function unifiedFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text().catch(() => `HTTP error! status: ${response.status}`);
    throw new Error(error);
  }

  return response.json();
}

/**
 * Service class for unified operations
 */
class UnifiedJobFolderService {
  /**
   * Create standalone folder without job creation
   */
  async createStandaloneFolder(folderInput: CreateFolderInput): Promise<UnifiedMutationResult> {
    try {
      const folderResponse = await unifiedFetch<{ success: boolean; folder: Folder; message: string }>(
        `${FOLDERS_BASE_URL}`,
        {
          method: 'POST',
          body: JSON.stringify(folderInput),
        }
      );

      if (!folderResponse.success || !folderResponse.folder) {
        throw new Error(folderResponse.message || 'Failed to create folder');
      }

      return {
        folder: folderResponse.folder,
        success: true,
        message: 'Folder created successfully',
      };
    } catch (error) {
      console.error('Error in createStandaloneFolder:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create folder',
      };
    }
  }

  /**
   * Create job and folder atomically
   */
  async createJobWithFolder(input: CreateJobWithFolderInput): Promise<UnifiedMutationResult> {
    try {
      let folderId: string | undefined;
      let folder: Folder | undefined;

      // Step 1: Create folder if needed
      if (!input.skipFolderCreation) {
        const folderName = input.folderName || input.job.title;
        const folderInput: CreateFolderInput = {
          name: folderName,
          type: 'Cargo',
          parentId: input.parentFolderId,
          metadata: {
            jobTitle: input.job.title,
            companyName: input.job.companyName,
            createdFrom: 'unified-service'
          }
        };

        const folderResponse = await unifiedFetch<{ success: boolean; folder: Folder; message: string }>(
          `${FOLDERS_BASE_URL}`,
          {
            method: 'POST',
            body: JSON.stringify(folderInput),
          }
        );

        if (!folderResponse.success || !folderResponse.folder) {
          throw new Error(folderResponse.message || 'Failed to create folder');
        }

        folder = folderResponse.folder;
        folderId = folder.folderId;
      }

      // Step 2: Create job with folder reference
      const jobInput: CreateJobInput = {
        ...input.job,
        folderId: folderId || input.job.folderId,
      };

      const jobResponse = await unifiedFetch<{ success: boolean; job: JobPosting; message: string }>(
        `${JOBS_BASE_URL}/jobs`,
        {
          method: 'POST',
          body: JSON.stringify(jobInput),
        }
      );

      if (!jobResponse.success) {
        // Rollback: Delete folder if job creation failed
        if (folder && folderId) {
          try {
            await this.deleteFolder(folderId);
          } catch (rollbackError) {
            console.error('Failed to rollback folder creation:', rollbackError);
          }
        }
        throw new Error(jobResponse.message || 'Failed to create job');
      }

      return {
        job: jobResponse.job,
        folder,
        success: true,
        message: 'Job and folder created successfully',
      };
    } catch (error) {
      console.error('Error in createJobWithFolder:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create job and folder',
      };
    }
  }

  /**
   * Update job and optionally its folder
   */
  async updateJobWithFolder(
    jobId: string,
    jobUpdate: Partial<CreateJobInput>,
    folderUpdate?: UpdateFolderInput
  ): Promise<UnifiedMutationResult> {
    try {
      // Update job
      const jobResponse = await unifiedFetch<{ success: boolean; job: JobPosting; message: string }>(
        `${JOBS_BASE_URL}/jobs/${jobId}`,
        {
          method: 'PUT',
          body: JSON.stringify(jobUpdate),
        }
      );

      if (!jobResponse.success) {
        throw new Error(jobResponse.message || 'Failed to update job');
      }

      // Update folder if needed
      let folder: Folder | undefined;
      if (folderUpdate && jobResponse.job.folderId) {
        const folderResponse = await unifiedFetch<{ success: boolean; folder: Folder; message: string }>(
          `${FOLDERS_BASE_URL}/${jobResponse.job.folderId}`,
          {
            method: 'PUT',
            body: JSON.stringify(folderUpdate),
          }
        );

        if (folderResponse.success) {
          folder = folderResponse.folder;
        }
      }

      return {
        job: jobResponse.job,
        folder,
        success: true,
        message: 'Job updated successfully',
      };
    } catch (error) {
      console.error('Error in updateJobWithFolder:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update job',
      };
    }
  }

  /**
   * Delete job and its associated folder
   */
  async deleteJobWithFolder(jobId: string, folderId?: string): Promise<UnifiedMutationResult> {
    try {
      // Delete job first
      const jobResponse = await unifiedFetch<{ success: boolean; message: string }>(
        `${JOBS_BASE_URL}/jobs/${jobId}`,
        {
          method: 'DELETE',
        }
      );

      if (!jobResponse.success) {
        throw new Error(jobResponse.message || 'Failed to delete job');
      }

      // Delete folder if provided
      if (folderId) {
        try {
          await this.deleteFolder(folderId);
        } catch (folderError) {
          console.error('Failed to delete associated folder:', folderError);
          // Don't fail the whole operation if folder deletion fails
        }
      }

      return {
        success: true,
        message: 'Job and folder deleted successfully',
      };
    } catch (error) {
      console.error('Error in deleteJobWithFolder:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete job',
      };
    }
  }

  /**
   * Delete folder and its associated jobs
   */
  async deleteFolderWithJobs(folderId: string): Promise<UnifiedMutationResult> {
    try {
      // First get all jobs in this folder
      const jobsResponse = await unifiedFetch<{ success: boolean; jobs: JobPosting[]; message: string }>(
        `${JOBS_BASE_URL}/jobs/folder/${folderId}`,
        {
          method: 'GET',
        }
      );

      // Delete all jobs first
      if (jobsResponse.success && jobsResponse.jobs?.length > 0) {
        const deletePromises = jobsResponse.jobs.map(job =>
          unifiedFetch(`${JOBS_BASE_URL}/jobs/${job.jobId}`, { method: 'DELETE' })
            .catch(error => console.error(`Failed to delete job ${job.jobId}:`, error))
        );
        await Promise.allSettled(deletePromises);
      }

      // Delete folder
      const folderResponse = await unifiedFetch<{ success: boolean; message: string }>(
        `${FOLDERS_BASE_URL}/${folderId}`,
        {
          method: 'DELETE',
        }
      );

      if (!folderResponse.success) {
        throw new Error(folderResponse.message || 'Failed to delete folder');
      }

      return {
        success: true,
        message: 'Folder and associated jobs deleted successfully',
      };
    } catch (error) {
      console.error('Error in deleteFolderWithJobs:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete folder',
      };
    }
  }

  /**
   * Helper: Delete folder
   */
  private async deleteFolder(folderId: string): Promise<void> {
    await unifiedFetch(`${FOLDERS_BASE_URL}/${folderId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get all jobs with their folder information
   */
  async getJobsWithFolders(): Promise<JobWithFolder[]> {
    const [jobsResponse, foldersResponse] = await Promise.all([
      unifiedFetch<{ success: boolean; jobs: JobPosting[]; message: string }>(`${JOBS_BASE_URL}/jobs`),
      unifiedFetch<{ success: boolean; folders: Folder[]; message: string }>(`${FOLDERS_BASE_URL}`),
    ]);

    if (!jobsResponse.success || !foldersResponse.success) {
      throw new Error('Failed to fetch jobs or folders');
    }

    const folderMap = new Map(
      foldersResponse.folders?.map(f => [f.folderId, f]) || []
    );

    return (jobsResponse.jobs || []).map(job => ({
      ...job,
      folder: job.folderId ? folderMap.get(job.folderId) : undefined,
    }));
  }

  /**
   * Get all folders with their jobs
   */
  async getFoldersWithJobs(): Promise<FolderWithJobs[]> {
    const [foldersResponse, jobsResponse] = await Promise.all([
      unifiedFetch<{ success: boolean; folders: Folder[]; message: string }>(`${FOLDERS_BASE_URL}`),
      unifiedFetch<{ success: boolean; jobs: JobPosting[]; message: string }>(`${JOBS_BASE_URL}/jobs`),
    ]);

    if (!foldersResponse.success || !jobsResponse.success) {
      throw new Error('Failed to fetch folders or jobs');
    }

    const jobsByFolder = (jobsResponse.jobs || []).reduce((acc, job) => {
      if (job.folderId) {
        if (!acc[job.folderId]) {
          acc[job.folderId] = [];
        }
        acc[job.folderId].push(job);
      }
      return acc;
    }, {} as Record<string, JobPosting[]>);

    return (foldersResponse.folders || []).map(folder => ({
      ...folder,
      jobs: jobsByFolder[folder.folderId] || [],
    }));
  }
}

// Export singleton instance
export const unifiedService = new UnifiedJobFolderService();

/**
 * React Query Hooks
 */

/**
 * Hook to create standalone folder without job creation
 */
export function useCreateStandaloneFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (folderInput: CreateFolderInput) => unifiedService.createStandaloneFolder(folderInput),
    onMutate: async (folderInput) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: UNIFIED_QUERY_KEYS.folders() });

      // Snapshot previous values
      const previousFolders = queryClient.getQueryData(UNIFIED_QUERY_KEYS.foldersList());

      // Optimistically update folders cache
      const optimisticFolder = {
        folderId: `temp-folder-${Date.now()}`,
        userId: 'user',
        name: folderInput.name,
        type: folderInput.type,
        parentId: folderInput.parentId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData(UNIFIED_QUERY_KEYS.foldersList(), (old: Folder[] | undefined) => {
        if (!old) return [optimisticFolder];
        return [...old, optimisticFolder];
      });

      return { previousFolders };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousFolders) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.foldersList(), context.previousFolders);
      }
    },
    onSuccess: (data) => {
      // Replace optimistic data with real data
      if (data.success && data.folder) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.foldersList(), (old: Folder[] | undefined) => {
          if (!old) return old;
          const filteredFolders = old.filter((f) => !f.folderId.startsWith('temp-folder-'));
          return [...filteredFolders, data.folder];
        });
      }
    },
    onSettled: () => {
      // Invalidate folders - invalidating 'all' cascades to all child queries
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook to create job with folder atomically
 */
export function useCreateJobWithFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateJobWithFolderInput) => unifiedService.createJobWithFolder(input),
    onMutate: async (input) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: UNIFIED_QUERY_KEYS.all });

      // Snapshot previous values
      const previousJobs = queryClient.getQueryData(UNIFIED_QUERY_KEYS.jobsList());
      const previousFolders = queryClient.getQueryData(UNIFIED_QUERY_KEYS.foldersList());

      // Optimistically update both caches
      const optimisticJob = {
        jobId: `temp-job-${Date.now()}`,
        ...input.job,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'DRAFT' as const,
        isActive: true,
        createdBy: 'user',
      };

      const optimisticFolder = input.skipFolderCreation ? null : {
        folderId: `temp-folder-${Date.now()}`,
        userId: 'user',
        name: input.folderName || `${input.job.companyName} - ${input.job.title}`,
        type: 'Cargo',
        parentId: input.parentFolderId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Update jobs cache
      queryClient.setQueryData(UNIFIED_QUERY_KEYS.jobsList(), (old: JobPosting[] | undefined) => {
        if (!old) return [optimisticJob];
        return [...old, optimisticJob];
      });

      // Update folders cache
      if (optimisticFolder) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.foldersList(), (old: Folder[] | undefined) => {
          if (!old) return [optimisticFolder];
          return [...old, optimisticFolder];
        });
      }

      return { previousJobs, previousFolders };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousJobs) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.jobsList(), context.previousJobs);
      }
      if (context?.previousFolders) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.foldersList(), context.previousFolders);
      }
    },
    onSuccess: (data) => {
      // Replace optimistic data with real data
      if (data.success && data.job) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.jobsList(), (old: JobPosting[] | undefined) => {
          if (!old) return old;
          const filteredJobs = old.filter((j) => !j.jobId.startsWith('temp-job-'));
          return [...filteredJobs, data.job];
        });
      }

      if (data.success && data.folder) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.foldersList(), (old: Folder[] | undefined) => {
          if (!old) return old;
          const filteredFolders = old.filter((f) => !f.folderId.startsWith('temp-folder-'));
          return [...filteredFolders, data.folder];
        });
      }
    },
    onSettled: () => {
      // Invalidate jobs (both unified and legacy keys)
      queryClient.invalidateQueries({ queryKey: UNIFIED_QUERY_KEYS.jobs() });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });

      // Invalidate folders - invalidating 'all' cascades to all child queries
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook to update job with folder
 */
export function useUpdateJobWithFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      jobId,
      jobUpdate,
      folderUpdate,
    }: {
      jobId: string;
      jobUpdate: Partial<CreateJobInput>;
      folderUpdate?: UpdateFolderInput;
    }) => unifiedService.updateJobWithFolder(jobId, jobUpdate, folderUpdate),
    onMutate: async ({ jobId, jobUpdate, folderUpdate }) => {
      await queryClient.cancelQueries({ queryKey: UNIFIED_QUERY_KEYS.all });

      const previousJobs = queryClient.getQueryData(UNIFIED_QUERY_KEYS.jobsList());
      const previousFolders = queryClient.getQueryData(UNIFIED_QUERY_KEYS.foldersList());

      // Optimistically update job
      queryClient.setQueryData(UNIFIED_QUERY_KEYS.jobsList(), (old: JobPosting[] | undefined) => {
        if (!old) return old;
        return old.map((j: JobPosting) =>
          j.jobId === jobId ? { ...j, ...jobUpdate, updatedAt: new Date().toISOString() } : j
        );
      });

      // Optimistically update folder if needed
      if (folderUpdate) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.foldersList(), (old: Folder[] | undefined) => {
          if (!old) return old;
          return old.map((f: Folder) =>
            f.folderId === jobUpdate.folderId
              ? { ...f, ...folderUpdate, updatedAt: new Date().toISOString() }
              : f
          );
        });
      }

      return { previousJobs, previousFolders };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.jobsList(), context.previousJobs);
      }
      if (context?.previousFolders) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.foldersList(), context.previousFolders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: UNIFIED_QUERY_KEYS.jobs() });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.lists() });
    },
  });
}

/**
 * Hook to delete job with folder
 */
export function useDeleteJobWithFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, folderId }: { jobId: string; folderId?: string }) =>
      unifiedService.deleteJobWithFolder(jobId, folderId),
    onMutate: async ({ jobId, folderId }) => {
      await queryClient.cancelQueries({ queryKey: UNIFIED_QUERY_KEYS.all });

      const previousJobs = queryClient.getQueryData(UNIFIED_QUERY_KEYS.jobsList());
      const previousFolders = queryClient.getQueryData(UNIFIED_QUERY_KEYS.foldersList());

      // Optimistically remove job
      queryClient.setQueryData(UNIFIED_QUERY_KEYS.jobsList(), (old: JobPosting[] | undefined) => {
        if (!old) return old;
        return old.filter((j: JobPosting) => j.jobId !== jobId);
      });

      // Optimistically remove folder if provided
      if (folderId) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.foldersList(), (old: Folder[] | undefined) => {
          if (!old) return old;
          return old.filter((f: Folder) => f.folderId !== folderId);
        });
      }

      return { previousJobs, previousFolders };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.jobsList(), context.previousJobs);
      }
      if (context?.previousFolders) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.foldersList(), context.previousFolders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: UNIFIED_QUERY_KEYS.jobs() });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook to delete folder with jobs
 */
export function useDeleteFolderWithJobs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (folderId: string) => unifiedService.deleteFolderWithJobs(folderId),
    onMutate: async (folderId) => {
      await queryClient.cancelQueries({ queryKey: UNIFIED_QUERY_KEYS.all });

      const previousJobs = queryClient.getQueryData(UNIFIED_QUERY_KEYS.jobsList());
      const previousFolders = queryClient.getQueryData(UNIFIED_QUERY_KEYS.foldersList());

      // Optimistically remove folder
      queryClient.setQueryData(UNIFIED_QUERY_KEYS.foldersList(), (old: Folder[] | undefined) => {
        if (!old) return old;
        return old.filter((f: Folder) => f.folderId !== folderId
        );
      });

      // Optimistically remove jobs associated with this folder
      queryClient.setQueryData(UNIFIED_QUERY_KEYS.jobsList(), (old: JobPosting[] | undefined) => {
        if (!old) return old;
        return old.filter((j: JobPosting) => j.folderId !== folderId);
      });

      return { previousJobs, previousFolders };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.jobsList(), context.previousJobs);
      }
      if (context?.previousFolders) {
        queryClient.setQueryData(UNIFIED_QUERY_KEYS.foldersList(), context.previousFolders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: UNIFIED_QUERY_KEYS.jobs() });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook to get jobs with folders
 */
export function useJobsWithFolders() {
  return useQuery({
    queryKey: UNIFIED_QUERY_KEYS.jobsList(),
    queryFn: () => unifiedService.getJobsWithFolders(),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get folders with jobs
 */
export function useFoldersWithJobs() {
  return useQuery({
    queryKey: UNIFIED_QUERY_KEYS.foldersList(),
    queryFn: () => unifiedService.getFoldersWithJobs(),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}