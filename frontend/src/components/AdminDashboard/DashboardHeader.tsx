import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button, Typography, Flex } from '../../core-ui';

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
        <Flex align="center" gap="sm">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <Typography variant="caption">
            {user?.fullName || ''}
          </Typography>
        </Flex>

        {/* Logout Button - Right Side */}
        <Flex align="center">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
          >
            Cerrar Sesión
          </Button>
        </Flex>
      </div>
    </div>
  );
}

export default DashboardHeader;