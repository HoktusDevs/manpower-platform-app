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
      <div className="flex items-center justify-between">
        {/* Fixed Checkbox Column */}
        <div className="w-6 flex-shrink-0">
          <Checkbox
            checked={isSelected}
            onChange={handleSelect}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        </div>

        {/* Content Area (indentable) */}
        <div className="flex items-center flex-1 ml-4" style={{ marginLeft: `${16 + (indentLevel * 20)}px` }}>
          {/* Expand/Collapse Arrow */}
          <div className="w-4 mr-2">
            {subfolderCount > 0 ? (
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
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{folder.name}</p>
            <div className="text-sm text-gray-500 space-y-0.5">
              <div className="flex items-center gap-4">
                <span>
                  {subfolderCount === 0 ? 'Sin subcarpetas' : `${subfolderCount} subcarpeta${subfolderCount > 1 ? 's' : ''}`}
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
        </div>
        
        {/* Actions Column */}
        <div className="flex items-center space-x-2 flex-shrink-0">
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