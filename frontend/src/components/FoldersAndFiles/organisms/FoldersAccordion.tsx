import { useState } from 'react';
import { Checkbox, FolderIcon, TypeBadge, RowActionsButton } from '../atoms';
import { RowActionsMenu } from '../molecules/RowActionsMenu';
import type { FolderRow, FolderAction } from '../types';

interface FoldersAccordionProps {
  folders: FolderRow[];
  selectedRows: Set<string>;
  showRowActionsMenu: string | null;
  getSubfolders: (parentId: string) => FolderRow[];
  onSelectRow: (rowId: string) => void;
  onAction: (folderId: string, action: FolderAction) => void;
  onToggleRowActionsMenu: (rowId: string | null) => void;
  onNavigateToFolder?: (folderId: string) => void;
}

interface AccordionItemProps {
  folder: FolderRow;
  isSelected: boolean;
  showActionsMenu: boolean;
  subfolders: FolderRow[];
  documentCount?: number;
  onSelect: (folderId: string) => void;
  onAction: (folderId: string, action: FolderAction) => void;
  onToggleActionsMenu: (folderId: string | null) => void;
  onNavigateToFolder?: (folderId: string) => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  folder,
  isSelected,
  showActionsMenu,
  subfolders,
  documentCount = 0,
  onSelect,
  onAction,
  onToggleActionsMenu,
  onNavigateToFolder
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSelect = (): void => {
    onSelect(folder.id);
  };

  const handleToggleActionsMenu = (): void => {
    onToggleActionsMenu(showActionsMenu ? null : folder.id);
  };

  const handleToggleExpanded = (): void => {
    setIsExpanded(!isExpanded);
  };

  const handleNavigateToFolder = (): void => {
    if (onNavigateToFolder) {
      onNavigateToFolder(folder.id);
    }
  };

  return (
    <div className={`border rounded-lg mb-3 ${isSelected ? 'ring-2 ring-indigo-500' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Selection Checkbox */}
            <Checkbox
              checked={isSelected}
              onChange={handleSelect}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />

            {/* Folder Icon */}
            <FolderIcon />

            {/* Folder Name and Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 
                  className="text-sm font-medium text-gray-900 cursor-pointer hover:text-indigo-600"
                  onClick={handleNavigateToFolder}
                >
                  {folder.name}
                </h3>
                <TypeBadge type={folder.type} />
              </div>
              
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                <span>
                  {subfolders.length === 0 ? 'Sin subcarpetas' : `${subfolders.length} subcarpeta${subfolders.length > 1 ? 's' : ''}`}
                </span>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {documentCount === 0 ? 'Sin documentos' : `${documentCount} documento${documentCount > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Expand/Collapse Button */}
            {subfolders.length > 0 && (
              <button
                onClick={handleToggleExpanded}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                aria-label={isExpanded ? 'Contraer' : 'Expandir'}
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}

            {/* Actions Menu */}
            <div className="relative">
              <RowActionsButton onClick={handleToggleActionsMenu} />
              <RowActionsMenu
                show={showActionsMenu}
                folderId={folder.id}
                onAction={onAction}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && subfolders.length > 0 && (
        <div className="px-4 py-3 bg-white border-t border-gray-200 rounded-b-lg">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Subcarpetas ({subfolders.length})
          </h4>
          <div className="space-y-2">
            {subfolders.map((subfolder) => (
              <div 
                key={subfolder.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                onClick={() => onNavigateToFolder?.(subfolder.id)}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <FolderIcon />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{subfolder.name}</p>
                  <p className="text-xs text-gray-500">{subfolder.type}</p>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(subfolder.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * FoldersAccordion Organism
 * Accordion view for displaying folders with expandable content
 */
export const FoldersAccordion: React.FC<FoldersAccordionProps> = ({
  folders,
  selectedRows,
  showRowActionsMenu,
  getSubfolders,
  onSelectRow,
  onAction,
  onToggleRowActionsMenu,
  onNavigateToFolder
}) => {
  if (folders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">No hay carpetas para mostrar</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {folders.map((folder) => {
        const subfolders = getSubfolders(folder.id);
        return (
          <AccordionItem
            key={folder.id}
            folder={folder}
            isSelected={selectedRows.has(folder.id)}
            showActionsMenu={showRowActionsMenu === folder.id}
            subfolders={subfolders}
            documentCount={0} // TODO: Implement document count logic
            onSelect={onSelectRow}
            onAction={onAction}
            onToggleActionsMenu={onToggleRowActionsMenu}
            onNavigateToFolder={onNavigateToFolder}
          />
        );
      })}
    </div>
  );
};