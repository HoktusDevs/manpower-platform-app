import type { EmptyStateProps } from '../types';

/**
 * EmptyState Molecule
 * Component for displaying empty state when no folders exist
 * Follows Single Responsibility Principle
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction
}) => {
  return (
    <div className="text-center py-12">
      <div className="text-gray-400 mb-4">
        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7l9 6 9-6" />
        </svg>
      </div>
      <p className="text-gray-500 text-lg">{title}</p>
      <p className="text-gray-400 text-sm mt-1">{description}</p>
      
      {actionText && onAction && (
        <button 
          onClick={onAction}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};