import React from 'react';

export interface EmptyStateProps {
  readonly title?: string;
  readonly message?: string;
  readonly icon?: React.ReactNode;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly className?: string;
  readonly showContainer?: boolean;
}

/**
 * Flexible empty state component - consolidates all EmptyState duplicates
 * Can be used across OCR, FoldersAndFiles, and other modules
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Sin datos',
  message = 'No hay información disponible para mostrar.',
  icon,
  actionLabel,
  onAction,
  className = '',
  showContainer = true
}) => {
  const defaultIcon = (
    <svg
      className="mx-auto h-12 w-12 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );

  const content = (
    <div className={`text-center py-8 ${className}`}>
      <div className="flex justify-center mb-4">
        {icon || defaultIcon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );

  if (showContainer) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-64 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

export default EmptyState;