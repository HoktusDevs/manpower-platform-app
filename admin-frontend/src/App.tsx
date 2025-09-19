// import React from 'react'; // Not needed in modern React
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { MigrationDashboard } from './pages/admin/MigrationDashboard';
import { ApplicationsManagementPage } from './pages/admin/ApplicationsManagementPage';
import { JobPostingsManagementPage } from './pages/admin/JobPostingsManagementPage';
import { FoldersAndFilesPage } from './pages/admin/FoldersAndFilesPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { AdminLayout } from './components/AdminLayout';
import { RoleGuard } from './components/RoleGuard';
import { SessionRenewalModal } from './components/SessionRenewalModal';
import { ToastProvider } from './core-ui';
import { graphqlService } from './services/graphqlService';
import { AWS_CONFIG } from './config/aws-config';
import { cognitoAuthService } from './services/cognitoAuthService';
import { useTokenMonitor } from './hooks/useTokenMonitor';
import { useEffect, useState } from 'react';

function AppContent() {
  // State to track GraphQL initialization
  const [isGraphQLInitialized, setIsGraphQLInitialized] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Token expiration monitoring with reactive authentication state
  const {
    showRenewalModal,
    timeRemaining,
    isRenewing,
    renewSession,
    dismissModal
  } = useTokenMonitor();

  const handleLogout = () => {
    dismissModal();
    cognitoAuthService.logout();
    // Redirect to auth-frontend instead of local login
    window.location.href = 'http://localhost:6100/login';
  };

  // SECURITY: Check authentication status on app load
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
        window.location.href = 'http://localhost:6100/login?redirect=admin';
        return;
      }

      // Check user role for admin access
      const user = cognitoAuthService.getCurrentUser();
      if (!user || user.role !== 'admin') {
        console.log('❌ User is not admin - redirecting to auth-frontend');
        localStorage.clear();
        window.location.href = 'http://localhost:6100/login?redirect=admin&error=access_denied';
        return;
      }

      console.log('✅ Valid admin authentication found');
      setIsAuthChecked(true);
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
        {/* Redirect root to admin dashboard */}
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
          <Route path="settings" element={
            <RoleGuard requiredRole="admin">
              <SettingsPage />
            </RoleGuard>
          } />
        </Route>

        {/* Catch-all route - redirect to auth-frontend login */}
        <Route path="*" element={
          <Navigate to="http://localhost:6100/login" replace />
        } />
      </Routes>
    </ToastProvider>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App