import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useFoldersState } from '../hooks/useFoldersState';
import type { UseFoldersStateReturn } from '../types';

interface FoldersProviderProps {
  children: ReactNode;
}

const FoldersContext = createContext<UseFoldersStateReturn | null>(null);

export const FoldersProvider: React.FC<FoldersProviderProps> = ({ children }) => {
  const foldersState = useFoldersState();
  
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