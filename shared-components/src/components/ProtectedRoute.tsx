/**
 * Protected Route Component
 * Redirects to auth frontend if user is not authenticated
 */

import React, { useEffect, useState } from 'react';
import { tokenService, User } from '../services/tokenService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  fallbackComponent?: React.ComponentType;
  redirectUrl?: string;
}

const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
  </div>
);

const UnauthorizedMessage: React.FC<{ role?: string }> = ({ role }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Acceso no autorizado</h3>
        <p className="mt-2 text-sm text-gray-500">
          {role
            ? `Se requiere rol de ${role} para acceder a esta sección.`
            : 'No tienes permisos para acceder a esta sección.'
          }
        </p>
        <button
          onClick={() => tokenService.logout()}
          className="mt-4 w-full inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Volver al login
        </button>
      </div>
    </div>
  </div>
);

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  fallbackComponent: FallbackComponent = LoadingSpinner,
  redirectUrl
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasRequiredRole, setHasRequiredRole] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated
        const authenticated = tokenService.isAuthenticated();
        setIsAuthenticated(authenticated);

        if (!authenticated) {
          // Not authenticated, redirect to auth frontend
          const authUrl = redirectUrl || 'http://localhost:5173/login';
          window.location.replace(authUrl);
          return;
        }

        // Get user data
        const userData = tokenService.getUser();
        setUser(userData);

        // Check role if required
        if (requiredRole && userData) {
          const userRole = userData['custom:role'];
          const roleMatch = userRole === requiredRole;
          setHasRequiredRole(roleMatch);

          if (!roleMatch) {
            console.warn(`Access denied. Required role: ${requiredRole}, User role: ${userRole}`);
          }
        } else {
          setHasRequiredRole(true);
        }

        // Check if token is expired
        if (tokenService.isTokenExpired()) {
          try {
            const refreshSuccess = await tokenService.refreshAccessToken(
              'https://7pptifb3zk.execute-api.us-east-1.amazonaws.com/dev'
            );

            if (!refreshSuccess) {
              // Refresh failed, redirect to login
              tokenService.logout();
              return;
            }
          } catch (error) {
            console.error('Token refresh failed:', error);
            tokenService.logout();
            return;
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        tokenService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [requiredRole, redirectUrl]);

  if (isLoading) {
    return <FallbackComponent />;
  }

  if (!isAuthenticated) {
    return <FallbackComponent />;
  }

  if (requiredRole && !hasRequiredRole) {
    return <UnauthorizedMessage role={requiredRole} />;
  }

  return <>{children}</>;
};