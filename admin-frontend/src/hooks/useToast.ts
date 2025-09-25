import { useCallback } from 'react';

export interface UseToastReturn {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export const useToast = (): UseToastReturn => {
  const showSuccess = useCallback((message: string) => {
    // For now, just console.log - this can be enhanced later with proper toast UI
    // In a real implementation, this would show a success toast
    console.log('Success:', message);
  }, []);

  const showError = useCallback((message: string) => {
    // For now, just console.error - this can be enhanced later with proper toast UI
    // In a real implementation, this would show an error toast
    console.error('Error:', message);
  }, []);

  return {
    showSuccess,
    showError
  };
};