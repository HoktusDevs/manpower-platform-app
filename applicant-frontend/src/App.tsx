import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PostulanteLayout } from './components/PostulanteLayout';
import { JobSearchPage } from './pages/JobSearchPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CompletarAplicacionesPage } from './pages/CompletarAplicacionesPage';
import { MiPerfilPage } from './pages/MiPerfilPage';
import { AplicarPage } from './pages/AplicarPage';
import { RedirectToLogin } from './components/RedirectToLogin';
import { useEffect } from 'react';

function AppContent() {
  // NO VALIDATION AT ALL - just show the app
  useEffect(() => {
    const handleSessionKey = async () => {
      console.log('🔍 APPLICANT-FRONTEND: URL:', window.location.href);

      // Extract sessionKey from URL
      const urlParams = new URLSearchParams(window.location.search);
      const sessionKey = urlParams.get('sessionKey');

      if (sessionKey) {
        console.log('✅ APPLICANT-FRONTEND: SessionKey found, processing...');

        // Import and use SessionExchangeService to process sessionKey
        const { SessionExchangeService } = await import('./services/sessionExchangeService');
        const result = await SessionExchangeService.exchangeSessionKey(sessionKey);

        console.log('🔍 APPLICANT-FRONTEND: Exchange result:', result);

        // Clean URL after processing
        window.history.replaceState({}, document.title, window.location.pathname);

        if (result.success) {
          console.log('✅ APPLICANT-FRONTEND: SessionKey exchange successful');
        } else {
          console.log('❌ APPLICANT-FRONTEND: SessionKey exchange failed, but continuing anyway');
        }
      } else {
        console.log('🔍 APPLICANT-FRONTEND: No sessionKey in URL');
      }
    };

    handleSessionKey();
  }, []);

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
      <Route
        path="/aplicar"
        element={<AplicarPage />}
      />

      {/* Catch-all route - redirect to auth-frontend login */}
      <Route path="*" element={<RedirectToLogin />} />
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
