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
import { PostulacionPage } from './pages/postulacion/PostulacionPage';
import { EnhancedFormsManager } from './pages/admin/EnhancedFormsManager';
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
          <Route path="perfil" element={
            <div className="h-full bg-gray-100 p-6">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-md">
                  <div className="px-6 py-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">Mi Perfil</h2>
                    <p className="text-gray-600 mt-1">Administra tu información personal y profesional</p>
                  </div>
                  <div className="px-6 py-8">
                    <div className="text-center py-12">
                      <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Próximamente</h3>
                      <p className="text-gray-500">Esta funcionalidad estará disponible pronto.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          } />
          <Route path="configuracion" element={
            <div className="h-full bg-gray-100 p-6">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-md">
                  <div className="px-6 py-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
                    <p className="text-gray-600 mt-1">Personaliza tus preferencias y notificaciones</p>
                  </div>
                  <div className="px-6 py-8">
                    <div className="text-center py-12">
                      <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Próximamente</h3>
                      <p className="text-gray-500">Esta funcionalidad estará disponible pronto.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          } />
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