import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FeatureFlagControl } from '../FeatureFlagControl';
import { Button, Typography, Icon, Flex } from '../../core-ui';

export function DashboardHeader(): ReactNode {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Flex justify="between" align="center" className="py-6">
          <Flex align="center">
            <Flex align="center" gap="sm">
              <Icon name="dashboard" size="lg" />
              <Typography variant="h2">Admin Dashboard</Typography>
            </Flex>
            <FeatureFlagControl feature="applications" showDetails className="ml-4" />
          </Flex>
          <Flex align="center" gap="md">
            <Typography variant="caption">
              {user?.fullName || 'Administrador'}
            </Typography>
            <Button
              variant="info"
              onClick={() => navigate('/admin/migration')}
            >
              Migration Dashboard
            </Button>
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