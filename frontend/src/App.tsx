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
import { AdminLayout } from './components/AdminLayout';
import { PostulanteDashboard } from './pages/postulante/PostulanteDashboard';
import { EnhancedFormsManager } from './pages/admin/EnhancedFormsManager';
import { FormRenderer } from './pages/postulante/FormRenderer';
import { RoleGuard } from './components/RoleGuard';
import { SessionRenewalModal } from './components/SessionRenewalModal';
import { ToastProvider } from './core-ui';
import { graphqlService } from './services/graphqlService';
import { cognitoAuthService } from './services/cognitoAuthService';
import { useTokenMonitor } from './hooks/useTokenMonitor';
import { useEffect } from 'react';
// import { migrationService } from './services/migrationService'; // Not used in component

function AppContent() {
  // SECURITY: Initialize route protection (now inside Router context)
  // TEMPORARY: Disabled for debugging redirect loop
  // useRouteProtection();
  
  // Remove unused auth state - authentication handled by RoleGuard

  // Token expiration monitoring
  const isAuthenticated = cognitoAuthService.isAuthenticated();
  const { 
    showRenewalModal, 
    timeRemaining, 
    isRenewing, 
    renewSession, 
    dismissModal 
  } = useTokenMonitor(isAuthenticated);

  const handleLogout = () => {
    dismissModal();
    cognitoAuthService.logout();
    window.location.href = '/login';
  };

  // Initialize GraphQL service
  useEffect(() => {
    const initGraphQL = async () => {
      if (!graphqlService.isInitialized()) {
        const config = {
          graphqlEndpoint: import.meta.env.VITE_GRAPHQL_URL || '',
          region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
          authenticationType: 'AMAZON_COGNITO_USER_POOLS' as const,
          userPoolId: import.meta.env.VITE_USER_POOL_ID,
          userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID
        };

        if (config.graphqlEndpoint) {
          await graphqlService.initialize(config);
        }
      }
    };

    initGraphQL();
  }, []);
  
  // Simple approach - just redirect everyone to login initially
  // This should stop any bouncing issues

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
        
        {/* SECURITY: Admin routes with MILITARY-GRADE protection */}
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="migration" element={
            <RoleGuard requiredRole="admin">
              <MigrationDashboard />
            </RoleGuard>
          } />
          <Route path="forms/*" element={
            <RoleGuard requiredRole="admin">
              <EnhancedFormsManager />
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
          <Route path="users" element={
            <RoleGuard requiredRole="admin">
              <div className="p-6">
                <h1 className="text-2xl font-bold mb-6">Administrar Usuarios</h1>
                <p className="text-gray-600">Panel de administración de usuarios próximamente disponible.</p>
              </div>
            </RoleGuard>
          } />
        </Route>
        
        {/* SECURITY: Postulante routes with STRICT limitations */}
        <Route path="/postulante/forms/:formId" element={
          <RoleGuard requiredRole="postulante">
            <FormRenderer />
          </RoleGuard>
        } />
        <Route path="/postulante/*" element={<PostulanteDashboard />} />
        
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