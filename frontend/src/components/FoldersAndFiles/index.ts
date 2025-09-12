// Main barrel export for FoldersAndFiles module
// Following Clean Architecture - expose only what's needed

// Main component for external use
export { FoldersManager } from './organisms/FoldersManager';

// Types that might be needed by external components
export type { 
  FolderRow, 
  CreateFolderData, 
  FolderAction 
} from './types';

// Hooks that might be reused elsewhere
export { 
  useFoldersState, 
  useSelectionState, 
  useClickOutside 
} from './hooks';

// Context for shared folder state
export { FoldersProvider, useFoldersContext } from './context/FoldersContext';