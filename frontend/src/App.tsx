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
import { AdminLayout } from './components/AdminLayout';
import { PostulanteDashboard } from './pages/postulante/PostulanteDashboard';
import { EnhancedFormsManager } from './pages/admin/EnhancedFormsManager';
import { FormRenderer } from './pages/postulante/FormRenderer';
import { RoleGuard } from './components/RoleGuard';
import { ToastProvider } from './core-ui';
import { graphqlService } from './services/graphqlService';
import { useEffect } from 'react';
import { Input } from './components/ui';
// import { migrationService } from './services/migrationService'; // Not used in component

function AppContent() {
  // SECURITY: Initialize route protection (now inside Router context)
  // TEMPORARY: Disabled for debugging redirect loop
  // useRouteProtection();
  
  // Remove unused auth state - authentication handled by RoleGuard

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
              <div className="p-6">
                <h1 className="text-2xl font-bold mb-6">Directorios y Archivos</h1>
                <div className="bg-white shadow rounded-lg p-6">
                  {/* Barra de herramientas */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
                    {/* Barra de búsqueda */}
                    <div className="flex-1 w-full sm:w-auto">
                      <Input
                        variant="search"
                        placeholder="Buscar archivos y carpetas..."
                        fullWidth
                      />
                    </div>
                    
                    {/* Botones de acción */}
                    <div className="flex gap-3 w-full sm:w-auto">
                      <button className="flex-1 sm:flex-none inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                        </svg>
                        Filtro
                      </button>
                      
                      <button className="flex-1 sm:flex-none inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                        Acciones
                      </button>
                      
                      <button className="flex-1 sm:flex-none inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Descargar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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