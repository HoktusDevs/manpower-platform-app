/**
 * Optimistic Toast Hook
 * Provides immediate feedback for optimistic operations
 */

import { useCallback } from 'react';

interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'loading';
  message: string;
  duration?: number;
}

// Simple toast manager (you can replace this with your preferred toast library)
class ToastManager {
  private toasts: Toast[] = [];
  private listeners: ((toasts: Toast[]) => void)[] = [];

  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  show(toast: Omit<Toast, 'id'>) {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { ...toast, id };

    this.toasts.push(newToast);
    this.notify();

    if (toast.duration !== Infinity) {
      setTimeout(() => {
        this.remove(id);
      }, toast.duration || 3000);
    }

    return id;
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  update(id: string, updates: Partial<Omit<Toast, 'id'>>) {
    this.toasts = this.toasts.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    this.notify();
  }

  clear() {
    this.toasts = [];
    this.notify();
  }
}

const toastManager = new ToastManager();

/**
 * Hook for optimistic toast notifications
 */
export const useOptimisticToast = () => {
  const showOptimisticSuccess = useCallback((message: string, options?: ToastOptions) => {
    return toastManager.show({
      type: 'success',
      message,
      duration: options?.duration || 2000,
    });
  }, []);

  const showOptimisticError = useCallback((message: string, options?: ToastOptions) => {
    return toastManager.show({
      type: 'error',
      message,
      duration: options?.duration || 4000,
    });
  }, []);

  const showOptimisticLoading = useCallback((message: string) => {
    return toastManager.show({
      type: 'loading',
      message,
      duration: Infinity, // Loading toasts don't auto-dismiss
    });
  }, []);

  const showOptimisticInfo = useCallback((message: string, options?: ToastOptions) => {
    return toastManager.show({
      type: 'info',
      message,
      duration: options?.duration || 3000,
    });
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
    toastManager.update(id, updates);
  }, []);

  const removeToast = useCallback((id: string) => {
    toastManager.remove(id);
  }, []);

  const clearAllToasts = useCallback(() => {
    toastManager.clear();
  }, []);

  return {
    showSuccess: showOptimisticSuccess,
    showError: showOptimisticError,
    showLoading: showOptimisticLoading,
    showInfo: showOptimisticInfo,
    update: updateToast,
    remove: removeToast,
    clear: clearAllToasts,
  };
};

/**
 * Hook for folder operation toasts with predefined messages
 */
export const useFolderOptimisticToasts = () => {
  const toast = useOptimisticToast();

  const createFolder = useCallback((folderName: string) => {
    const loadingId = toast.showLoading(`Creando carpeta "${folderName}"...`);

    return {
      onSuccess: () => {
        toast.update(loadingId, {
          type: 'success',
          message: `Carpeta "${folderName}" creada exitosamente`,
          duration: 2000,
        });
      },
      onError: (error: Error) => {
        toast.update(loadingId, {
          type: 'error',
          message: `Error al crear carpeta "${folderName}": ${error.message}`,
          duration: 4000,
        });
      },
    };
  }, [toast]);

  const updateFolder = useCallback((folderName: string) => {
    const loadingId = toast.showLoading(`Actualizando carpeta "${folderName}"...`);

    return {
      onSuccess: () => {
        toast.update(loadingId, {
          type: 'success',
          message: `Carpeta "${folderName}" actualizada exitosamente`,
          duration: 2000,
        });
      },
      onError: (error: Error) => {
        toast.update(loadingId, {
          type: 'error',
          message: `Error al actualizar carpeta "${folderName}": ${error.message}`,
          duration: 4000,
        });
      },
    };
  }, [toast]);

  const deleteFolder = useCallback((folderName: string) => {
    const loadingId = toast.showLoading(`Eliminando carpeta "${folderName}"...`);

    return {
      onSuccess: () => {
        toast.update(loadingId, {
          type: 'success',
          message: `Carpeta "${folderName}" eliminada exitosamente`,
          duration: 2000,
        });
      },
      onError: (error: Error) => {
        toast.update(loadingId, {
          type: 'error',
          message: `Error al eliminar carpeta "${folderName}": ${error.message}`,
          duration: 4000,
        });
      },
    };
  }, [toast]);

  const deleteFolders = useCallback((count: number) => {
    const loadingId = toast.showLoading(`Eliminando ${count} carpeta${count > 1 ? 's' : ''}...`);

    return {
      onSuccess: () => {
        toast.update(loadingId, {
          type: 'success',
          message: `${count} carpeta${count > 1 ? 's' : ''} eliminada${count > 1 ? 's' : ''} exitosamente`,
          duration: 2000,
        });
      },
      onError: (error: Error) => {
        toast.update(loadingId, {
          type: 'error',
          message: `Error al eliminar carpetas: ${error.message}`,
          duration: 4000,
        });
      },
    };
  }, [toast]);

  return {
    createFolder,
    updateFolder,
    deleteFolder,
    deleteFolders,
  };
};

// Export the toast manager for advanced usage
export { toastManager };