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
  documentCount = 0,
  isExpanded = false,
  indentLevel = 0,
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

  const handleToggleExpanded = (): void => {
    if (onToggleExpanded) {
      onToggleExpanded(folder.id);
    }
  };

  const rowClassName = `px-6 py-4 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''} ${!isLastRow ? 'border-b border-gray-200' : ''}`;

  return (
    <li className={rowClassName} onDoubleClick={handleDoubleClick}>
      <div className="flex items-center w-full">
        {/* Carpeta Column */}
        <div className="flex w-[750px] items-center">
          {/* Checkbox */}
          <Checkbox
            checked={isSelected}
            onChange={handleSelect}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
          />

          {/* Content with indentation */}
          <div className="flex items-center flex-1" style={{ paddingLeft: `${indentLevel * 1.5}rem` }}>
            {/* Expand/Collapse Arrow */}
            <div className="w-4 mr-2">
              {(subfolderCount > 0 || documentCount > 0) ? (
                <button
                  onClick={handleToggleExpanded}
                  className="p-0.5 rounded hover:bg-gray-200 transition-colors"
                  aria-label={isExpanded ? 'Contraer' : 'Expandir'}
                >
                  <svg
                    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="w-4 h-4"></div>
              )}
            </div>

            {/* Folder Icon */}
            <FolderIcon />

            {/* Folder Information */}
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{folder.name}</p>
              <div className="text-sm text-gray-500">
                {documentCount > 0 && `${documentCount} doc${documentCount > 1 ? 's' : ''}.`}
              </div>
            </div>
          </div>
        </div>

        {/* Tipo Column */}
        <div className="w-[200px] text-center">
          <TypeBadge type={folder.type} />
        </div>

        {/* Status Columns */}
        <div className="w-[200px] text-center">
          <span className="text-sm text-gray-600">0</span>
        </div>

        <div className="w-[200px] text-center">
          <span className="text-sm text-gray-600">0</span>
        </div>

        <div className="w-[200px] text-center">
          <span className="text-sm text-gray-600">{documentCount}</span>
        </div>

        <div className="w-[200px] text-center">
          <span className="text-sm text-gray-600">0</span>
        </div>

        <div className="w-[200px] text-center">
          <span className="text-sm text-gray-600">0</span>
        </div>

        {/* Acciones Column */}
        <div className="w-[200px] text-right">
          <div className="flex items-center justify-end">
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
      </div>
    </li>
  );
};