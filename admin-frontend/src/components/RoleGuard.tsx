import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

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
  // App.tsx already handles authentication - RoleGuard only checks ROLES
  // If we reach this component, user is already authenticated

  // Helper function to get user role from localStorage
  const getUserRole = (): 'admin' | 'postulante' | null => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user['custom:role'] as 'admin' | 'postulante';
      }
      return null;
    } catch {
      return null;
    }
  };

  const userRole = getUserRole();

  // If we somehow don't have role data, let App.tsx handle the redirect
  if (!userRole) {
    return <>{children}</>;
  }

  // CHECK SINGLE REQUIRED ROLE
  if (requiredRole && userRole !== requiredRole) {
    // This should not happen in admin-frontend since App.tsx already filters
    console.warn(`🚨 ROLE MISMATCH: User role ${userRole} doesn't match required ${requiredRole}`);
    return <>{children}</>;
  }

  // CHECK MULTIPLE ALLOWED ROLES
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    console.warn(`🚨 ROLE MISMATCH: User role ${userRole} not in allowed roles [${allowedRoles.join(', ')}]`);
    return <>{children}</>;
  }

  return <>{children}</>;
};