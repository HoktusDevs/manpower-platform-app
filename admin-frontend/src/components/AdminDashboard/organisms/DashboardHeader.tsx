import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { UserDropdown } from '../molecules/UserDropdown';

export function DashboardHeader(): ReactNode {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-6">
        <UserDropdown
          userName={user?.fullName}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
}

export default DashboardHeader;