import { useEffect, useRef } from 'react';

/**
 * Custom hook for click outside detection
 * Follows Single Responsibility Principle - only handles click outside logic
 * 
 * @param callback - Function to call when click outside occurs
 * @param isActive - Whether the hook should be active
 */
export const useClickOutside = <T extends HTMLElement>(
  callback: () => void,
  isActive: boolean = true
) => {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [callback, isActive]);

  return { ref };
};