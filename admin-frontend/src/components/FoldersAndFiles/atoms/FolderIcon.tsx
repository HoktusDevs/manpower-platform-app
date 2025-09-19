/**
 * FolderIcon Atom
 * Pure component for folder icon display
 * Follows Single Responsibility Principle
 */
export const FolderIcon: React.FC = () => {
  return (
    <div className="flex-shrink-0 mr-4">
      <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    </div>
  );
};