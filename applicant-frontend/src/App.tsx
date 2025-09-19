import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PostulanteLayout } from './components/PostulanteLayout';
import { JobSearchPage } from './pages/JobSearchPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CompletarAplicacionesPage } from './pages/CompletarAplicacionesPage';
import { MiPerfilPage } from './pages/MiPerfilPage';
import { useEffect, useState } from 'react';

function AppContent() {
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuthentication = async () => {
      // Import here to avoid circular dependency
      const { SessionExchangeService } = await import('./services/sessionExchangeService');

      // Check if we have a sessionKey from URL
      const sessionKey = SessionExchangeService.getSessionKeyFromURL();

      if (sessionKey) {
        const result = await SessionExchangeService.exchangeSessionKey(sessionKey);

        if (result.success && result.user?.userType === 'postulante') {
          setIsAuthChecked(true);
          return;
        } else {
          localStorage.clear();
          window.location.href = 'http://localhost:6100/login?redirect=applicant&error=session_exchange_failed';
          return;
        }
      }

      // Check existing tokens (using same keys as sessionExchange)
      const authToken = localStorage.getItem('cognito_access_token');
      const authUser = localStorage.getItem('user');

      if (authToken && authUser) {
        try {
          const user = JSON.parse(authUser);
          if (user['custom:role'] === 'postulante') {
            setIsAuthChecked(true);
            return;
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }

      // No valid authentication, redirect to login
      localStorage.clear();
      window.location.href = 'http://localhost:6100/login?redirect=applicant';
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
