import { Checkbox, FolderIcon, TypeBadge, RowActionsButton } from '../atoms';
import { RowActionsMenu } from './RowActionsMenu';
import type { FolderRow, FolderAction } from '../types';

interface FolderGridItemProps {
  folder: FolderRow;
  isSelected: boolean;
  showActionsMenu: boolean;
  onSelect: (folderId: string) => void;
  onAction: (folderId: string, action: FolderAction) => void;
  onToggleActionsMenu: (folderId: string | null) => void;
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
  onSelect,
  onAction,
  onToggleActionsMenu,
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

  return (
    <div 
      className={`relative group p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50 ring-2 ring-indigo-500' : ''
      }`}
      onDoubleClick={handleDoubleClick}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={isSelected}
          onChange={handleSelect}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
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
        
        {/* Created Date */}
        <p className="text-xs text-gray-500">
          {new Date(folder.createdAt).toLocaleDateString('es-ES')}
        </p>
      </div>
    </div>
  );
};