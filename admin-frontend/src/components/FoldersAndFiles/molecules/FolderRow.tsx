import { Checkbox, FolderIcon, TypeBadge, RowActionsButton } from '../atoms';
import { RowActionsMenu } from './RowActionsMenu';
import { useFoldersContext } from '../context/FoldersContext';
import { useFolderStatusCounts } from '../hooks/useStatusCounts';
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
  // Get optimistic states from context
  const { optimistic, folders } = useFoldersContext();

  // Calculate status counts for this folder (including all subfolders recursively)
  const statusCounts = useFolderStatusCounts(folder.id, folders);

  // Determine if this folder is in an optimistic state
  const isBeingCreated = optimistic.isCreating;
  const isBeingUpdated = optimistic.isUpdating;
  const isBeingDeleted = optimistic.isDeleting;
  const isBatchDeleting = optimistic.isBatchDeleting;

  const isInOptimisticState = isBeingCreated || isBeingUpdated || isBeingDeleted || isBatchDeleting;
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

  // Dynamic row styling based on optimistic state
  const getRowClassName = () => {
    const baseClass = `px-6 py-4 transition-all duration-300 ${!isLastRow ? 'border-b border-gray-200' : ''}`;

    if (isBeingDeleted || isBatchDeleting) {
      return `${baseClass} bg-red-50 opacity-50 scale-98 pointer-events-none`;
    }

    if (isBeingCreated) {
      return `${baseClass} bg-green-50 border-green-200 animate-pulse`;
    }

    if (isBeingUpdated) {
      return `${baseClass} bg-blue-50 border-blue-200`;
    }

    if (isSelected) {
      return `${baseClass} bg-blue-50 hover:bg-blue-100`;
    }

    return `${baseClass} hover:bg-gray-50`;
  };

  return (
    <li className={getRowClassName()} onDoubleClick={isInOptimisticState ? undefined : handleDoubleClick}>
      <div className="flex items-center w-full">
        {/* Carpeta Column */}
        <div className="flex w-[750px] items-center">
          {/* Checkbox */}
          <Checkbox
            checked={isSelected}
            onChange={handleSelect}
            disabled={isInOptimisticState}
            className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2 transition-opacity ${
              isInOptimisticState ? 'opacity-50 cursor-not-allowed' : ''
            }`}
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

            {/* Folder Icon with state indicator */}
            <div className="relative">
              <FolderIcon />
              {isBeingCreated && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">+</span>
                </div>
              )}
              {isBeingUpdated && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">✓</span>
                </div>
              )}
              {(isBeingDeleted || isBatchDeleting) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">×</span>
                </div>
              )}
            </div>

            {/* Folder Information */}
            <div className="ml-3 min-w-0 flex-1">
              <p className={`text-sm font-medium truncate transition-colors ${
                (isBeingDeleted || isBatchDeleting) ? 'text-red-500 line-through' :
                isBeingCreated ? 'text-green-700' :
                isBeingUpdated ? 'text-blue-700' :
                'text-gray-900'
              }`}>
                {folder.name}
                {isBeingCreated && ' (creando...)'}
                {isBeingUpdated && ' (actualizando...)'}
                {(isBeingDeleted || isBatchDeleting) && ' (eliminando...)'}
              </p>
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
        {/* Aprobado */}
        <div className="w-[200px] text-center">
          <span className="text-sm text-gray-600">{statusCounts.approved}</span>
        </div>

        {/* Rechazado */}
        <div className="w-[200px] text-center">
          <span className="text-sm text-gray-600">{statusCounts.rejected}</span>
        </div>

        {/* Pendiente */}
        <div className="w-[200px] text-center">
          <span className="text-sm text-gray-600">{statusCounts.pending}</span>
        </div>

        {/* Por vencer */}
        <div className="w-[200px] text-center">
          <span className="text-sm text-gray-600">{statusCounts.aboutToExpire}</span>
        </div>

        {/* Vencido */}
        <div className="w-[200px] text-center">
          <span className="text-sm text-gray-600">{statusCounts.expired}</span>
        </div>

        {/* Acciones Column */}
        <div className="w-[200px] text-right">
          <div className="flex items-center justify-end">
            {/* Row Actions */}
            <div className="relative">
              <RowActionsButton
                onClick={handleToggleActionsMenu}
                disabled={isInOptimisticState}
              />

              <RowActionsMenu
                show={showActionsMenu && !isInOptimisticState}
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