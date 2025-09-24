import { useCallback } from 'react';
import { useFoldersContextOptional } from '../components/FoldersAndFiles/context/FoldersContext';
import { jobsService } from '../services/jobsService';

/**
 * Custom hook for synchronizing folder system with job operations
 * Follows Single Responsibility Principle - handles only sync logic
 * NOTE: Works gracefully whether or not FoldersProvider context is available
 */
export const useFolderJobSync = () => {
  // Get folders context optionally - won't throw if not available
  const foldersContext = useFoldersContextOptional();
  const refreshFolders = foldersContext?.refreshFolders;

  /**
   * Refresh folders after job operations
   * Call this after creating, updating, or deleting jobs that affect folders
   */
  const syncFoldersAfterJobOperation = useCallback(async () => {
    try {
      // Only sync if refreshFolders is available
      if (refreshFolders) {
        await refreshFolders();
      } else {
        }
    } catch (error) {
      // Don't throw - this is a non-critical sync operation
    }
  }, [refreshFolders]);

  /**
   * Sync jobs when a folder is deleted
   * If a "Cargo" type folder is deleted, delete the associated job
   */
  const syncJobsAfterFolderDeletion = useCallback(async (deletedFolderId: string, folderType: string) => {
    try {
      // Only sync if it's a "Cargo" type folder
      if (folderType === 'Cargo') {
        // Get all jobs to find the one with matching jobFolderId
        const jobsResponse = await jobsService.getAllJobs();
        
        if (jobsResponse.success && jobsResponse.jobs) {
          const jobToDelete = jobsResponse.jobs.find(job => 
            job.jobFolderId === deletedFolderId
          );
          
          if (jobToDelete) {
            // Delete the job
            const deleteResponse = await jobsService.deleteJob(jobToDelete.jobId);
            
            if (deleteResponse.success) {
              } else {
              }
          } else {
            }
        }
      }
    } catch (error) {
      // Don't throw - this is a non-critical sync operation
    }
  }, []);

  return {
    syncFoldersAfterJobOperation,
    syncJobsAfterFolderDeletion,
  };
};