import React from 'react';
import { Checkbox, FolderIcon, TypeBadge, RowActionsButton } from '../atoms';
import { RowActionsMenu } from './RowActionsMenu';
import { OptimisticState, useFolderOptimisticState, type OptimisticFolder } from '../../../hooks/useFoldersApiOptimistic';
import type { FolderRowProps } from '../types';

interface OptimisticFolderRowProps extends Omit<FolderRowProps, 'folder'> {
  folder: OptimisticFolder;
}

/**
 * Enhanced FolderRow with Optimistic Updates
 * Shows visual feedback during create, update, and delete operations
 */
export const OptimisticFolderRow: React.FC<OptimisticFolderRowProps> = ({
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
  // Get current optimistic state
  const optimisticState = useFolderOptimisticState(folder.folderId);

  // Determine visual states based on optimistic operations
  const isCreating = optimisticState === OptimisticState.CREATING;
  const isUpdating = optimisticState === OptimisticState.UPDATING;
  const isDeleting = optimisticState === OptimisticState.DELETING;
  const isInOptimisticState = optimisticState !== OptimisticState.NONE;

  const handleSelect = (): void => {
    if (isInOptimisticState) return; // Disable selection during operations
    onSelect(folder.folderId);
  };

  const handleToggleActionsMenu = (): void => {
    if (isInOptimisticState) return; // Disable menu during operations
    onToggleActionsMenu(showActionsMenu ? null : folder.folderId);
  };

  const handleDoubleClick = (): void => {
    if (isInOptimisticState || !onNavigateToFolder) return; // Disable navigation during operations
    onNavigateToFolder(folder.folderId);
  };

  const handleToggleExpanded = (): void => {
    if (isInOptimisticState || !onToggleExpanded) return; // Disable expand during operations
    onToggleExpanded(folder.folderId);
  };

  // Dynamic styles based on optimistic state
  const getRowClassName = () => {
    const baseClass = `px-6 py-4 transition-all duration-300 ${!isLastRow ? 'border-b border-gray-200' : ''}`;

    if (isDeleting) {
      return `${baseClass} bg-red-50 opacity-50 scale-98 pointer-events-none`;
    }

    if (isCreating) {
      return `${baseClass} bg-green-50 border-green-200 animate-pulse`;
    }

    if (isUpdating) {
      return `${baseClass} bg-blue-50 border-blue-200`;
    }

    if (isSelected) {
      return `${baseClass} bg-blue-50 hover:bg-blue-100`;
    }

    return `${baseClass} hover:bg-gray-50`;
  };

  // Loading overlay for optimistic states
  const LoadingOverlay = () => {
    if (!isInOptimisticState) return null;

    const getLoadingMessage = () => {
      switch (optimisticState) {
        case OptimisticState.CREATING:
          return 'Creando carpeta...';
        case OptimisticState.UPDATING:
          return 'Actualizando...';
        case OptimisticState.DELETING:
          return 'Eliminando...';
        default:
          return 'Procesando...';
      }
    };

    const getLoadingIcon = () => {
      if (isDeleting) {
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      }

      return (
        <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    };

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
        <div className="flex items-center space-x-2 text-sm font-medium">
          {getLoadingIcon()}
          <span className={isDeleting ? 'text-red-600' : 'text-blue-600'}>
            {getLoadingMessage()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <li className={getRowClassName()} onDoubleClick={handleDoubleClick}>
      <div className="flex items-center w-full relative">
        <LoadingOverlay />

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
                  disabled={isInOptimisticState}
                  className={`p-0.5 rounded transition-all ${
                    isInOptimisticState
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-gray-200 transition-colors'
                  }`}
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

            {/* Folder Icon with state indication */}
            <div className="relative">
              <FolderIcon />
              {isCreating && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">+</span>
                </div>
              )}
              {isUpdating && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">✓</span>
                </div>
              )}
            </div>

            {/* Folder Information */}
            <div className="ml-3 min-w-0 flex-1">
              <p className={`text-sm font-medium truncate transition-colors ${
                isDeleting ? 'text-red-500 line-through' :
                isCreating ? 'text-green-700' :
                isUpdating ? 'text-blue-700' :
                'text-gray-900'
              }`}>
                {folder.name}
                {isCreating && ' (creando...)'}
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
              <RowActionsButton
                onClick={handleToggleActionsMenu}
                disabled={isInOptimisticState}
              />

              <RowActionsMenu
                show={showActionsMenu && !isInOptimisticState}
                folderId={folder.folderId}
                onAction={onAction}
              />
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};