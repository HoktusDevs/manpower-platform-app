import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { RedirectToLogin } from './RedirectToLogin';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const [initialDelay, setInitialDelay] = useState(true);

  useEffect(() => {
    // Dar tiempo para que el sessionExchangeService procese el sessionKey
    const timer = setTimeout(() => {
      setInitialDelay(false);
    }, 2000); // Esperar 2 segundos para procesar sessionKey

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Solo verificar después del delay inicial
    if (!initialDelay && !isLoading) {
      if (user) {
        console.log('✅ Usuario autenticado, permitiendo acceso');
      } else {
        console.log('❌ Usuario no autenticado, redirigiendo al login');
      }
    }
  }, [user, isLoading, initialDelay]);

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading || initialDelay) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {initialDelay ? 'Procesando autenticación...' : 'Verificando autenticación...'}
          </p>
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
