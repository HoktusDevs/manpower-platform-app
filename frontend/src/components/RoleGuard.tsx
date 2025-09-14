import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { cognitoAuthService } from '../services/cognitoAuthService';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'postulante';
  allowedRoles?: ('admin' | 'postulante')[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  requiredRole, 
  allowedRoles 
}) => {
  const location = useLocation();
  
  // Don't check authentication on public routes
  const publicRoutes = ['/aplicar', '/login', '/register/postulante', '/forgot-password'];
  const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route));
  
  // Always call useEffect - move the condition inside
  useEffect(() => {
    if (isPublicRoute) {
      return; // Exit early if public route
    }
    
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role === 'postulante' && location.pathname.includes('/admin')) {
      // Clear any potential admin data from browser
      sessionStorage.removeItem('adminCache');
      localStorage.removeItem('adminData');
      
      // Force redirect and clear history
      window.history.replaceState(null, '', '/postulante/completar-aplicaciones');
      
      // Log security violation attempt
      console.warn(`🚨 SECURITY VIOLATION: User ${user.email} attempted to access admin route: ${location.pathname}`);
    }
  }, [location, isPublicRoute]);
  
  if (isPublicRoute) {
    return <>{children}</>;
  }
  
  const isAuthenticated = cognitoAuthService.isAuthenticated();
  const user = cognitoAuthService.getCurrentUser();

  // NOT AUTHENTICATED
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // NO USER DATA (security breach attempt)
  if (!user || !user.role) {
    console.error('🚨 SECURITY: No user role found, forcing logout');
    cognitoAuthService.logout();
    return <Navigate to="/login" replace />;
  }

  // CHECK SINGLE REQUIRED ROLE
  if (requiredRole && user.role !== requiredRole) {
    // SECURITY: Log unauthorized access attempt
    console.warn(`🚨 SECURITY: User ${user.email} (role: ${user.role}) attempted to access ${requiredRole} route: ${location.pathname}`);
    
    // Force redirect based on actual role
    const safePath = user.role === 'admin' ? '/admin' : '/postulante/completar-aplicaciones';
    return <Navigate to={safePath} replace />;
  }

  // CHECK MULTIPLE ALLOWED ROLES
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.warn(`🚨 SECURITY: User ${user.email} (role: ${user.role}) not in allowed roles [${allowedRoles.join(', ')}] for route: ${location.pathname}`);
    
    const safePath = user.role === 'admin' ? '/admin' : '/postulante/completar-aplicaciones';
    return <Navigate to={safePath} replace />;
  }

  // ADDITIONAL SECURITY: Verify token is still valid
  if (!cognitoAuthService.isTokenValid()) {
    console.error('🚨 SECURITY: Invalid token detected, forcing logout');
    cognitoAuthService.logout();
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};