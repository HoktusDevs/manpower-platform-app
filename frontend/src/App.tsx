import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { MigrationDashboard } from './pages/admin/MigrationDashboard';
import { PostulanteDashboard } from './pages/postulante/PostulanteDashboard';
import { RoleGuard } from './components/RoleGuard';
import { SecurityBoundary } from './components/SecurityBoundary';
import { useRouteProtection } from './hooks/useRouteProtection';
import { authService } from './services/authService';
import { migrationService } from './services/migrationService';

function App() {
  // SECURITY: Initialize route protection
  useRouteProtection();
  
  // Initialize migration service
  React.useEffect(() => {
    // Ensure migration service is configured properly
    console.log('🔀 Migration service initialized with config:', migrationService.getConfig());
  }, []);
  
  // Redirect based on authentication status
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();
  
  const getDefaultRedirect = () => {
    if (isAuthenticated && user) {
      // SECURITY: Force role-based redirection
      return user.role === 'admin' ? '/admin' : '/postulante';
    }
    return '/login';
  };

  return (
    <Router>
      <SecurityBoundary>
        <Routes>
          <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          {/* SECURITY: Admin routes with MILITARY-GRADE protection */}
          <Route path="/admin" element={
            <RoleGuard requiredRole="admin">
              <AdminDashboard />
            </RoleGuard>
          } />
          <Route path="/admin/migration" element={
            <RoleGuard requiredRole="admin">
              <MigrationDashboard />
            </RoleGuard>
          } />
          
          {/* SECURITY: Postulante routes with STRICT limitations */}
          <Route path="/postulante/*" element={
            <RoleGuard requiredRole="postulante">
              <PostulanteDashboard />
            </RoleGuard>
          } />
          
          {/* SECURITY: Catch-all route - redirect based on role */}
          <Route path="*" element={
            <Navigate to={getDefaultRedirect()} replace />
          } />
        </Routes>
      </SecurityBoundary>
    </Router>
  )
}

export default App