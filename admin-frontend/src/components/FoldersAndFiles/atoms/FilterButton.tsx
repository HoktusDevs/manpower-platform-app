import React, { useState } from 'react';
import { FilterDropdown } from '../molecules/FilterDropdown';

interface FilterOptions {
  type: 'all' | 'folder' | 'file';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  sortBy: 'name' | 'date' | 'size' | 'type';
  sortOrder: 'asc' | 'desc';
}

interface FilterButtonProps {
  onApplyFilters: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

/**
 * FilterButton Atom
 * Enhanced component with dropdown functionality
 * Follows Single Responsibility Principle
 */
export const FilterButton: React.FC<FilterButtonProps> = ({
  onApplyFilters,
  currentFilters
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <FilterDropdown
      onApplyFilters={onApplyFilters}
      currentFilters={currentFilters}
      isOpen={isOpen}
      onToggle={handleToggle}
      onClose={handleClose}
    />
  );
};