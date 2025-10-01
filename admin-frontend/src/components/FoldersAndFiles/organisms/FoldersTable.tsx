import React, { useState } from 'react';
import { TableHeader, FolderRow, FileRow, EmptyState } from '../molecules';
import type { 
  FolderRow as FolderRowType, 
  FolderAction, 
  FileAction,
  SelectionEventHandlers 
} from '../types';

interface FoldersTableProps {
  folders: FolderRowType[];
  selectedRows: Set<string>;
  selectedCount: number;
  isAllSelected: boolean;
  showRowActionsMenu: string | null;
  onSelectRow: SelectionEventHandlers['onRowSelect'];
  onSelectFile?: (fileId: string) => void;
  onSelectAll: SelectionEventHandlers['onSelectAll'];
  onRowAction: (folderId: string, action: FolderAction) => void;
  onFileAction?: (fileId: string, action: FileAction) => void;
  onToggleRowActionsMenu: (folderId: string | null) => void;
  onToggleFileActionsMenu?: (fileId: string | null) => void;
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
  selectedCount,
  isAllSelected,
  showRowActionsMenu,
  onSelectRow,
  onSelectFile,
  onSelectAll,
  onRowAction,
  onFileAction,
  onToggleRowActionsMenu,
  onToggleFileActionsMenu,
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
      <FolderRow
        key={folder.id}
        folder={folder}
        isSelected={selectedRows.has(folder.id)}
        showActionsMenu={showRowActionsMenu === folder.id}
        isExpanded={isExpanded}
        subfolderCount={subfolders.length}
        documentCount={folder.files?.length || 0}
        indentLevel={level}
        menuRef={showRowActionsMenu === folder.id ? rowActionsMenuRef : undefined}
        onSelect={onSelectRow}
        onAction={onRowAction}
        onToggleActionsMenu={onToggleRowActionsMenu}
        onToggleExpanded={handleToggleExpanded}
        onNavigateToFolder={onNavigateToFolder}
      />
    );

    // Expanded subfolders
    if (isExpanded && subfolders.length > 0) {
      subfolders.forEach(subfolder => {
        elements.push(...renderFolderWithSubfolders(subfolder, level + 1));
      });
    }

    // Expanded files
    if (isExpanded && folder.files && folder.files.length > 0) {
      folder.files.forEach((file, index) => {
        const isLastFile = index === (folder.files?.length ?? 0) - 1;
        elements.push(
          <div
            key={`file-${file.documentId}`}
          >
            <FileRow
              file={file}
              isSelected={selectedRows.has(file.documentId)}
              showActionsMenu={showRowActionsMenu === file.documentId}
              isLastRow={isLastFile}
              indentLevel={level + 1}
              onSelect={onSelectFile || (() => {})}
              onAction={onFileAction || (() => {})}
              onToggleActionsMenu={onToggleFileActionsMenu || (() => {})}
            />
          </div>
        );
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
      {/* Table Header - Fixed */}
      <TableHeader
        isAllSelected={isAllSelected}
        selectedCount={selectedCount}
        totalCount={folders.length}
        onSelectAll={onSelectAll}
      />

      {/* Table Rows - Scrollable */}
      <div className="overflow-y-auto overflow-x-visible" style={{ maxHeight: 'calc(100vh - 400px)' }}>
        <ul className="overflow-visible">
          {folders.map((folder) => renderFolderWithSubfolders(folder)).flat()}
        </ul>
      </div>
    </div>
  );
};