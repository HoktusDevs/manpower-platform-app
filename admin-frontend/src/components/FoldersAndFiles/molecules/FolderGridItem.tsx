import { Checkbox, FolderIcon, TypeBadge, RowActionsButton } from '../atoms';
import { RowActionsMenu } from './RowActionsMenu';
import type { FolderRow, FolderAction } from '../types';

interface FolderGridItemProps {
  folder: FolderRow;
  isSelected: boolean;
  showActionsMenu: boolean;
  subfolderCount: number;
  documentCount?: number;
  isExpanded?: boolean;
  onSelect: (folderId: string) => void;
  onAction: (folderId: string, action: FolderAction) => void;
  onToggleActionsMenu: (folderId: string | null) => void;
  onToggleExpanded?: (folderId: string) => void;
  onNavigateToFolder?: (folderId: string) => void;
}

/**
 * FolderGridItem Molecule
 * Individual folder card for grid view
 * Displays folder as an icon with metadata
 */
export const FolderGridItem: React.FC<FolderGridItemProps> = ({
  folder,
  isSelected,
  showActionsMenu,
  subfolderCount,
  documentCount = 0,
  isExpanded = false,
  onSelect,
  onAction,
  onToggleActionsMenu,
  onToggleExpanded,
  onNavigateToFolder
}) => {
  const handleSelect = (): void => {
    onSelect(folder.id);
  };

  const handleToggleActionsMenu = (): void => {
    onToggleActionsMenu(showActionsMenu ? null : folder.id);
  };

  const handleDoubleClick = (): void => {
    if (onNavigateToFolder) {
      onNavigateToFolder(folder.id);
    }
  };

  const handleToggleExpanded = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (onToggleExpanded) {
      onToggleExpanded(folder.id);
    }
  };

  return (
    <div 
      className={`relative group p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : ''
      }`}
      onDoubleClick={handleDoubleClick}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={isSelected}
          onChange={handleSelect}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </div>

      {/* Actions Menu Button */}
      <div className="absolute top-2 right-2 z-10">
        <div className="relative">
          <RowActionsButton onClick={handleToggleActionsMenu} />
          <RowActionsMenu
            show={showActionsMenu}
            folderId={folder.id}
            onAction={onAction}
          />
        </div>
      </div>

      {/* Folder Content */}
      <div className="flex flex-col items-center text-center">
        {/* Large Folder Icon */}
        <div className="mb-3 scale-150">
          <FolderIcon />
        </div>
        
        {/* Folder Name */}
        <h3 className="text-sm font-medium text-gray-900 mb-1 truncate w-full px-2">
          {folder.name}
        </h3>
        
        {/* Type Badge */}
        <div className="mb-2">
          <TypeBadge type={folder.type} />
        </div>
        
        {/* Subfolder and Document Count */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>
            {subfolderCount === 0 ? 'Sin subcarpetas' : `${subfolderCount} subcarpeta${subfolderCount > 1 ? 's' : ''}`}
          </div>
          <div className="flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {documentCount === 0 ? 'Sin documentos' : `${documentCount} documento${documentCount > 1 ? 's' : ''}`}
          </div>
        </div>

      </div>
    </div>
  );
};