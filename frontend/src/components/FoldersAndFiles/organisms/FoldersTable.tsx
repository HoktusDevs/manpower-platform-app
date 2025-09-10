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
  onNavigateToFolder
}) => {
  // Simple folder rendering - no hierarchy needed for Windows-style navigation

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
        {folders.map((folder, index) => (
          <div 
            key={folder.id} 
            ref={showRowActionsMenu === folder.id ? rowActionsMenuRef : null}
          >
            <FolderRow
              folder={folder}
              isSelected={selectedRows.has(folder.id)}
              showActionsMenu={showRowActionsMenu === folder.id}
              isLastRow={index === folders.length - 1}
              onSelect={onSelectRow}
              onAction={onRowAction}
              onToggleActionsMenu={onToggleRowActionsMenu}
              onNavigateToFolder={onNavigateToFolder}
            />
          </div>
        ))}
      </ul>
    </div>
  );
};