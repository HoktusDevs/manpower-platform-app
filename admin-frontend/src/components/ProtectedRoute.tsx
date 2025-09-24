import { Navigate } from 'react-router-dom';
import { cognitoAuthService } from '../services/cognitoAuthService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'postulante';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const isAuthenticated = cognitoAuthService.isAuthenticated();
  const user = cognitoAuthService.getCurrentUser();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Redirect to appropriate dashboard based on actual role
    const redirectPath = user?.role === 'admin' ? '/admin' : '/postulante';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};