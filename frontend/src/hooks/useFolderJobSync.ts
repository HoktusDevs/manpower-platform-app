import { useCallback } from 'react';
import { useFoldersContextOptional } from '../components/FoldersAndFiles/context/FoldersContext';

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

  return {
    syncFoldersAfterJobOperation
  };
};