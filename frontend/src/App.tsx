// import React from 'react'; // Not needed in modern React
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
import { useAuth } from './hooks/useAuth';
// import { migrationService } from './services/migrationService'; // Not used in component

function AppContent() {
  // SECURITY: Initialize route protection (now inside Router context)
  useRouteProtection();
  
  // Use the auth hook to get reactive authentication state
  const { isAuthenticated, user } = useAuth();
  
  const getDefaultRedirect = () => {
    if (isAuthenticated && user) {
      // SECURITY: Force role-based redirection
      return user.role === 'admin' ? '/admin' : '/postulante';
    }
    return '/login';
  };

  return (
    <SecurityBoundary>
      <Routes>
        <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        
        {/* SECURITY: Admin routes with MILITARY-GRADE protection */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/migration" element={
          <RoleGuard requiredRole="admin">
            <MigrationDashboard />
          </RoleGuard>
        } />
        
        {/* SECURITY: Postulante routes with STRICT limitations */}
        <Route path="/postulante/*" element={<PostulanteDashboard />} />
        
        {/* SECURITY: Catch-all route - redirect based on role */}
        <Route path="*" element={
          <Navigate to={getDefaultRedirect()} replace />
        } />
      </Routes>
    </SecurityBoundary>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App