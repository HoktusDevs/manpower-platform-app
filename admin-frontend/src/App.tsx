// import React from 'react'; // Not needed in modern React
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { MigrationDashboard } from './pages/admin/MigrationDashboard';
import { ApplicationsManagementPage } from './pages/admin/ApplicationsManagementPage';
import { JobPostingsManagementPage } from './pages/admin/JobPostingsManagementPage';
import { FoldersAndFilesPage } from './pages/admin/FoldersAndFilesPage';
import { TestWhatsappPage } from './pages/admin/TestWhatsappPage';
import { TestOCRPage } from './pages/admin/TestOCRPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { AdminLayout } from './components/AdminLayout';
import { RoleGuard } from './components/RoleGuard';
import { SessionRenewalModal } from './components/SessionRenewalModal';
import { RedirectToLogin } from './components/RedirectToLogin';
import { ToastProvider } from './core-ui';
import { graphqlService } from './services/graphqlService';
import { AWS_CONFIG } from './config/aws-config';
import { cognitoAuthService } from './services/cognitoAuthService';
import { useTokenMonitor } from './hooks/useTokenMonitor';
import { useEffect, useState } from 'react';

// Create a client for React Query
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
  const [isGraphQLInitialized, setIsGraphQLInitialized] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  
  const showRenewalModal = false;
  const timeRemaining = 0;
  const isRenewing = false;
  const renewSession = async () => {};
  const dismissModal = () => {};

  const handleLogout = () => {
    dismissModal();
    cognitoAuthService.logout();
    window.location.href = 'http://localhost:6100/login';
  };

  // Check for sessionKey first, then existing tokens
  useEffect(() => {
    const checkAuthentication = async () => {
      // Import here to avoid circular dependency
      const { SessionExchangeService } = await import('./services/sessionExchangeService');

      // Check if we have a sessionKey from URL
      const sessionKey = SessionExchangeService.getSessionKeyFromURL();

      if (sessionKey) {
        const result = await SessionExchangeService.exchangeSessionKey(sessionKey);

        if (result.success && result.user?.userType === 'admin') {
          setIsAuthChecked(true);
          return;
        } else {
          localStorage.clear();
          window.location.href = 'http://localhost:6100/login?redirect=admin&error=session_exchange_failed';
          return;
        }
      }

      // Check existing tokens (using same keys as sessionExchange)
      const authToken = localStorage.getItem('cognito_access_token');
      const authUser = localStorage.getItem('user');

      if (authToken && authUser) {
        try {
          const user = JSON.parse(authUser);
          if (user['custom:role'] === 'admin') {
            setIsAuthChecked(true);
            return;
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }

      // No valid authentication, redirect to login
      localStorage.clear();
      window.location.href = 'http://localhost:6100/login?redirect=admin';
    };

    checkAuthentication();
  }, []);

  // Initialize GraphQL service only after auth check passes
  useEffect(() => {
    if (!isAuthChecked) return;

    const initGraphQL = async () => {
      console.log('🔧 Using AWS configuration:', {
        graphqlEndpoint: AWS_CONFIG.graphql.endpoint,
        region: AWS_CONFIG.region,
        userPoolId: AWS_CONFIG.cognito.userPoolId,
        userPoolClientId: AWS_CONFIG.cognito.userPoolClientId,
        identityPoolId: AWS_CONFIG.cognito.identityPoolId
      });

      if (!graphqlService.isInitialized()) {
        const config = {
          graphqlEndpoint: AWS_CONFIG.graphql.endpoint,
          region: AWS_CONFIG.region,
          authenticationType: 'AMAZON_COGNITO_USER_POOLS' as const,
          userPoolId: AWS_CONFIG.cognito.userPoolId,
          userPoolClientId: AWS_CONFIG.cognito.userPoolClientId,
          identityPoolId: AWS_CONFIG.cognito.identityPoolId,
          apiKey: import.meta.env.VITE_GRAPHQL_API_KEY || undefined
        };

        console.log('🛠️ Initializing GraphQL with config:', config);
        await graphqlService.initialize(config);
        setIsGraphQLInitialized(true);
      } else {
        setIsGraphQLInitialized(true);
      }
    };

    initGraphQL();
  }, [isAuthChecked]);

  // Show loading screen while checking authentication or initializing GraphQL
  if (!isAuthChecked || !isGraphQLInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div>🔄 {!isAuthChecked ? 'Verificando autenticación...' : 'Inicializando servicios...'}</div>
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            {!isAuthChecked ? 'Validando credenciales...' : 'Configurando GraphQL...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      {/* Session Renewal Modal */}
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
        <Route path="/login" element={<Navigate to="http://localhost:6100/login" replace />} />
        <Route path="/register/*" element={<Navigate to="http://localhost:6100/register" replace />} />
        <Route path="/forgot-password" element={<Navigate to="http://localhost:6100/forgot-password" replace />} />

        {/* Redirect postulante routes to applicant-frontend */}
        <Route path="/aplicar" element={<Navigate to="http://localhost:6200/aplicar" replace />} />
        <Route path="/postulante/*" element={<Navigate to="http://localhost:6200/postulante" replace />} />
        <Route path="/completar-aplicaciones" element={<Navigate to="http://localhost:6200/completar-aplicaciones" replace />} />

        {/* ADMIN: Only admin routes remain in main frontend */}
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="migration" element={
            <RoleGuard requiredRole="admin">
              <MigrationDashboard />
            </RoleGuard>
          } />
          <Route path="applications" element={
            <RoleGuard requiredRole="admin">
              <ApplicationsManagementPage />
            </RoleGuard>
          } />
          <Route path="jobs" element={
            <RoleGuard requiredRole="admin">
              <JobPostingsManagementPage />
            </RoleGuard>
          } />
          <Route path="folders&files" element={
            <RoleGuard requiredRole="admin">
              <FoldersAndFilesPage />
            </RoleGuard>
          } />
          <Route path="test-whatsapp" element={
            <RoleGuard requiredRole="admin">
              <TestWhatsappPage />
            </RoleGuard>
          } />
          <Route path="test-ocr" element={
            <RoleGuard requiredRole="admin">
              <TestOCRPage />
            </RoleGuard>
          } />
          <Route path="settings" element={
            <RoleGuard requiredRole="admin">
              <SettingsPage />
            </RoleGuard>
          } />
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

export default App