import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cognitoAuthService } from '../services/cognitoAuthService';
import { validateSessionIntegrity, forceSecureLogout, logSecurityViolation } from '../utils/securityUtils';

interface SecurityBoundaryProps {
  children: React.ReactNode;
}

export const SecurityBoundary: React.FC<SecurityBoundaryProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSecure, setIsSecure] = useState(true);

  useEffect(() => {
    // SECURITY: Continuous session validation
    const validateSecurity = () => {
      try {
        // Check session integrity
        if (!validateSessionIntegrity()) {
          forceSecureLogout('Session integrity check failed');
          return;
        }

        const user = cognitoAuthService.getCurrentUser();
        if (!user) {
          return; // Not logged in, that's ok for public routes
        }

        // SECURITY: Detect role tampering attempts
        const storedUserData = localStorage.getItem('cognito_user');
        if (storedUserData) {
          try {
            const parsedData = JSON.parse(storedUserData);
            if (parsedData.role !== user.role) {
              logSecurityViolation({
                action: 'ROLE_TAMPERING_DETECTED',
                severity: 'CRITICAL',
                userRole: user.role,
                email: user.email
              });
              forceSecureLogout('Role tampering detected');
              return;
            }
          } catch {
            forceSecureLogout('User data corruption detected');
            return;
          }
        }

        // SECURITY: Check for unauthorized route access
        if (user.role === 'postulante' && location.pathname.toLowerCase().includes('/admin')) {
          logSecurityViolation({
            action: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
            severity: 'CRITICAL',
            attemptedRoute: location.pathname,
            userRole: user.role,
            email: user.email
          });
          
          // Immediate redirect and data cleanup
          navigate('/postulante', { replace: true });
          sessionStorage.clear();
          return;
        }

        setIsSecure(true);
      } catch {
        setIsSecure(false);
        forceSecureLogout('Security validation failed');
      }
    };

    // Initial validation
    validateSecurity();

    // SECURITY: Periodic validation every 30 seconds
    const securityInterval = setInterval(validateSecurity, 30000);

    // SECURITY: Validate on route changes
    const handleLocationChange = () => {
      setTimeout(validateSecurity, 100); // Small delay to ensure route has changed
    };

    handleLocationChange();

    return () => {
      clearInterval(securityInterval);
    };
  }, [location, navigate]);

  // SECURITY: Monitor browser events for tampering
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Check for unauthorized modifications to auth data
      if (event.key?.includes('cognito') || event.key?.includes('auth')) {
        const user = cognitoAuthService.getCurrentUser();
        if (user) {
          logSecurityViolation({
            action: 'AUTH_DATA_MODIFICATION_DETECTED',
            severity: 'HIGH',
            email: user.email
          });
          
          // Re-validate session
          if (!validateSessionIntegrity()) {
            forceSecureLogout('Auth data tampering detected');
          }
        }
      }
    };

    const handleBeforeUnload = () => {
      // Clear sensitive data on page unload for security
      sessionStorage.removeItem('adminCache');
      sessionStorage.removeItem('tempAdminData');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-validate when tab becomes active
        setTimeout(() => {
          if (!validateSessionIntegrity()) {
            forceSecureLogout('Session validation failed on tab focus');
          }
        }, 500);
      }
    };

    // SECURITY: Monitor for developer tools opening
    const handleDevToolsOpen = () => {
      const user = cognitoAuthService.getCurrentUser();
      if (user?.role === 'postulante') {
        logSecurityViolation({
          action: 'DEV_TOOLS_OPENED_BY_POSTULANTE',
          severity: 'MEDIUM',
          email: user.email
        });
      }
    };

    // Detect dev tools (basic check)
    const devToolsCheck = setInterval(() => {
      if (window.outerHeight - window.innerHeight > 200 || 
          window.outerWidth - window.innerWidth > 200) {
        handleDevToolsOpen();
      }
    }, 5000);

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(devToolsCheck);
    };
  }, []);

  // SECURITY: Don't render if security validation failed
  if (!isSecure) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center p-8 bg-red-100 rounded-lg border border-red-200">
          <h2 className="text-xl font-bold text-red-800 mb-2">
            🚨 Security Validation Failed
          </h2>
          <p className="text-red-600 mb-4">
            Your session has been terminated for security reasons.
          </p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};