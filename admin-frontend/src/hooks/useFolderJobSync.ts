import { useCallback } from 'react';
import { useFoldersContextOptional } from '../components/FoldersAndFiles/context/FoldersContext';
import { jobsService } from '../services/jobsService';

/**
 * Custom hook for synchronizing folder system with job operations
 * Follows Single Responsibility Principle - handles only sync logic
 * NOTE: Works gracefully whether or not FoldersProvider context is available
 */
export const useFolderJobSync = () => {
  const foldersContext = useFoldersContextOptional();
  const refreshFolders = foldersContext?.refreshFolders;

  const syncFoldersAfterJobOperation = useCallback(async () => {
    try {
      if (refreshFolders) {
        await refreshFolders();
      } else {
        // FoldersContext not available - skip folder sync
        console.log('FoldersContext not available, skipping sync');
      }
    } catch {
      // Folder sync failed - not critical, continue
      console.warn('Failed to sync folders after job operation');
    }
  }, [refreshFolders]);

  /**
   * Sync jobs when a folder is deleted
   * If a "Cargo" type folder is deleted, delete the associated job
   */
  const syncJobsAfterFolderDeletion = useCallback(async (deletedFolderId: string, folderType: string) => {
    try {
      if (folderType === 'Cargo') {
        const jobsResponse = await jobsService.getAllJobs();
        
        if (jobsResponse.success && jobsResponse.jobs) {
          
          const jobToDelete = jobsResponse.jobs.find(job => 
            job.jobFolderId === deletedFolderId
          );
          
          if (jobToDelete) {
            const deleteResponse = await jobsService.deleteJob(jobToDelete.jobId);
            if (deleteResponse.success) {
              console.log('✅ Job eliminado exitosamente');
            } else {
              console.error('❌ Error al eliminar job:', deleteResponse.message);
              console.error('❌ Response completa:', deleteResponse);
            }
          } else {
            console.log('⚠️ No se encontró job asociado a la carpeta');
          }
        } else {
          console.error('❌ Error al obtener jobs:', jobsResponse.message);
        }
      } else {
        console.log('ℹ️ No es carpeta tipo "Cargo", no se elimina job');
      }
    } catch (error) {
      console.error('❌ Error en syncJobsAfterFolderDeletion:', error);
      // Don't throw - this is a non-critical sync operation
    }
  }, []);

  /**
   * Sync jobs when multiple folders are deleted
   * If "Cargo" type folders are deleted, delete the associated jobs
   */
  const syncJobsAfterMultipleFolderDeletion = useCallback(async (deletedFolderIds: string[], folderTypes: string[]) => {
    try {
      const cargoFolderIds = deletedFolderIds.filter((_, index) => folderTypes[index] === 'Cargo');
      
      if (cargoFolderIds.length === 0) {
        return;
      }
      
      const jobsResponse = await jobsService.getAllJobs();
      
      if (jobsResponse.success && jobsResponse.jobs) {
        const jobsToDelete = jobsResponse.jobs.filter(job => 
          job.jobFolderId && cargoFolderIds.includes(job.jobFolderId)
        );
 
        if (jobsToDelete.length > 0) {
          const deletePromises = jobsToDelete.map(async (job) => {
            const deleteResponse = await jobsService.deleteJob(job.jobId);
            return { jobId: job.jobId, success: deleteResponse.success, response: deleteResponse };
          });
          
          const results = await Promise.all(deletePromises);
          const failed = results.filter(r => !r.success).length;
          
          if (failed > 0) {
            console.error(`❌ Jobs con error: ${failed}`);
          }
        }
      } else {
        console.error('❌ Error al obtener jobs:', jobsResponse.message);
      }
    } catch (error) {
      console.error('❌ Error en syncJobsAfterMultipleFolderDeletion:', error);
    }
  }, []);

  return {
    syncFoldersAfterJobOperation,
    syncJobsAfterFolderDeletion,
    syncJobsAfterMultipleFolderDeletion,
  };
};