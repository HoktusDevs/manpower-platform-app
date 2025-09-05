import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Toast } from './Toast';
import { ToastContext, type ToastData, type ToastContextValue } from './ToastContext';

interface ToastProviderProps {
  readonly children: ReactNode;
  readonly defaultPosition?: ToastData['position'];
  readonly maxToasts?: number;
}

export function ToastProvider({ 
  children, 
  defaultPosition = 'top-right',
  maxToasts = 5 
}: ToastProviderProps): ReactNode {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const generateId = useCallback((): string => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showToast = useCallback((toastData: Omit<ToastData, 'id'>): string => {
    const id = generateId();
    const newToast: ToastData = {
      id,
      position: defaultPosition,
      duration: 5000,
      closable: true,
      ...toastData
    };

    setToasts(current => {
      const updated = [newToast, ...current];
      return updated.slice(0, maxToasts);
    });

    return id;
  }, [generateId, defaultPosition, maxToasts]);

  const hideToast = useCallback((id: string): void => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, message?: string): string => {
    return showToast({ variant: 'success', title, message });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string): string => {
    return showToast({ variant: 'error', title, message, duration: 7000 });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string): string => {
    return showToast({ variant: 'warning', title, message, duration: 6000 });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string): string => {
    return showToast({ variant: 'info', title, message });
  }, [showToast]);

  const showLoading = useCallback((title: string, message?: string): string => {
    return showToast({ variant: 'loading', title, message, duration: 0, closable: false });
  }, [showToast]);

  const contextValue: ToastContextValue = {
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed inset-0 pointer-events-none z-50">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={hideToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}


