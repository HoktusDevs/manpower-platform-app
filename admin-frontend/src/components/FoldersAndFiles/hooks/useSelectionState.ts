import { useState, useMemo, useCallback } from 'react';
import type {
  FolderRow,
  DocumentFile,
  UseSelectionStateReturn
} from '../types';

/**
 * Custom hook to manage selection state
 * Follows Single Responsibility Principle - only handles selection logic
 */
export const useSelectionState = (
  filteredFolders: FolderRow[], 
  allFolders: FolderRow[], 
  allFiles: DocumentFile[] = []
): UseSelectionStateReturn => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  /**
   * Get all descendant IDs for a folder
   */
  const getAllDescendants = useCallback((folderId: string): string[] => {
    const children = allFolders.filter(f => f.parentId === folderId);
    let descendants = children.map(c => c.id);
    
    children.forEach(child => {
      descendants = [...descendants, ...getAllDescendants(child.id)];
    });

    return descendants;
  }, [allFolders]);

  // Count of visible folders that are selected (not including hidden descendants)
  // const visibleSelectedCount = useMemo(() => {
  //   return filteredFolders.filter(folder => selectedRows.has(folder.id)).length;
  // }, [filteredFolders, selectedRows]);
  const isAllSelected = useMemo(() => {
    if (filteredFolders.length === 0) return false;
    
    // Check if all visible folders (and their descendants) are selected
    const allRequiredIds = new Set<string>();
    filteredFolders.forEach(folder => {
      allRequiredIds.add(folder.id);
      const descendants = getAllDescendants(folder.id);
      descendants.forEach(id => allRequiredIds.add(id));
    });
    
    // Check if all required IDs are in selectedRows
    for (const id of allRequiredIds) {
      if (!selectedRows.has(id)) {
        return false;
      }
    }
    
    return true;
  }, [filteredFolders, selectedRows, getAllDescendants]);

  /**
   * Toggle selection for a single row (with cascade)
   */
  const selectRow = (rowId: string): void => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      const descendants = getAllDescendants(rowId);
      
      if (newSet.has(rowId)) {
        // Deselect folder and all its descendants
        newSet.delete(rowId);
        descendants.forEach(id => newSet.delete(id));
      } else {
        // Select folder and all its descendants
        newSet.add(rowId);
        descendants.forEach(id => newSet.add(id));
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
      // Include all descendants when selecting all
      const allIdsToSelect = new Set<string>();
      
      rowIds.forEach(folderId => {
        allIdsToSelect.add(folderId);
        const descendants = getAllDescendants(folderId);
        descendants.forEach(id => allIdsToSelect.add(id));
      });
      
      setSelectedRows(allIdsToSelect);
    }
  };

  /**
   * Clear all selections
   */
  const clearSelection = (): void => {
    setSelectedRows(new Set());
  };

  /**
   * Select/deselect a file
   */
  const selectFile = (fileId: string): void => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  /**
   * Get selected files
   */
  const getSelectedFiles = (): DocumentFile[] => {
    return allFiles.filter(file => selectedRows.has(file.documentId));
  };

  /**
   * Get selected folders
   */
  const getSelectedFolders = (): FolderRow[] => {
    return allFolders.filter(folder => selectedRows.has(folder.id));
  };

  /**
   * Delete selected folders and return deleted IDs
   */
  const deleteSelected = (): string[] => {
    if (selectedRows.size === 0) {
      return [];
    }

    const deletedIds = Array.from(selectedRows);
    
    // Clear selection after deletion
    clearSelection();
    
    return deletedIds;
  };

  return {
    selectedRows,
    selectedCount: selectedRows.size, // Use total count to show delete button for all selected items
    totalSelectedCount: selectedRows.size, // Keep total for deletion operations
    isAllSelected,
    selectRow,
    selectAll,
    selectFile,
    getSelectedFiles,
    getSelectedFolders,
    clearSelection,
    deleteSelected,
  };
};