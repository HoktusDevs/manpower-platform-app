import { SearchInput, FilterButton, DownloadButton, ViewToggle } from '../atoms';
import { ActionsDropdown } from './ActionsDropdown';

interface FilterOptions {
  type: 'all' | 'folder' | 'file' | 'level-1' | 'level-2' | 'level-3';
  sortBy: 'name' | 'date' | 'type';
  sortOrder: 'asc' | 'desc';
}

interface ToolbarSectionProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showActionsMenu: boolean;
  selectedCount: number;
  viewMode: 'table' | 'grid' | 'accordion';
  onToggleActionsMenu: () => void;
  onCreateFolder: () => void;
  onDeleteSelected: () => void;
  onCloseActionsMenu: () => void;
  onViewModeChange: (mode: 'table' | 'grid' | 'accordion') => void;
  actionsMenuRef: React.RefObject<HTMLDivElement | null>;
  // Filter props
  currentFilters: FilterOptions;
  onApplyFilters: (filters: FilterOptions) => void;
  // Download props
  onDownloadAll: () => void;
  onDownloadSelected: () => void;
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
  viewMode,
  onToggleActionsMenu,
  onCreateFolder,
  onDeleteSelected,
  onCloseActionsMenu,
  onViewModeChange,
  actionsMenuRef,
  currentFilters,
  onApplyFilters,
  onDownloadAll,
  onDownloadSelected
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
        <ViewToggle 
          currentView={viewMode}
          onViewChange={onViewModeChange}
        />
        
        <FilterButton 
          currentFilters={currentFilters}
          onApplyFilters={onApplyFilters}
        />
        
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
        
            <DownloadButton 
              selectedCount={selectedCount}
              hasSelection={selectedCount > 0}
              onDownloadAll={onDownloadAll}
              onDownloadSelected={onDownloadSelected}
            />
      </div>
    </div>
  );
};