import React, { useState } from 'react';
import { TableHeader, FolderRow, EmptyState } from '../molecules';
import type { 
  FolderRow as FolderRowType, 
  FolderAction, 
  SelectionEventHandlers 
} from '../types';

interface FoldersTableProps {
  folders: FolderRowType[];
  selectedRows: Set<string>;
  isAllSelected: boolean;
  showRowActionsMenu: string | null;
  onSelectRow: SelectionEventHandlers['onRowSelect'];
  onSelectAll: SelectionEventHandlers['onSelectAll'];
  onRowAction: (folderId: string, action: FolderAction) => void;
  onToggleRowActionsMenu: (folderId: string | null) => void;
  rowActionsMenuRef: React.RefObject<HTMLDivElement | null>;
  onNavigateToFolder: (folderId: string) => void;
  getSubfolders: (parentId: string) => FolderRowType[];
}

/**
 * FoldersTable Organism
 * Complete table component with header, rows, and empty state
 * Combines multiple molecules for full table functionality
 */
export const FoldersTable: React.FC<FoldersTableProps> = ({
  folders,
  selectedRows,
  isAllSelected,
  showRowActionsMenu,
  onSelectRow,
  onSelectAll,
  onRowAction,
  onToggleRowActionsMenu,
  rowActionsMenuRef,
  onNavigateToFolder,
  getSubfolders
}) => {
  // State to track expanded folders
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const handleToggleExpanded = (folderId: string): void => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };
  
  // Function to render folder and its expanded subfolders recursively
  const renderFolderWithSubfolders = (folder: FolderRowType, level = 0): React.JSX.Element[] => {
    const isExpanded = expandedFolders.has(folder.id);
    const subfolders = getSubfolders(folder.id);
    const elements: React.JSX.Element[] = [];
    
    // Main folder row
    elements.push(
      <div 
        key={folder.id} 
        ref={showRowActionsMenu === folder.id ? rowActionsMenuRef : null}
      >
        <FolderRow
          folder={folder}
          isSelected={selectedRows.has(folder.id)}
          showActionsMenu={showRowActionsMenu === folder.id}
          isExpanded={isExpanded}
          subfolderCount={subfolders.length}
          indentLevel={level}
          onSelect={onSelectRow}
          onAction={onRowAction}
          onToggleActionsMenu={onToggleRowActionsMenu}
          onToggleExpanded={handleToggleExpanded}
          onNavigateToFolder={onNavigateToFolder}
        />
      </div>
    );
    
    // Expanded subfolders
    if (isExpanded && subfolders.length > 0) {
      subfolders.forEach(subfolder => {
        elements.push(...renderFolderWithSubfolders(subfolder, level + 1));
      });
    }
    
    return elements;
  };

  // Empty state
  if (folders.length === 0) {
    return (
      <EmptyState
        title="No hay carpetas o archivos creados"
        description="Usa el botón 'Acciones' para crear una nueva fila"
      />
    );
  }

  return (
    <div className="bg-white overflow-visible">
      {/* Table Header */}
      <TableHeader
        isAllSelected={isAllSelected}
        selectedCount={selectedRows.size}
        totalCount={folders.length}
        onSelectAll={onSelectAll}
      />
      
      {/* Table Rows */}
      <ul>
        {folders.map((folder) => renderFolderWithSubfolders(folder)).flat()}
      </ul>
    </div>
  );
};