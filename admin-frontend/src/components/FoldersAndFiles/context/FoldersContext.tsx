import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useUnifiedFoldersState } from '../hooks/useUnifiedFoldersState';
import type { UseFoldersStateReturn } from '../types';

interface FoldersProviderProps {
  children: ReactNode;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: Error) => void;
  onCreateSuccess?: () => void;
  onCreateError?: (error: Error) => void;
}

const FoldersContext = createContext<UseFoldersStateReturn | null>(null);

export const FoldersProvider: React.FC<FoldersProviderProps> = ({ 
  children, 
  onDeleteSuccess, 
  onDeleteError,
  onCreateSuccess,
  onCreateError
}) => {
  const foldersState = useUnifiedFoldersState(onDeleteSuccess, onDeleteError, onCreateSuccess, onCreateError);
  
  return (
    <FoldersContext.Provider value={foldersState}>
      {children}
    </FoldersContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFoldersContext = (): UseFoldersStateReturn => {
  const context = useContext(FoldersContext);
  if (!context) {
    throw new Error('useFoldersContext must be used within a FoldersProvider');
  }
  return context;
};

// Optional version that doesn't throw
// eslint-disable-next-line react-refresh/only-export-components
export const useFoldersContextOptional = (): UseFoldersStateReturn | null => {
  const context = useContext(FoldersContext);
  return context;
};