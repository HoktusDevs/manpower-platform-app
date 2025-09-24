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
    console.log('🗑️ syncJobsAfterMultipleFolderDeletion: Iniciando...');
    console.log('🗑️ Folder IDs:', deletedFolderIds);
    console.log('🗑️ Folder Types:', folderTypes);
    
    try {
      // Filter only "Cargo" type folders
      const cargoFolderIds = deletedFolderIds.filter((_, index) => folderTypes[index] === 'Cargo');
      console.log('🗑️ Carpetas tipo "Cargo" a procesar:', cargoFolderIds);
      
      if (cargoFolderIds.length === 0) {
        console.log('ℹ️ No hay carpetas tipo "Cargo", no se eliminan jobs');
        return;
      }
      
      // Get all jobs to find the ones with matching jobFolderIds
      const jobsResponse = await jobsService.getAllJobs();
      console.log('🗑️ Jobs response:', jobsResponse);
      
      if (jobsResponse.success && jobsResponse.jobs) {
        console.log('🗑️ Total jobs encontrados:', jobsResponse.jobs.length);
        
        // Find all jobs that match the deleted folder IDs
        const jobsToDelete = jobsResponse.jobs.filter(job => 
          job.jobFolderId && cargoFolderIds.includes(job.jobFolderId)
        );
        
        console.log('🗑️ Jobs encontrados para eliminar:', jobsToDelete.length);
        
        if (jobsToDelete.length > 0) {
          // Delete all jobs in parallel
          const deletePromises = jobsToDelete.map(async (job) => {
            console.log('🗑️ Eliminando job:', job.jobId);
            const deleteResponse = await jobsService.deleteJob(job.jobId);
            console.log('🗑️ Delete response para job', job.jobId, ':', deleteResponse);
            return { jobId: job.jobId, success: deleteResponse.success, response: deleteResponse };
          });
          
          const results = await Promise.all(deletePromises);
          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success).length;
          
          console.log(`✅ Jobs eliminados exitosamente: ${successful}`);
          if (failed > 0) {
            console.error(`❌ Jobs con error: ${failed}`);
          }
        } else {
          console.log('⚠️ No se encontraron jobs asociados a las carpetas');
        }
      } else {
        console.error('❌ Error al obtener jobs:', jobsResponse.message);
      }
    } catch (error) {
      console.error('❌ Error en syncJobsAfterMultipleFolderDeletion:', error);
      // Don't throw - this is a non-critical sync operation
    }
  }, []);

  return {
    syncFoldersAfterJobOperation,
    syncJobsAfterFolderDeletion,
    syncJobsAfterMultipleFolderDeletion,
  };
};