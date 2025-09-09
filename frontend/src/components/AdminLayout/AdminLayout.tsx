import { ReactNode } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AccessDenied } from '../../core-ui';
import { DashboardHeader, Sidebar } from '../AdminDashboard';

interface AdminLayoutProps {
  children?: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <AccessDenied
        message="Solo los administradores pueden acceder a este panel."
        redirectLabel="Ir al Dashboard de Postulante"
        onRedirect={() => navigate('/postulante')}
      />
    );
  }

  return (
    <div className="h-screen bg-gray-100 overflow-hidden">
      <DashboardHeader />
      
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar onNavigate={navigate} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};