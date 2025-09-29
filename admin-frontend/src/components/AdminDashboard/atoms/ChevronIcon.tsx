import React from 'react';

export interface ChevronIconProps {
  readonly direction?: 'up' | 'down' | 'left' | 'right';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
  readonly isRotated?: boolean;
}

/**
 * Chevron icon atom with rotation animation
 * Reusable icon component for dropdowns and navigation
 */
export const ChevronIcon: React.FC<ChevronIconProps> = ({
  direction = 'down',
  size = 'md',
  className = '',
  isRotated = false
}) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const rotationClasses = {
    up: 'rotate-180',
    down: '',
    left: 'rotate-90',
    right: '-rotate-90'
  };

  const baseRotation = rotationClasses[direction];
  const additionalRotation = isRotated ? 'rotate-180' : '';

  return (
    <svg
      className={`${sizeClasses[size]} text-gray-400 transition-transform duration-200 ${baseRotation} ${additionalRotation} ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
};

export default ChevronIcon;