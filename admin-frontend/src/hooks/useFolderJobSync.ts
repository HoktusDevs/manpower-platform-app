import { useCallback } from 'react';
import { useFoldersContextOptional } from '../components/FoldersAndFiles/context/FoldersContext';
import { jobsService } from '../services/jobsService';
import { FoldersService } from '../services/graphql/folders/FoldersService';

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
        console.debug('Skipping folder sync - FoldersProvider not available');
      }
    } catch (error) {
      console.warn('Failed to sync folders after job operation:', error);
      // Don't throw - this is a non-critical sync operation
    }
  }, [refreshFolders]);

  /**
   * Delete folders associated with a job when the job is deleted
   * This ensures that job-related folders are automatically cleaned up
   */
  const deleteFoldersForJob = useCallback(async (job: any) => {
    try {
      console.log('Deleting folders for job:', job.jobId);
      
      // Get all folders to find job-related ones
      const allFolders = await FoldersService.getAllFolders();
      
      // Find folders related to this job
      const jobRelatedFolders = allFolders.filter((folder: any) => {
        // Check if folder name contains job title or company
        const folderName = folder.name.toLowerCase();
        const jobTitle = job.title.toLowerCase();
        const companyName = job.companyName.toLowerCase();
        
        return folderName.includes(jobTitle) || 
               folderName.includes(companyName) ||
               folder.jobFolderId === job.jobId;
      });
      
      console.log('Found job-related folders to delete:', jobRelatedFolders);
      
      // Delete each related folder
      for (const folder of jobRelatedFolders) {
        try {
          await FoldersService.deleteFolder(folder.folderId);
          console.log('Successfully deleted folder:', folder.name);
        } catch (error) {
          console.warn('Error deleting folder:', folder.name, error);
        }
      }
      
    } catch (error) {
      console.warn('Failed to delete folders for job:', error);
      // Don't throw - this is a non-critical cleanup operation
    }
  }, []);

  /**
   * Sync jobs when a folder is deleted
   * If a "Cargo" type folder is deleted, delete the associated job
   */
  const syncJobsAfterFolderDeletion = useCallback(async (deletedFolderId: string, folderType: string) => {
    try {
      // Only sync if it's a "Cargo" type folder
      if (folderType === 'Cargo') {
        console.log('Carpeta de tipo "Cargo" eliminada, buscando job asociado...', deletedFolderId);
        
        // Get all jobs to find the one with matching jobFolderId
        const jobsResponse = await jobsService.getAllJobs();
        
        if (jobsResponse.success && jobsResponse.jobs) {
          const jobToDelete = jobsResponse.jobs.find(job => 
            job.jobFolderId === deletedFolderId
          );
          
          if (jobToDelete) {
            console.log('Job encontrado para eliminar:', jobToDelete.jobId);
            
            // Delete the job
            const deleteResponse = await jobsService.deleteJob(jobToDelete.jobId);
            
            if (deleteResponse.success) {
              console.log('Job eliminado exitosamente:', jobToDelete.jobId);
            } else {
              console.error('Error eliminando job:', deleteResponse.message);
            }
          } else {
            console.log('No se encontró job asociado a la carpeta eliminada');
          }
        }
      }
    } catch (error) {
      console.warn('Failed to sync jobs after folder deletion:', error);
      // Don't throw - this is a non-critical sync operation
    }
  }, []);

  return {
    syncFoldersAfterJobOperation,
    syncJobsAfterFolderDeletion,
    deleteFoldersForJob
  };
};