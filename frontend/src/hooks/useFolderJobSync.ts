import { useCallback } from 'react';
import { useFoldersContext } from '../components/FoldersAndFiles/context/FoldersContext';

/**
 * Custom hook for synchronizing folder system with job operations
 * Follows Single Responsibility Principle - handles only sync logic
 * NOTE: Must be used within a FoldersProvider context
 */
export const useFolderJobSync = () => {
  const { refreshFolders } = useFoldersContext();

  /**
   * Refresh folders after job operations
   * Call this after creating, updating, or deleting jobs that affect folders
   */
  const syncFoldersAfterJobOperation = useCallback(async () => {
    try {
      // Trigger folder refresh to update any job counts or related data
      await refreshFolders();
    } catch (error) {
      console.warn('Failed to sync folders after job operation:', error);
      // Don't throw - this is a non-critical sync operation
    }
  }, [refreshFolders]);

  return {
    syncFoldersAfterJobOperation
  };
};