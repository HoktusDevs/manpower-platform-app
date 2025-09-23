import React, { useState } from 'react';
import { DownloadDropdown } from '../molecules/DownloadDropdown';

interface DownloadButtonProps {
  selectedCount: number;
  hasSelection: boolean;
  onDownloadAll: () => void;
  onDownloadSelected: () => void;
}

/**
 * DownloadButton Atom
 * Enhanced component with dropdown functionality
 * Follows Single Responsibility Principle
 */
export const DownloadButton: React.FC<DownloadButtonProps> = ({
  selectedCount,
  hasSelection,
  onDownloadAll,
  onDownloadSelected
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <DownloadDropdown
      isOpen={isOpen}
      onToggle={handleToggle}
      onClose={handleClose}
      onDownloadAll={onDownloadAll}
      onDownloadSelected={onDownloadSelected}
      selectedCount={selectedCount}
      hasSelection={hasSelection}
    />
  );
};