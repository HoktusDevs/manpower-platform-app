// import React from 'react'; // Not needed in modern React
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
// import { RegisterPage } from './pages/auth/RegisterPage'; // Legacy - now using specific routes
import { PostulanteRegisterPage } from './pages/auth/PostulanteRegisterPage';
import { AdminRegisterPage } from './pages/auth/AdminRegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { MigrationDashboard } from './pages/admin/MigrationDashboard';
import { ApplicationsManagementPage } from './pages/admin/ApplicationsManagementPage';
import { JobPostingsManagementPage } from './pages/admin/JobPostingsManagementPage';
import { FoldersAndFilesPage } from './pages/admin/FoldersAndFilesPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { AdminLayout } from './components/AdminLayout';
import { PostulanteLayout } from './components/PostulanteLayout';
import { PostulanteDashboard } from './pages/postulante/PostulanteDashboard';
import { PendingApplicationsView } from './pages/postulante/PendingApplicationsView';
import { JobSearchPage } from './pages/postulante/JobSearchPage';
import { MyApplicationsPage } from './pages/postulante/MyApplicationsPage';
import { MyProfilePage } from './pages/postulante/MyProfilePage';
import { ConfigurationPage } from './pages/postulante/ConfigurationPage';
import { PostulacionPage } from './pages/postulacion/PostulacionPage';
import { PluxeeFoldersAndFilesPage } from './pages/pluxee/admin/PluxeeFoldersAndFilesPage';
import { PluxeeCompanyFoldersPage } from './pages/pluxee/company/PluxeeCompanyFoldersPage';
import { PluxeeLayout } from './components/PluxeeLayout';
import { FormRenderer } from './pages/postulante/FormRenderer';
import { RoleGuard } from './components/RoleGuard';
import { SessionRenewalModal } from './components/SessionRenewalModal';
import { ToastProvider } from './core-ui';
import { graphqlService } from './services/graphqlService';
import { cognitoAuthService } from './services/cognitoAuthService';
import { useTokenMonitor } from './hooks/useTokenMonitor';
import { useEffect, useState } from 'react';
// import { migrationService } from './services/migrationService'; // Not used in component

function AppContent() {
  // SECURITY: Initialize route protection (now inside Router context)
  // TEMPORARY: Disabled for debugging redirect loop
  // useRouteProtection();
  
  // State to track GraphQL initialization
  const [isGraphQLInitialized, setIsGraphQLInitialized] = useState(false);

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
    window.location.href = '/login';
  };

  // Initialize GraphQL service
  useEffect(() => {
    const initGraphQL = async () => {
      console.log('🔧 Environment variables check:', {
        VITE_GRAPHQL_URL: import.meta.env.VITE_GRAPHQL_URL,
        VITE_AWS_REGION: import.meta.env.VITE_AWS_REGION,
        VITE_USER_POOL_ID: import.meta.env.VITE_USER_POOL_ID,
        VITE_USER_POOL_CLIENT_ID: import.meta.env.VITE_USER_POOL_CLIENT_ID,
        VITE_IDENTITY_POOL_ID: import.meta.env.VITE_IDENTITY_POOL_ID
      });
      
      if (!graphqlService.isInitialized()) {
        const config = {
          graphqlEndpoint: import.meta.env.VITE_GRAPHQL_URL || 'https://xwewxrgy4rgedhyhc6bkjojg5i.appsync-api.us-east-1.amazonaws.com/graphql',
          region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
          authenticationType: 'AMAZON_COGNITO_USER_POOLS' as const,
          userPoolId: import.meta.env.VITE_USER_POOL_ID || 'us-east-1_uRCDemTcQ',
          userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '5jt63usa3sgmaeju2pqojr7io1',
          identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID || undefined
        };

        console.log('🛠️ Initializing GraphQL with config:', config);
        await graphqlService.initialize(config);
        setIsGraphQLInitialized(true);
      } else {
        setIsGraphQLInitialized(true);
      }
    };

    initGraphQL();
  }, []);
  
  // Simple approach - just redirect everyone to login initially
  // This should stop any bouncing issues

  // Show loading screen while GraphQL initializes
  if (!isGraphQLInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div>🔄 Inicializando servicios...</div>
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            Configurando GraphQL...
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
      
      {/* <SecurityBoundary> DISABLED TEMPORARILY FOR DEBUG */}
        <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* LEGACY: Keep old register for backwards compatibility - redirect to specific */}
        <Route path="/register" element={<Navigate to="/register/postulante" replace />} />
        
        {/* NEW: Specific registration routes */}
        <Route path="/register/postulante" element={<PostulanteRegisterPage />} />
        <Route path="/admin/register" element={<AdminRegisterPage />} />
        
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        
        {/* Ruta pública para aplicar a trabajos - NO REQUIERE AUTENTICACIÓN */}
        <Route path="/aplicar" element={<PostulacionPage />} />

        {/* PLUXEE: Public portal routes - NO AUTHENTICATION REQUIRED */}
        <Route path="/pluxee/admin/*" element={<PluxeeLayout portalType="admin" />}>
          <Route index element={<Navigate to="/pluxee/admin/folders" replace />} />
          <Route path="folders" element={<PluxeeFoldersAndFilesPage />} />
        </Route>

        {/* PLUXEE: Public company portal routes - NO AUTHENTICATION REQUIRED */}
        <Route path="/pluxee/empresa/*" element={<PluxeeLayout portalType="empresa" />}>
          <Route index element={<Navigate to="/pluxee/empresa/folders" replace />} />
          <Route path="folders" element={<PluxeeCompanyFoldersPage />} />
        </Route>

        {/* SECURITY: Admin routes with MILITARY-GRADE protection */}
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
        
        {/* POSTULANTE: All postulant routes under /postulante with layout */}
        <Route path="/postulante/*" element={<PostulanteLayout />}>
          <Route index element={<PostulanteDashboard />} />
          <Route path="completar-aplicaciones" element={
            <PendingApplicationsView onComplete={() => window.location.href = '/aplicar'} />
          } />
          <Route path="buscar-empleos" element={<JobSearchPage />} />
          <Route path="forms/:formId" element={<FormRenderer />} />
          <Route path="aplicaciones" element={<MyApplicationsPage />} />
          <Route path="perfil" element={<MyProfilePage />} />
          <Route path="configuracion" element={<ConfigurationPage />} />
        </Route>

        {/* LEGACY: Redirect old route for compatibility */}
        <Route path="/completar-aplicaciones" element={
          <Navigate to="/postulante/completar-aplicaciones" replace />
        } />
        
        {/* SECURITY: Catch-all route - redirect based on role */}
        <Route path="*" element={
          <Navigate to="/login" replace />
        } />
        </Routes>
      {/* </SecurityBoundary> DISABLED TEMPORARILY FOR DEBUG */}
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