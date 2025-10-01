import { FolderGridItem, EmptyState } from '../molecules';
import type { 
  FolderRow, 
  FolderAction, 
  SelectionEventHandlers 
} from '../types';
import { useState } from 'react';

interface FoldersGridProps {
  folders: FolderRow[];
  selectedRows: Set<string>;
  showRowActionsMenu: string | null;
  onSelectRow: SelectionEventHandlers['onRowSelect'];
  onRowAction: (folderId: string, action: FolderAction) => void;
  onToggleRowActionsMenu: (folderId: string | null) => void;
  rowActionsMenuRef: React.RefObject<HTMLDivElement | null>;
  onNavigateToFolder: (folderId: string) => void;
  getSubfolders: (parentId: string) => FolderRow[];
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
    <div className="bg-white overflow-visible p-4">
      {/* Grid Container */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {folders.map((folder) => {
          const isExpanded = expandedFolders.has(folder.id);
          const hasFiles = folder.files && folder.files.length > 0;
          
          return (
            <div key={folder.id} className="space-y-2">
              {/* Folder Card */}
              <FolderGridItem
                folder={folder}
                isSelected={selectedRows.has(folder.id)}
                showActionsMenu={showRowActionsMenu === folder.id}
                subfolderCount={getSubfolders(folder.id).length}
                documentCount={folder.files?.length || 0}
                isExpanded={isExpanded}
                menuRef={showRowActionsMenu === folder.id ? rowActionsMenuRef : undefined}
                onSelect={onSelectRow}
                onAction={onRowAction}
                onToggleActionsMenu={onToggleRowActionsMenu}
                onToggleExpanded={handleToggleExpanded}
                onNavigateToFolder={onNavigateToFolder}
              />

              {/* Expanded Files */}
              {isExpanded && hasFiles && (
                <div className="ml-4 space-y-1">
                  {folder.files?.map((file) => (
                    <div 
                      key={file.documentId}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded border text-xs"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="truncate text-gray-700">{file.originalName}</span>
                      <span className="text-gray-400 text-xs">
                        {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};