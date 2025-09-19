import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PostulanteLayout } from './components/PostulanteLayout';
import { JobSearchPage } from './pages/JobSearchPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CompletarAplicacionesPage } from './pages/CompletarAplicacionesPage';
import { MiPerfilPage } from './pages/MiPerfilPage';
import { cognitoAuthService } from './services/cognitoAuthService';
import { useEffect, useState } from 'react';

function AppContent() {
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuthentication = () => {
      console.log('🔐 Checking authentication status...');

      cognitoAuthService.initialize();

      const isAuthenticated = cognitoAuthService.isAuthenticated();
      const isTokenValid = cognitoAuthService.isTokenValid();

      console.log('🔍 Auth check results:', { isAuthenticated, isTokenValid });

      if (!isAuthenticated || !isTokenValid) {
        console.log('❌ No valid authentication found - redirecting to auth-frontend');
        localStorage.clear();
        window.location.href = 'http://localhost:6100/login?redirect=applicant';
        return;
      }

      const user = cognitoAuthService.getCurrentUser();
      if (!user || user.role !== 'postulante') {
        console.log('❌ User is not postulante - redirecting to auth-frontend');
        localStorage.clear();
        window.location.href = 'http://localhost:6100/login?redirect=applicant&error=access_denied';
        return;
      }

      console.log('✅ Valid postulante authentication found');
      setIsAuthChecked(true);
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
    <Routes>
      <Route
        path="/"
        element={
          <PostulanteLayout>
            <Navigate to="/buscar-empleos" replace />
          </PostulanteLayout>
        }
      />
      <Route
        path="/buscar-empleos"
        element={
          <PostulanteLayout>
            <JobSearchPage />
          </PostulanteLayout>
        }
      />
      <Route
        path="/mis-aplicaciones"
        element={
          <PostulanteLayout>
            <ApplicationsPage />
          </PostulanteLayout>
        }
      />
      <Route
        path="/completar-aplicaciones"
        element={
          <PostulanteLayout>
            <CompletarAplicacionesPage />
          </PostulanteLayout>
        }
      />
      <Route
        path="/perfil"
        element={
          <PostulanteLayout>
            <MiPerfilPage />
          </PostulanteLayout>
        }
      />

      {/* Catch-all route - redirect to auth-frontend login */}
      <Route path="*" element={
        <Navigate to="http://localhost:6100/login" replace />
      } />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
