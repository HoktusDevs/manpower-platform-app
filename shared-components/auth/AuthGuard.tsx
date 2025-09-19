import { useEffect, useState, ReactNode } from 'react';

interface AuthConfig {
  cognitoAuthService: any;
  requiredRole: 'admin' | 'postulante';
  redirectUrl: string;
  errorRedirectUrl: string;
}

interface AuthGuardProps {
  children: ReactNode;
  config: AuthConfig;
}

export function AuthGuard({ children, config }: AuthGuardProps) {
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const { cognitoAuthService, requiredRole, redirectUrl, errorRedirectUrl } = config;

  useEffect(() => {
    const checkAuthentication = () => {
      console.log('🔐 Checking authentication status...');

      // Initialize Cognito service first
      cognitoAuthService.initialize();

      // Check if user is authenticated with valid token
      const isAuthenticated = cognitoAuthService.isAuthenticated();
      const isTokenValid = cognitoAuthService.isTokenValid();

      console.log('🔍 Auth check results:', { isAuthenticated, isTokenValid });

      if (!isAuthenticated || !isTokenValid) {
        console.log('❌ No valid authentication found - redirecting to auth-frontend');
        // Clear any invalid data
        localStorage.clear();
        // Redirect to auth-frontend
        window.location.href = redirectUrl;
        return;
      }

      // Check user role for access
      const user = cognitoAuthService.getCurrentUser();
      if (!user || user.role !== requiredRole) {
        console.log(`❌ User is not ${requiredRole} - redirecting to auth-frontend`);
        localStorage.clear();
        window.location.href = errorRedirectUrl;
        return;
      }

      console.log(`✅ Valid ${requiredRole} authentication found`);
      setIsAuthChecked(true);
    };

    checkAuthentication();
  }, [cognitoAuthService, requiredRole, redirectUrl, errorRedirectUrl]);

  // Show loading screen while checking authentication
  if (!isAuthChecked) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div>🔄 Verificando autenticación...</div>
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            Validando credenciales...
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}