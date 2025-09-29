import React, { useState } from 'react';
import { ToolbarSection, CreateFolderModal, ConfirmationModal, BreadcrumbNavigation } from '../molecules';
import { DocumentPreviewModal } from '../../OCR';
import { UnifiedCreateJobModal } from '../../JobManagement';
import { DownloadProgressComponent } from '../molecules/DownloadProgress';
import { FoldersTable } from './FoldersTable';
import { FoldersGrid } from './FoldersGrid';
import { FoldersAccordion } from './FoldersAccordion';
import { 
  useSelectionState, 
  useModalState, 
  useClickOutside 
} from '../hooks';
import { useDownloadZip } from '../../../hooks/useDownloadZip';
import { useFoldersContext } from '../context/FoldersContext';
import { useDeleteFiles, useUpdateFileDecision } from '../../../hooks/useFilesApi';
import { FOLDER_OPERATION_MESSAGES } from '../types';
// FilterOptions interface defined locally
interface FilterOptions {
  type: 'all' | 'folder' | 'file' | 'level-1' | 'level-2' | 'level-3';
  sortBy: 'name' | 'date' | 'type';
  sortOrder: 'asc' | 'desc';
}
import type { 
  FolderAction, 
  FileAction,
  CreateFolderData,
  FolderRow
} from '../types';

/**
 * FoldersManager Organism
 * Main container orchestrating all folder management functionality
 * Follows Clean Architecture and acts as a controller
 */
export const FoldersManager: React.FC = () => {
  
  // Filter state
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>({
    type: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Job creation modal state
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);

  // File preview modal state
  const [showFilePreviewModal, setShowFilePreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: { name: string; type: string }; previewUrl: string; fileUrl: string; title: string; ownerName: string; status: string; hoktusDecision: string; hoktusProcessingStatus: string; documentType: string; observations: unknown[]; ocrResult?: { success: boolean; text: string; confidence: number; processingTime: number; language: string; metadata: Record<string, unknown>; fields: Record<string, unknown> } } | null>(null);

  // Custom hooks for state management
  const {
    folders,
    filteredFolders,
    searchTerm,
    isLoading,
    getFolderById,
    getSubfolders,
    navigateToFolder,
    navigateBack,
    navigateToRoot,
    getBreadcrumbPath,
    setSearchTerm,
    refreshFolders,
    optimistic
  } = useFoldersContext();

  // Download functionality
  const {
    progress,
    downloadAllContent,
    downloadSelectedItems,
    clearProgress
  } = useDownloadZip();

  // File deletion functionality
  const deleteFilesMutation = useDeleteFiles();

  // Calculate folder level in hierarchy
  const getFolderLevel = (folder: FolderRow, allFolders: FolderRow[]): number => {
    // Root level: no parentId, null parentId, or "ROOT" parentId
    if (!folder.parentId || folder.parentId === "ROOT") return 0;

    const parent = allFolders.find(f => f.id === folder.parentId);
    if (!parent) {
      // Parent not found - treat as root level
      return 0;
    }

    return getFolderLevel(parent, allFolders) + 1;
  };

  // Add level information to folders
  const addLevelInfo = (folders: FolderRow[]) => {
    return folders.map(folder => ({
      ...folder,
      level: getFolderLevel(folder, folders)
    }));
  };

  // Apply filters to the folders
  const applyFilters = (folders: FolderRow[], filters: FilterOptions) => {
    let filtered = [...folders];

    // Add level information to all folders
    const foldersWithLevels = addLevelInfo(filtered);

    // Filter by type
    if (filters.type !== 'all') {
      filtered = foldersWithLevels.filter(folder => {
        switch (filters.type) {
          case 'folder':
            // Root folders (level 0)
            return folder.level === 0;
          case 'level-1':
            // Level 1 subfolders
            return folder.level === 1;
          case 'level-2':
            // Level 2 subfolders
            return folder.level === 2;
          case 'level-3':
            // Level 3 subfolders
            return folder.level === 3;
          case 'file':
            // Files (not implemented yet)
            return false;
          default:
            return true;
        }
      });
    }

    // Sort the results
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  };

  // Get filtered folders based on current filters
  const getFilteredFolders = () => {
    // If filtering by specific levels, show ALL folders (not just current directory)
    const isLevelFilter = currentFilters.type.startsWith('level-');
    
    if (isLevelFilter) {
      // For level filters, use ALL folders, not just current directory
      return applyFilters(folders, currentFilters);
    } else {
      // For other filters, use the current directory filtered folders
      return applyFilters(filteredFolders, currentFilters);
    }
  };

  const finalFilteredFolders = getFilteredFolders();

  // Get all files from folders for selection
  const allFiles = folders.flatMap(folder => folder.files || []);

  const {
    selectedRows,
    selectedCount,
    totalSelectedCount,
    isAllSelected,
    selectRow,
    selectAll,
    selectFile,
    getSelectedFiles,
    getSelectedFolders,
    deleteSelected,
  } = useSelectionState(finalFilteredFolders, folders, allFiles);

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
    const folderIds = finalFilteredFolders.map(folder => folder.id);
    selectAll(folderIds);
  };

  const handleDeleteSelected = (): void => {
    if (totalSelectedCount === 0) {
      alert(FOLDER_OPERATION_MESSAGES.NO_SELECTION);
      return;
    }

    // Get selected items to determine the message
    const selectedFiles = getSelectedFiles();
    const selectedFolders = getSelectedFolders();
    
    let message = '';
    if (selectedFiles.length > 0 && selectedFolders.length > 0) {
      // Both files and folders selected
      message = `${FOLDER_OPERATION_MESSAGES.DELETE_CONFIRMATION} ${selectedFolders.length} carpeta(s) y ${selectedFiles.length} archivo(s) seleccionado(s)?`;
    } else if (selectedFiles.length > 0) {
      // Only files selected
      message = `${FOLDER_OPERATION_MESSAGES.DELETE_CONFIRMATION} ${selectedFiles.length} archivo(s) seleccionado(s)?`;
    } else {
      // Only folders selected (original behavior)
      message = `${FOLDER_OPERATION_MESSAGES.DELETE_CONFIRMATION} ${selectedFolders.length} carpeta(s) seleccionada(s)?`;
    }

    openConfirmModal({
      title: 'Confirmar eliminación',
      message,
      variant: 'danger',
      onConfirm: async () => {
        const selectedFiles = getSelectedFiles();
        const selectedFolders = getSelectedFolders();
        deleteSelected(); // Clear selection state after getting the selections
        
        // Close modal immediately after optimistic deletion
        closeConfirmModal();

        // Execute optimistic deletions for immediate feedback

        // Delete folders if any are selected
        if (selectedFolders.length > 0) {
          // Use optimistic deletion for immediate feedback
          optimistic.deleteFolders(selectedFolders.map(f => f.id));
        }

        // Delete files if any are selected (keep existing logic for files)
        if (selectedFiles.length > 0) {
          deleteFilesMutation.mutateAsync(selectedFiles.map(f => f.documentId))
            .catch(() => {
              console.error('Error deleting files');
              refreshFolders();
            });
        }
      }
    });
  };



  const handleRowAction = (folderId: string, action: FolderAction): void => {
    switch (action) {
      case 'create-subfolder': {
        // Open create modal with parent folder set
        openCreateModal(folderId);
        break;
      }
      case 'create-job': {
        // Open unified create job modal
        setShowCreateJobModal(true);
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
            // Use optimistic deletion for immediate feedback
            optimistic.deleteFolder(folderId);
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

  const handleFileAction = (fileId: string, action: FileAction): void => {
    switch (action) {
      case 'view': {
        // Find the file and open preview modal
        const allFiles = folders.flatMap(folder => folder.files || []);
        const file = allFiles.find(f => f.documentId === fileId);
        if (file) {
          // Convert File to DocumentFile format for the modal
          const documentFile = {
            id: file.documentId,
            file: {
              name: file.originalName,
              type: file.fileType || 'application/pdf'
            },
            previewUrl: file.fileUrl || '',
            fileUrl: file.fileUrl || '',
            title: file.originalName,
            ownerName: 'Usuario Admin', // Default owner name
            status: file.status || 'completed',
            hoktusDecision: file.hoktusDecision || 'PENDING',
            hoktusProcessingStatus: file.hoktusProcessingStatus || 'COMPLETED',
            documentType: file.documentType || 'PDF',
            observations: file.processingResult?.observations || [],
            ocrResult: file.processingResult ? {
              success: true,
              text: file.processingResult.contentAnalysis?.text || '',
              confidence: file.processingResult.contentAnalysis?.confidence_score || 0.95,
              processingTime: file.processingResult.processingTime || 0,
              language: 'es',
              metadata: {},
              fields: file.processingResult.data_structure || {}
            } : undefined
          };
          
          setPreviewFile(documentFile);
          setShowFilePreviewModal(true);
        }
        break;
      }
      case 'download': {
        // TODO: Implement file download functionality
        console.log('Download file:', fileId);
        break;
      }
      case 'delete': {
        // Find the file to get its name for confirmation
        const allFiles = folders.flatMap(folder => folder.files || []);
        const file = allFiles.find(f => f.documentId === fileId);
        if (!file) return;
        
        openConfirmModal({
          title: 'Confirmar eliminación',
          message: `¿Estás seguro de eliminar el archivo "${file.originalName}"?`,
          variant: 'danger',
          onConfirm: async () => {
            try {
              await deleteFilesMutation.mutateAsync([fileId]);
              // Remove from selection if selected
              if (selectedRows.has(fileId)) {
                selectFile(fileId);
              }
              closeConfirmModal();
            } catch (error) {
              console.error('Error deleting file:', error);
            }
          }
        });
        break;
      }
    }
    
    setRowActionsMenu(null);
  };

  // File manual decision handler
  const updateFileDecisionMutation = useUpdateFileDecision();
  
  const handleManualDecision = (fileId: string, decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING'): void => {
    updateFileDecisionMutation.mutate(
      { fileId, hoktusDecision: decision },
      {
        onSuccess: () => {
          console.log(`✅ File ${fileId} decision updated to ${decision}`);
          // Refresh folders to update the UI
          refreshFolders();
        },
        onError: (error) => {
          console.error('❌ Error updating file decision:', error);
        }
      }
    );
  };

  const handleCreateSubmit = (data: CreateFolderData): void => {
    if (modalMode === 'edit' && editingFolderId) {
      // Update existing folder with optimistic feedback
      optimistic.updateFolder(editingFolderId, data);
    } else {
      // Create new folder with optimistic feedback (with parent if specified)
      optimistic.createFolder(data, parentFolderId);
    }
    closeCreateModal();
  };

  const handleCloseActionsMenu = (): void => {
    setRowActionsMenu(null);
  };

  const handleCreateFolder = (): void => {
    openCreateModal(null);
  };

  const handleApplyFilters = (filters: FilterOptions): void => {
    setCurrentFilters(filters);
  };

  const handleDownloadAll = async (): Promise<void> => {
    try {
      await downloadAllContent();
    } catch {
      // El error ya se maneja en el hook
    }
  };

  const handleDownloadSelected = async (): Promise<void> => {
    if (selectedCount === 0) {
      alert('No hay elementos seleccionados para descargar');
      return;
    }
    
    try {
      const selectedIds = Array.from(selectedRows);
      await downloadSelectedItems(selectedIds, folders);
    } catch {
      // El error ya se maneja en el hook
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 w-full max-w-full">
      {/* WebSocket Status */}
      {/* <div className="mb-4 flex justify-end">
        <WebSocketStatus
          isConnected={webSocket.isConnected}
          connectionStatus={webSocket.connectionStatus}
        />
      </div> */}

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
            currentFilters={currentFilters}
            onApplyFilters={handleApplyFilters}
            onDownloadAll={handleDownloadAll}
            onDownloadSelected={handleDownloadSelected}
          />

      {/* Breadcrumb Navigation */}
      <BreadcrumbNavigation
        breadcrumbPath={getBreadcrumbPath()}
        onNavigateToRoot={navigateToRoot}
        onNavigateToFolder={navigateToFolder}
        onNavigateBack={navigateBack}
      />

      {/* Level Filter Indicator */}
      {currentFilters.type.startsWith('level-') && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-blue-800">
              Mostrando todas las carpetas de nivel {currentFilters.type.split('-')[1]} en toda la jerarquía
            </span>
          </div>
        </div>
      )}

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
            folders={finalFilteredFolders}
            selectedRows={selectedRows}
            selectedCount={selectedCount}
            isAllSelected={isAllSelected}
            showRowActionsMenu={showRowActionsMenu}
            onSelectRow={selectRow}
            onSelectFile={selectFile}
            onSelectAll={handleSelectAll}
            onRowAction={handleRowAction}
            onFileAction={handleFileAction}
            onToggleRowActionsMenu={setRowActionsMenu}
            onToggleFileActionsMenu={setRowActionsMenu}
            rowActionsMenuRef={rowActionsMenuRef.ref}
            onNavigateToFolder={navigateToFolder}
            getSubfolders={getSubfolders}
          />
        ) : viewMode === 'grid' ? (
          <FoldersGrid
            folders={finalFilteredFolders}
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
            folders={finalFilteredFolders}
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

      {/* Download Progress Modal */}
      {progress && (
        <DownloadProgressComponent
          progress={progress}
          onClose={clearProgress}
        />
      )}

        {/* Unified Create Job Modal */}
    <UnifiedCreateJobModal
      isOpen={showCreateJobModal}
      onClose={() => setShowCreateJobModal(false)}
      onSuccess={() => {
        setShowCreateJobModal(false);
        // La carga optimista ya maneja la actualización de la UI
      }}
      context="folders-management"
    />

    {/* File Preview Modal */}
    <DocumentPreviewModal
      document={previewFile}
      isOpen={showFilePreviewModal}
      onClose={() => {
        setShowFilePreviewModal(false);
        setPreviewFile(null);
      }}
      onManualDecision={handleManualDecision}
    />
    </div>
  );
};