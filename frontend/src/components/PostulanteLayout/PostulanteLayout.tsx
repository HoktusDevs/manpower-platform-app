import { type ReactNode } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AccessDenied } from '../../core-ui';
import { PostulanteDashboardHeader } from './PostulanteDashboardHeader';
import { PostulanteSidebar } from './PostulanteSidebar';

interface PostulanteLayoutProps {
  children?: ReactNode;
}

export const PostulanteLayout = ({ children }: PostulanteLayoutProps) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AccessDenied
        message="Debes iniciar sesión para acceder a este panel."
        redirectLabel="Ir al Login"
        onRedirect={() => navigate('/login')}
      />
    );
  }

  if (user?.role !== 'postulante') {
    return (
      <AccessDenied
        message="Solo los postulantes pueden acceder a este panel."
        redirectLabel="Ir al Panel de Admin"
        onRedirect={() => navigate('/admin')}
      />
    );
  }

  return (
    <div className="h-screen bg-gray-100 overflow-hidden">
      <PostulanteDashboardHeader />

      <div className="flex h-[calc(100vh-4rem)] overflow-visible">
        <PostulanteSidebar onNavigate={navigate} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};