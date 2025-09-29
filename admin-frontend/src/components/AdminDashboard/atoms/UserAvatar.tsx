import React from 'react';

export interface UserAvatarProps {
  readonly name?: string;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

/**
 * User avatar atom with initials fallback
 * Basic avatar component for displaying user profile pictures
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-7 h-7'
  };

  return (
    <div className={`${sizeClasses[size]} bg-gray-300 rounded-full flex items-center justify-center ${className}`}>
      <svg
        className={`${iconSizes[size]} text-gray-600`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    </div>
  );
};

export default UserAvatar;