import { ToolbarSection, CreateFolderModal, ConfirmationModal, BreadcrumbNavigation } from '../molecules';
import { FoldersTable } from './FoldersTable';
import { FoldersGrid } from './FoldersGrid';
import { FoldersAccordion } from './FoldersAccordion';
import { 
  useSelectionState, 
  useModalState, 
  useClickOutside 
} from '../hooks';
import { useFoldersContext } from '../context/FoldersContext';
import { FOLDER_OPERATION_MESSAGES } from '../types';
import type { 
  FolderAction, 
  CreateFolderData
} from '../types';

/**
 * FoldersManager Organism
 * Main container orchestrating all folder management functionality
 * Follows Clean Architecture and acts as a controller
 */
export const FoldersManager: React.FC = () => {
  // Custom hooks for state management
  const {
    folders,
    filteredFolders,
    searchTerm,
    isLoading,
    createFolder,
    deleteFolder,
    deleteFolders,
    updateFolder,
    getFolderById,
    getSubfolders,
    navigateToFolder,
    navigateBack,
    navigateToRoot,
    getBreadcrumbPath,
    setSearchTerm,
    refreshFolders,
  } = useFoldersContext();

  const {
    selectedRows,
    selectedCount,
    totalSelectedCount,
    isAllSelected,
    selectRow,
    selectAll,
    deleteSelected,
  } = useSelectionState(filteredFolders, folders);

  const {
    showCreateModal,
    modalMode,
    editingFolderId,
    parentFolderId,
    showActionsMenu,
    showRowActionsMenu,
    showConfirmModal,
    confirmModalData,
    viewMode,
    formData,
    openCreateModal,
    openEditModal,
    closeCreateModal,
    toggleActionsMenu,
    setRowActionsMenu,
    updateFormData,
    openConfirmModal,
    closeConfirmModal,
    setViewMode,
  } = useModalState();

  // Click outside detection hooks
  const actionsMenuRef = useClickOutside<HTMLDivElement>(
    () => toggleActionsMenu(),
    showActionsMenu
  );

  const rowActionsMenuRef = useClickOutside<HTMLDivElement>(
    () => setRowActionsMenu(null),
    showRowActionsMenu !== null
  );

  // Event handlers
  const handleSearchChange = (value: string): void => {
    setSearchTerm(value);
  };

  const handleSelectAll = (): void => {
    const folderIds = filteredFolders.map(folder => folder.id);
    selectAll(folderIds);
  };

  const handleDeleteSelected = (): void => {
    if (totalSelectedCount === 0) {
      alert(FOLDER_OPERATION_MESSAGES.NO_SELECTION);
      return;
    }

    openConfirmModal({
      title: 'Confirmar eliminación',
      message: `${FOLDER_OPERATION_MESSAGES.DELETE_CONFIRMATION} ${totalSelectedCount} carpeta(s) seleccionada(s)?`,
      variant: 'danger',
      onConfirm: async () => {
        const deletedIds = deleteSelected();
        // Close modal immediately after optimistic deletion
        closeConfirmModal();
        // Execute server deletion in background (no await)
        deleteFolders(deletedIds)
          .catch(error => {
            console.error('Error deleting folders:', error);
            // Rollback the optimistic deletion
            refreshFolders();
          });
      }
    });
  };

  const handleRowAction = (folderId: string, action: FolderAction): void => {
    switch (action) {
      case 'create-subfolder': {
        // Open create modal with parent folder set
        console.log('🗂️ Creando subcarpeta para:', folderId);
        openCreateModal(folderId);
        break;
      }
      case 'edit': {
        const folder = getFolderById(folderId);
        if (!folder) return;
        
        openEditModal(folderId, folder.name, folder.type);
        break;
      }
      case 'delete': {
        const folder = folders.find(f => f.id === folderId);
        if (!folder) return;
        
        openConfirmModal({
          title: 'Confirmar eliminación',
          message: `${FOLDER_OPERATION_MESSAGES.DELETE_CONFIRMATION} la carpeta "${folder.name}"?`,
          variant: 'danger',
          onConfirm: () => {
            deleteFolder(folderId);
            // Remove from selection if selected
            if (selectedRows.has(folderId)) {
              selectRow(folderId);
            }
            closeConfirmModal();
          }
        });
        break;
      }
    }
    
    setRowActionsMenu(null);
  };

  const handleCreateSubmit = (data: CreateFolderData): void => {
    if (modalMode === 'edit' && editingFolderId) {
      // Update existing folder
      updateFolder(editingFolderId, data);
    } else {
      // Create new folder (with parent if specified)
      createFolder(data, parentFolderId);
    }
    closeCreateModal();
  };

  const handleCloseActionsMenu = (): void => {
    setRowActionsMenu(null);
  };

  const handleCreateFolder = (): void => {
    openCreateModal(null);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* Toolbar */}
      <ToolbarSection
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        showActionsMenu={showActionsMenu}
        selectedCount={selectedCount}
        viewMode={viewMode}
        onToggleActionsMenu={toggleActionsMenu}
        onCreateFolder={handleCreateFolder}
        onDeleteSelected={handleDeleteSelected}
        onCloseActionsMenu={handleCloseActionsMenu}
        onViewModeChange={setViewMode}
        actionsMenuRef={actionsMenuRef.ref}
      />

      {/* Breadcrumb Navigation */}
      <BreadcrumbNavigation
        breadcrumbPath={getBreadcrumbPath()}
        onNavigateToRoot={navigateToRoot}
        onNavigateToFolder={navigateToFolder}
        onNavigateBack={navigateBack}
      />

      {/* Content View (Table or Grid) */}
      <div className="overflow-visible">
        {isLoading ? (
          // Loading Skeleton - Fixed height container with table structure
          <div className="bg-white overflow-visible py-12">
            <div className="animate-pulse">
              {/* Table Header Skeleton */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-4 h-4 bg-gray-300 rounded"></div>
                    <div className="w-32 h-4 bg-gray-300 rounded"></div>
                  </div>
                  <div className="w-20 h-4 bg-gray-300 rounded"></div>
                </div>
              </div>
              
              {/* Single skeleton row to maintain fixed height */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="w-6 flex-shrink-0">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex items-center flex-1 ml-4">
                    <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
                    <div className="w-8 h-8 bg-blue-200 rounded mr-3"></div>
                    <div>
                      <div className="w-40 h-4 bg-gray-300 rounded mb-2"></div>
                      <div className="w-24 h-3 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div className="w-16 h-5 bg-gray-200 rounded"></div>
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <FoldersTable
            folders={filteredFolders}
            selectedRows={selectedRows}
            selectedCount={selectedCount}
            isAllSelected={isAllSelected}
            showRowActionsMenu={showRowActionsMenu}
            onSelectRow={selectRow}
            onSelectAll={handleSelectAll}
            onRowAction={handleRowAction}
            onToggleRowActionsMenu={setRowActionsMenu}
            rowActionsMenuRef={rowActionsMenuRef.ref}
            onNavigateToFolder={navigateToFolder}
            getSubfolders={getSubfolders}
          />
        ) : viewMode === 'grid' ? (
          <FoldersGrid
            folders={filteredFolders}
            selectedRows={selectedRows}
            showRowActionsMenu={showRowActionsMenu}
            onSelectRow={selectRow}
            onRowAction={handleRowAction}
            onToggleRowActionsMenu={setRowActionsMenu}
            rowActionsMenuRef={rowActionsMenuRef.ref}
            onNavigateToFolder={navigateToFolder}
            getSubfolders={getSubfolders}
          />
        ) : (
          <FoldersAccordion
            folders={filteredFolders}
            selectedRows={selectedRows}
            showRowActionsMenu={showRowActionsMenu}
            onSelectRow={selectRow}
            onAction={handleRowAction}
            onToggleRowActionsMenu={setRowActionsMenu}
            onNavigateToFolder={navigateToFolder}
            getSubfolders={getSubfolders}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <CreateFolderModal
        show={showCreateModal}
        mode={modalMode}
        parentFolderName={parentFolderId ? getFolderById(parentFolderId)?.name : undefined}
        formData={formData}
        onFormChange={updateFormData}
        onSubmit={handleCreateSubmit}
        onClose={closeCreateModal}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        show={showConfirmModal}
        title={confirmModalData.title}
        message={confirmModalData.message}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant={confirmModalData.variant}
        onConfirm={confirmModalData.onConfirm}
        onCancel={closeConfirmModal}
      />
    </div>
  );
};