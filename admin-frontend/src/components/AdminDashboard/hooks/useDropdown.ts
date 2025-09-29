import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseDropdownReturn {
  readonly isOpen: boolean;
  readonly toggleDropdown: () => void;
  readonly closeDropdown: () => void;
  readonly dropdownRef: React.RefObject<HTMLDivElement>;
}

/**
 * Custom hook for dropdown functionality
 * Manages dropdown state and click outside behavior
 */
export const useDropdown = (): UseDropdownReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = useCallback((): void => {
    setIsOpen(prev => !prev);
  }, []);

  const closeDropdown = useCallback((): void => {
    setIsOpen(false);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, closeDropdown]);

  return {
    isOpen,
    toggleDropdown,
    closeDropdown,
    dropdownRef
  };
};

export default useDropdown;