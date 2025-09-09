import { SearchInput, FilterButton, DownloadButton } from '../atoms';
import { ActionsDropdown } from './ActionsDropdown';

interface ToolbarSectionProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showActionsMenu: boolean;
  selectedCount: number;
  onToggleActionsMenu: () => void;
  onCreateFolder: () => void;
  onDeleteSelected: () => void;
  onCloseActionsMenu: () => void;
  actionsMenuRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * ToolbarSection Molecule
 * Combines search, filter, actions and download functionality
 * Follows Composition over Inheritance principle
 */
export const ToolbarSection: React.FC<ToolbarSectionProps> = ({
  searchTerm,
  onSearchChange,
  showActionsMenu,
  selectedCount,
  onToggleActionsMenu,
  onCreateFolder,
  onDeleteSelected,
  onCloseActionsMenu,
  actionsMenuRef
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
      {/* Search Input */}
      <SearchInput
        searchTerm={searchTerm}
        onChange={onSearchChange}
      />
      
      {/* Action Buttons */}
      <div className="flex gap-3 w-full sm:w-auto">
        <FilterButton />
        
        <div className="relative" ref={actionsMenuRef}>
          <button 
            onClick={onToggleActionsMenu}
            className="flex-1 sm:flex-none inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
            Acciones
          </button>
          
          <ActionsDropdown
            show={showActionsMenu}
            selectedCount={selectedCount}
            onCreateFolder={onCreateFolder}
            onDeleteSelected={onDeleteSelected}
            onClose={onCloseActionsMenu}
          />
        </div>
        
        <DownloadButton />
      </div>
    </div>
  );
};