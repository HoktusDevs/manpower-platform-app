import { useState } from 'react';
import type { UseModalStateReturn, CreateModalFormData } from '../types';

/**
 * Custom hook to manage modal states
 * Follows Single Responsibility Principle - only handles modal state
 */
export const useModalState = (): UseModalStateReturn => {
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<boolean>(false);
  const [showRowActionsMenu, setShowRowActionsMenu] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'warning'
  });
  const [formData, setFormData] = useState<CreateModalFormData>({
    folderName: '',
    folderType: '',
  });

  /**
   * Open create folder modal
   */
  const openCreateModal = (): void => {
    setModalMode('create');
    setEditingFolderId(null);
    setShowCreateModal(true);
    setShowActionsMenu(false);
    resetFormData();
  };

  /**
   * Open edit folder modal
   */
  const openEditModal = (folderId: string, folderName: string, folderType: string): void => {
    setModalMode('edit');
    setEditingFolderId(folderId);
    setFormData({
      folderName,
      folderType,
    });
    setShowCreateModal(true);
    setShowRowActionsMenu(null);
  };

  /**
   * Close create/edit folder modal
   */
  const closeCreateModal = (): void => {
    setShowCreateModal(false);
    setModalMode('create');
    setEditingFolderId(null);
    resetFormData();
  };

  /**
   * Toggle main actions menu
   */
  const toggleActionsMenu = (): void => {
    setShowActionsMenu(prev => !prev);
  };

  /**
   * Set which row actions menu to show
   */
  const setRowActionsMenu = (rowId: string | null): void => {
    setShowRowActionsMenu(rowId);
  };

  /**
   * Update form data partially
   */
  const updateFormData = (data: Partial<CreateModalFormData>): void => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  /**
   * Reset form data to initial state
   */
  const resetFormData = (): void => {
    setFormData({
      folderName: '',
      folderType: '',
    });
  };

  /**
   * Open confirmation modal with data
   */
  const openConfirmModal = (data: {
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }): void => {
    setConfirmModalData(data);
    setShowConfirmModal(true);
  };

  /**
   * Close confirmation modal
   */
  const closeConfirmModal = (): void => {
    setShowConfirmModal(false);
    setConfirmModalData({
      title: '',
      message: '',
      onConfirm: () => {},
      variant: 'warning'
    });
  };

  return {
    showCreateModal,
    modalMode,
    editingFolderId,
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
    resetFormData,
    openConfirmModal,
    closeConfirmModal,
    setViewMode,
  };
};