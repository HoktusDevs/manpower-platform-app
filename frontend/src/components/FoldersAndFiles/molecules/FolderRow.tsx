import { Checkbox, FolderIcon, TypeBadge, RowActionsButton } from '../atoms';
import { RowActionsMenu } from './RowActionsMenu';
import type { FolderRowProps } from '../types';

/**
 * FolderRow Molecule
 * Individual row displaying folder information
 * Combines multiple atoms for complete row functionality
 */
export const FolderRow: React.FC<FolderRowProps> = ({
  folder,
  isSelected,
  showActionsMenu,
  isLastRow = false,
  subfolderCount,
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

  const rowClassName = `px-6 py-4 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''} ${!isLastRow ? 'border-b border-gray-200' : ''}`;

  return (
    <li className={rowClassName} onDoubleClick={handleDoubleClick}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          
          {/* Selection Checkbox */}
          <Checkbox
            checked={isSelected}
            onChange={handleSelect}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-4"
          />
          
          {/* Folder Icon */}
          <FolderIcon />
          
          {/* Folder Information */}
          <div>
            <p className="text-sm font-medium text-gray-900">{folder.name}</p>
            <p className="text-sm text-gray-500">
              {subfolderCount === 0 ? 'Sin subcarpetas' : `${subfolderCount} subcarpeta${subfolderCount > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Type Badge */}
          <TypeBadge type={folder.type} />
          
          {/* Row Actions */}
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
    </li>
  );
};