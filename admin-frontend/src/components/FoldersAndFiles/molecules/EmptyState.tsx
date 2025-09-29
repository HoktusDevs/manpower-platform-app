import React from 'react';
import { EmptyState as SharedEmptyState } from '../../../shared/atoms';
import type { EmptyStateProps } from '../types';

/**
 * EmptyState Molecule - now uses consolidated shared component
 * Maintains backward compatibility with FoldersAndFiles types
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction
}) => {
  const folderIcon = (
    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 000-2-2H5a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7l9 6 9-6" />
    </svg>
  );

  return (
    <SharedEmptyState
      title={title}
      message={description}
      icon={folderIcon}
      actionLabel={actionText}
      onAction={onAction}
      showContainer={false}
      className="py-12"
    />
  );
};