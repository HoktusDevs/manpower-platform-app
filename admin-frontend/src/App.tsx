import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminLayout } from './components/AdminLayout';
import { RoleGuard } from './components/RoleGuard';
import { SessionRenewalModal } from './components/SessionRenewalModal';
import { RedirectToLogin } from './components/RedirectToLogin';
import { ToastProvider } from './core-ui';
import { cognitoAuthService } from './services/cognitoAuthService';
import { adminRoutes, externalRedirects } from './config/routes';
import { useEffect, useState } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function AppContent() {
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  
  const showRenewalModal = false;
  const timeRemaining = 0;
  const isRenewing = false;
  const renewSession = async () => {};
  const dismissModal = () => {};

  const handleLogout = () => {
    dismissModal();
    cognitoAuthService.logout();
    window.location.href = externalRedirects.auth.login;
  };

  // Check for sessionKey first, then existing tokens
  useEffect(() => {
    const checkAuthentication = async () => {
      const { SessionExchangeService } = await import('./services/sessionExchangeService');
      const sessionKey = SessionExchangeService.getSessionKeyFromURL();

      if (sessionKey) {
        const result = await SessionExchangeService.exchangeSessionKey(sessionKey);

        if (result.success && result.user?.userType === 'admin') {
          setIsAuthChecked(true);
          return;
        } else {
          localStorage.clear();
          window.location.href = `${externalRedirects.auth.login}?redirect=admin&error=session_exchange_failed`;
          return;
        }
      }

      const authToken = localStorage.getItem('cognito_access_token');
      const authUser = localStorage.getItem('user');

      if (authToken && authUser) {
        try {
          const user = JSON.parse(authUser);
          if (user['custom:role'] === 'admin') {
            setIsAuthChecked(true);
            return;
          }
        } catch {
          // Invalid JSON, continue with logout
        }
      }

      localStorage.clear();
      window.location.href = `${externalRedirects.auth.login}?redirect=admin`;
    };

    checkAuthentication();
  }, []);

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

  return (
    <ToastProvider>
      <SessionRenewalModal
        show={showRenewalModal}
        onRenew={renewSession}
        onLogout={handleLogout}
        isRenewing={isRenewing}
        timeRemaining={timeRemaining}
      />

      <Routes>
        {/* Root route - redirect to admin dashboard after auth */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* Redirect authentication routes to auth-frontend */}
        <Route path="/login" element={<Navigate to={externalRedirects.auth.login} replace />} />
        <Route path="/register/*" element={<Navigate to={externalRedirects.auth.register} replace />} />
        <Route path="/forgot-password" element={<Navigate to={externalRedirects.auth.forgotPassword} replace />} />

        {/* ADMIN: Only admin routes remain in main frontend */}
        <Route path="/admin/*" element={<AdminLayout />}>
          {adminRoutes.map((route) => {
            const RouteComponent = route.element;
            
            if (route.requireAuth && route.requiredRole) {
              return (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <RoleGuard requiredRole={route.requiredRole as 'admin' | 'postulante'}>
                      <RouteComponent />
                    </RoleGuard>
                  }
                />
              );
            }
            
            return (
              <Route
                key={route.path}
                path={route.path}
                element={<RouteComponent />}
              />
            );
          })}
        </Route>

        {/* Catch-all route - redirect to auth-frontend login */}
        <Route path="*" element={<RedirectToLogin />} />
      </Routes>
    </ToastProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;