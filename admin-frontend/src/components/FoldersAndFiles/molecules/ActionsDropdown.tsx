import type { ActionsDropdownProps } from '../types';

/**
 * ActionsDropdown Molecule
 * Dropdown menu for main actions
 * Follows Single Responsibility Principle
 */
export const ActionsDropdown: React.FC<ActionsDropdownProps> = ({
  show,
  selectedCount,
  onCreateFolder,
  onDeleteSelected,
}) => {
  if (!show) return null;

  return (
    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
      <div className="py-1">
        <button
          onClick={onCreateFolder}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Crear Nueva Fila/Carpeta
        </button>
        
        {selectedCount > 0 && (
          <button
            onClick={onDeleteSelected}
            className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
          >
            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar Seleccionadas ({selectedCount})
          </button>
        )}
      </div>
    </div>
  );
};