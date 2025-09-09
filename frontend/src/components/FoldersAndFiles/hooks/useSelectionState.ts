import { useState, useMemo } from 'react';
import { FOLDER_OPERATION_MESSAGES } from '../types';
import type { 
  FolderRow, 
  UseSelectionStateReturn
} from '../types';

/**
 * Custom hook to manage selection state
 * Follows Single Responsibility Principle - only handles selection logic
 */
export const useSelectionState = (filteredFolders: FolderRow[]): UseSelectionStateReturn => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Memoized computed values for performance
  const selectedCount = selectedRows.size;
  const isAllSelected = useMemo(() => {
    return filteredFolders.length > 0 && selectedRows.size === filteredFolders.length;
  }, [filteredFolders.length, selectedRows.size]);

  /**
   * Toggle selection for a single row
   */
  const selectRow = (rowId: string): void => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  /**
   * Select/deselect all rows
   */
  const selectAll = (rowIds: string[]): void => {
    if (isAllSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rowIds));
    }
  };

  /**
   * Clear all selections
   */
  const clearSelection = (): void => {
    setSelectedRows(new Set());
  };

  /**
   * Delete selected folders and return deleted IDs
   */
  const deleteSelected = (folders: FolderRow[]): string[] => {
    if (selectedRows.size === 0) {
      return [];
    }

    const deletedIds = Array.from(selectedRows);
    const deletedCount = selectedRows.size;
    const remainingCount = folders.length - selectedRows.size;
    
    // Clear selection after deletion
    clearSelection();
    
    // Console.log for tracking
    console.log(FOLDER_OPERATION_MESSAGES.DELETE_MULTIPLE_SUCCESS, {
      deletedCount,
      deletedIds,
      remainingFolders: remainingCount
    });

    return deletedIds;
  };

  return {
    selectedRows,
    selectedCount,
    isAllSelected,
    selectRow,
    selectAll,
    clearSelection,
    deleteSelected,
  };
};