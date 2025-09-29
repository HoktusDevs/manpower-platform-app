import React from 'react';
import { UserAvatar, ChevronIcon, LogoutIcon } from '../atoms';
import { useDropdown } from '../hooks';

export interface UserDropdownProps {
  readonly userName?: string;
  readonly onLogout: () => void;
  readonly className?: string;
}

/**
 * User dropdown molecule
 * Combines user avatar, name display, and logout functionality
 */
export const UserDropdown: React.FC<UserDropdownProps> = ({
  userName = 'Usuario',
  onLogout,
  className = ''
}) => {
  const { isOpen, toggleDropdown, closeDropdown, dropdownRef } = useDropdown();

  const handleLogout = (): void => {
    onLogout();
    closeDropdown();
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="flex items-center gap-4 px-2 py-1 focus:outline-none w-[200px]"
      >
        <UserAvatar name={userName} />
        <span className="text-sm text-gray-700">{userName}</span>
        <ChevronIcon isRotated={isOpen} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <LogoutIcon />
            Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;