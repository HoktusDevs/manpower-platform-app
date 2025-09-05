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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between">
        <Flex align="center" gap="md">
          <Typography variant="caption">
            {user?.fullName || 'Administrador'}
          </Typography>
        </Flex>
        <Flex justify="between" align="center" className="py-6">
          <Flex align="center" gap="md">
            <Button
              variant="danger"
              onClick={handleLogout}
            >
              Cerrar Sesión
            </Button>
          </Flex>
        </Flex>
      </div>
    </div>
  );
}

export default DashboardHeader;