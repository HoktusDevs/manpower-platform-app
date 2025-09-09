interface RowActionsButtonProps {
  onClick: () => void;
}

/**
 * RowActionsButton Atom
 * Pure component for row actions trigger (3 circles)
 * Follows Single Responsibility Principle
 */
export const RowActionsButton: React.FC<RowActionsButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center p-1 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
      </svg>
    </button>
  );
};