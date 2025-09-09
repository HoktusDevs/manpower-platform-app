import { FolderGridItem, EmptyState } from '../molecules';
import type { 
  FolderRow, 
  FolderAction, 
  SelectionEventHandlers 
} from '../types';

interface FoldersGridProps {
  folders: FolderRow[];
  selectedRows: Set<string>;
  showRowActionsMenu: string | null;
  onSelectRow: SelectionEventHandlers['onRowSelect'];
  onRowAction: (folderId: string, action: FolderAction) => void;
  onToggleRowActionsMenu: (folderId: string | null) => void;
  rowActionsMenuRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * FoldersGrid Organism
 * Grid layout for displaying folders as icons
 * Alternative to table view for visual browsing
 */
export const FoldersGrid: React.FC<FoldersGridProps> = ({
  folders,
  selectedRows,
  showRowActionsMenu,
  onSelectRow,
  onRowAction,
  onToggleRowActionsMenu,
  rowActionsMenuRef
}) => {
  // Empty state
  if (folders.length === 0) {
    return (
      <EmptyState
        title="No hay carpetas o archivos creados"
        description="Usa el botón 'Acciones' para crear una nueva carpeta"
      />
    );
  }

  return (
    <div className="bg-white shadow overflow-visible sm:rounded-md p-4">
      {/* Grid Container */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {folders.map((folder) => (
          <div 
            key={folder.id}
            ref={showRowActionsMenu === folder.id ? rowActionsMenuRef : null}
          >
            <FolderGridItem
              folder={folder}
              isSelected={selectedRows.has(folder.id)}
              showActionsMenu={showRowActionsMenu === folder.id}
              onSelect={onSelectRow}
              onAction={onRowAction}
              onToggleActionsMenu={onToggleRowActionsMenu}
            />
          </div>
        ))}
      </div>
    </div>
  );
};