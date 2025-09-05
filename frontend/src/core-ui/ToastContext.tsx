import { createContext } from 'react';

interface ToastContextValue {
  readonly showToast: (toast: Omit<ToastData, 'id'>) => string;
  readonly hideToast: (id: string) => void;
  readonly showSuccess: (title: string, message?: string) => string;
  readonly showError: (title: string, message?: string) => string;
  readonly showWarning: (title: string, message?: string) => string;
  readonly showInfo: (title: string, message?: string) => string;
  readonly showLoading: (title: string, message?: string) => string;
}

interface ToastData {
  readonly id: string;
  readonly variant?: 'success' | 'error' | 'warning' | 'info' | 'loading';
  readonly title: string;
  readonly message?: string;
  readonly duration?: number;
  readonly position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  readonly closable?: boolean;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export type { ToastData, ToastContextValue };