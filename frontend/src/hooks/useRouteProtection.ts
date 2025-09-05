import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cognitoAuthService } from '../services/cognitoAuthService';

// SECURITY: Admin-only routes that should be completely hidden from postulantes
const ADMIN_RESTRICTED_PATHS = [
  '/admin',
  '/dashboard/admin',
  '/users',
  '/management',
  '/settings/admin',
  '/reports',
  '/analytics',
  '/audit'
];

// SECURITY: API endpoints that should never be accessible to postulantes
const ADMIN_API_PATTERNS = [
  '/api/admin/',
  '/api/users/manage',
  '/api/reports/',
  '/api/analytics/',
  '/api/audit/',
  '/api/settings/system'
];

export const useRouteProtection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = cognitoAuthService.getCurrentUser();

  useEffect(() => {
    // SECURITY LAYER 1: Route-level protection
    if (user?.role === 'postulante') {
      // Check if trying to access admin routes
      const isAccessingAdminRoute = ADMIN_RESTRICTED_PATHS.some(path => 
        location.pathname.toLowerCase().includes(path.toLowerCase())
      );

      if (isAccessingAdminRoute) {
        console.error(`🚨 SECURITY VIOLATION: Postulante ${user.email} attempted admin route: ${location.pathname}`);
        
        // SECURITY: Clear browser data and redirect
        sessionStorage.clear();
        localStorage.removeItem('adminCache');
        
        // Force redirect with history replacement
        navigate('/postulante', { replace: true });
        
        // SECURITY: Optional - log to monitoring service
        logSecurityViolation({
          userId: user.userId,
          email: user.email,
          attemptedRoute: location.pathname,
          userRole: user.role,
          timestamp: new Date().toISOString(),
          action: 'UNAUTHORIZED_ROUTE_ACCESS'
        });
      }
    }

    // SECURITY LAYER 2: Prevent direct URL manipulation
    const handlePopState = () => {
      if (user?.role === 'postulante') {
        const currentPath = window.location.pathname;
        const isAdminPath = ADMIN_RESTRICTED_PATHS.some(path => 
          currentPath.toLowerCase().includes(path.toLowerCase())
        );
        
        if (isAdminPath) {
          console.error('🚨 SECURITY: Prevented back/forward navigation to admin route');
          navigate('/postulante', { replace: true });
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, location, navigate]);

  // SECURITY LAYER 3: Network request interception
  useEffect(() => {
    if (user?.role === 'postulante') {
      // Override fetch to block admin API calls
      const originalFetch = window.fetch;
      
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        
        // Check if trying to access admin APIs
        const isAdminAPI = ADMIN_API_PATTERNS.some(pattern => 
          url.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (isAdminAPI) {
          console.error(`🚨 SECURITY: Blocked admin API request: ${url}`);
          
          logSecurityViolation({
            userId: user.userId,
            email: user.email,
            attemptedEndpoint: url,
            userRole: user.role,
            timestamp: new Date().toISOString(),
            action: 'UNAUTHORIZED_API_ACCESS'
          });
          
          // Return fake 403 response
          return new Response(
            JSON.stringify({ error: 'Access Denied', code: 403 }), 
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        return originalFetch(input, init);
      };
    }
  }, [user]);

  return {
    isRouteAllowed: (path: string) => {
      if (user?.role === 'admin') return true;
      if (user?.role === 'postulante') {
        return !ADMIN_RESTRICTED_PATHS.some(adminPath => 
          path.toLowerCase().includes(adminPath.toLowerCase())
        );
      }
      return false;
    },
    
    checkAPIAccess: (url: string) => {
      if (user?.role === 'admin') return true;
      if (user?.role === 'postulante') {
        return !ADMIN_API_PATTERNS.some(pattern => 
          url.toLowerCase().includes(pattern.toLowerCase())
        );
      }
      return false;
    }
  };
};

// SECURITY: Log security violations (integrate with monitoring service)
const logSecurityViolation = (violation: {
  userId: string;
  email: string;
  attemptedRoute?: string;
  attemptedEndpoint?: string;
  userRole: string;
  timestamp: string;
  action: string;
}) => {
  // Log to console for immediate visibility
  console.error('🚨 SECURITY VIOLATION LOGGED:', violation);
  
  // TODO: Send to monitoring service (CloudWatch, DataDog, etc.)
  // Example:
  // fetch('/api/security/violations', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(violation)
  // });
};