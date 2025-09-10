import { ToolbarSection, CreateFolderModal, ConfirmationModal, BreadcrumbNavigation } from '../molecules';
import { FoldersTable } from './FoldersTable';
import { FoldersGrid } from './FoldersGrid';
import { 
  useFoldersState, 
  useSelectionState, 
  useModalState, 
  useClickOutside 
} from '../hooks';
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
    createFolder,
    deleteFolder,
    updateFolder,
    getFolderById,
    getSubfolders,
    navigateToFolder,
    navigateBack,
    navigateToRoot,
    getBreadcrumbPath,
    setSearchTerm,
  } = useFoldersState();

  const {
    selectedRows,
    selectedCount,
    isAllSelected,
    selectRow,
    selectAll,
    deleteSelected,
  } = useSelectionState(filteredFolders);

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
    () => setRowActionsMenu(null),
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
    if (selectedCount === 0) {
      alert(FOLDER_OPERATION_MESSAGES.NO_SELECTION);
      return;
    }

    openConfirmModal({
      title: 'Confirmar eliminación',
      message: `${FOLDER_OPERATION_MESSAGES.DELETE_CONFIRMATION} ${selectedCount} carpeta(s) seleccionada(s)?`,
      variant: 'danger',
      onConfirm: () => {
        const deletedIds = deleteSelected(folders);
        // Remove from folders state
        deletedIds.forEach(id => deleteFolder(id));
        closeConfirmModal();
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
        {viewMode === 'table' ? (
          <FoldersTable
            folders={filteredFolders}
            selectedRows={selectedRows}
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
        ) : (
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