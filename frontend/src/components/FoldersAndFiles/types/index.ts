// Centralized Types for FoldersAndFiles Module
// Following Clean Architecture principles

export interface FolderRow {
  id: string;
  name: string;
  type: string; // Free text type
  createdAt: string;
  parentId?: string;
}

export interface CreateFolderData {
  name: string;
  type: string; // Free text type
}

export interface FoldersState {
  rows: FolderRow[];
  filteredRows: FolderRow[];
  searchTerm: string;
}

export interface SelectionState {
  selectedRows: Set<string>;
  isAllSelected: boolean;
  selectedCount: number;
}

export interface ModalState {
  showCreateModal: boolean;
  showActionsMenu: boolean;
  showRowActionsMenu: string | null;
}

export interface CreateModalFormData {
  folderName: string;
  folderType: string;
}

// Action types for folder operations
export type FolderAction = 'edit' | 'delete';

// Event handler types
export interface FolderEventHandlers {
  onCreateFolder: (data: CreateFolderData) => void;
  onDeleteFolder: (folderId: string) => void;
  onDuplicateFolder: (folderId: string) => void;
  onEditFolder: (folderId: string) => void;
  onDeleteSelected: () => void;
}

export interface SelectionEventHandlers {
  onRowSelect: (rowId: string) => void;
  onSelectAll: () => void;
}

export interface ModalEventHandlers {
  onOpenCreateModal: () => void;
  onCloseCreateModal: () => void;
  onSubmitCreate: (data: CreateFolderData) => void;
}

export interface SearchEventHandlers {
  onSearchChange: (searchTerm: string) => void;
}

// Props interfaces for components
export interface SearchInputProps {
  searchTerm: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface FolderRowProps {
  folder: FolderRow;
  isSelected: boolean;
  showActionsMenu: boolean;
  isLastRow?: boolean;
  onSelect: (folderId: string) => void;
  onAction: (folderId: string, action: FolderAction) => void;
  onToggleActionsMenu: (folderId: string | null) => void;
}

export interface TableHeaderProps {
  isAllSelected: boolean;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
}

export interface ActionsDropdownProps {
  show: boolean;
  selectedCount: number;
  onCreateFolder: () => void;
  onDeleteSelected: () => void;
  onClose: () => void;
}

export interface CreateFolderModalProps {
  show: boolean;
  mode?: 'create' | 'edit';
  formData: CreateModalFormData;
  onFormChange: (data: Partial<CreateModalFormData>) => void;
  onSubmit: (data: CreateFolderData) => void;
  onClose: () => void;
}

export interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

// Hook return types
export interface UseFoldersStateReturn {
  folders: FolderRow[];
  filteredFolders: FolderRow[];
  searchTerm: string;
  createFolder: (data: CreateFolderData) => void;
  deleteFolder: (folderId: string) => void;
  updateFolder: (folderId: string, data: CreateFolderData) => void;
  getFolderById: (folderId: string) => FolderRow | undefined;
  setSearchTerm: (term: string) => void;
}

export interface UseSelectionStateReturn {
  selectedRows: Set<string>;
  selectedCount: number;
  isAllSelected: boolean;
  selectRow: (rowId: string) => void;
  selectAll: (rowIds: string[]) => void;
  clearSelection: () => void;
  deleteSelected: (folders: FolderRow[]) => string[];
}

export interface UseModalStateReturn {
  showCreateModal: boolean;
  modalMode: 'create' | 'edit';
  editingFolderId: string | null;
  showActionsMenu: boolean;
  showRowActionsMenu: string | null;
  showConfirmModal: boolean;
  confirmModalData: {
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  };
  viewMode: 'table' | 'grid';
  formData: CreateModalFormData;
  openCreateModal: () => void;
  openEditModal: (folderId: string, folderName: string, folderType: string) => void;
  closeCreateModal: () => void;
  toggleActionsMenu: () => void;
  setRowActionsMenu: (rowId: string | null) => void;
  updateFormData: (data: Partial<CreateModalFormData>) => void;
  resetFormData: () => void;
  openConfirmModal: (data: {
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }) => void;
  closeConfirmModal: () => void;
  setViewMode: (mode: 'table' | 'grid') => void;
}

export interface UseClickOutsideReturn {
  ref: React.RefObject<HTMLDivElement>;
}

// Utility types
export type FolderOperationType = 'create' | 'edit' | 'delete' | 'duplicate' | 'select' | 'search';

export interface FolderOperation {
  type: FolderOperationType;
  folderId?: string;
  folderData?: CreateFolderData;
  timestamp: string;
  success: boolean;
  error?: string;
}

// Constants
export const FOLDER_OPERATION_MESSAGES = {
  CREATE_SUCCESS: '📁 Nueva estructura de carpeta creada',
  DELETE_SUCCESS: '🗑️ Carpeta eliminada',
  DELETE_MULTIPLE_SUCCESS: '🗑️ Carpetas eliminadas',
  VALIDATION_ERROR: 'Error de validación',
  DELETE_CONFIRMATION: '¿Estás seguro de eliminar',
  NO_SELECTION: 'Por favor selecciona al menos una carpeta para eliminar'
} as const;

export const FORM_VALIDATION = {
  REQUIRED_NAME: 'Por favor ingresa un nombre para la carpeta',
  REQUIRED_TYPE: 'Por favor ingresa un tipo para la carpeta'
} as const;