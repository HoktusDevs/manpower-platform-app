import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { RedirectToLogin } from './RedirectToLogin';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Esperar a que termine la carga de autenticación
    if (!isLoading) {
      if (user) {
        console.log('✅ Usuario autenticado, permitiendo acceso');
        setShouldRender(true);
      } else {
        console.log('❌ Usuario no autenticado, redirigiendo al login');
        setShouldRender(false);
      }
    }
  }, [user, isLoading]);

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    return <RedirectToLogin />;
  }

  // Si hay usuario autenticado, mostrar el contenido
  return <>{children}</>;
};
