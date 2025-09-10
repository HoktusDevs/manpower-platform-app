import { BreadcrumbItem } from '../atoms/BreadcrumbItem';
import type { FolderRow } from '../types';

interface BreadcrumbNavigationProps {
  breadcrumbPath: FolderRow[];
  onNavigateToRoot: () => void;
  onNavigateToFolder: (folderId: string) => void;
  onNavigateBack: () => void;
}

/**
 * BreadcrumbNavigation Molecule
 * Navigation breadcrumb showing current folder path
 * Allows clicking on any level to navigate back
 */
export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  breadcrumbPath,
  onNavigateToRoot,
  onNavigateToFolder,
  onNavigateBack
}) => {
  const handleNavigateToFolder = (folderId: string) => (): void => {
    onNavigateToFolder(folderId);
  };

  // Don't show breadcrumb navigation if we're at the root level
  if (breadcrumbPath.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center py-2 px-4 bg-gray-50 border-b border-gray-200">
      {/* Back button */}
      <button
        type="button"
        onClick={onNavigateBack}
        className="mr-3 p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={breadcrumbPath.length === 0}
        title="Volver"
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>

      {/* Breadcrumb path */}
      <div className="flex items-center">
        {/* Root folder */}
        <BreadcrumbItem
          label="Inicio"
          onClick={onNavigateToRoot}
          isLast={breadcrumbPath.length === 0}
        />
        
        {/* Folder path */}
        {breadcrumbPath.map((folder, index) => (
          <BreadcrumbItem
            key={folder.id}
            label={folder.name}
            onClick={handleNavigateToFolder(folder.id)}
            isLast={index === breadcrumbPath.length - 1}
          />
        ))}
      </div>
    </div>
  );
};