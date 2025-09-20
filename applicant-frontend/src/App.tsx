import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PostulanteLayout } from './components/PostulanteLayout';
import { JobSearchPage } from './pages/JobSearchPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CompletarAplicacionesPage } from './pages/CompletarAplicacionesPage';
import { MiPerfilPage } from './pages/MiPerfilPage';
import { RedirectToLogin } from './components/RedirectToLogin';
import { useEffect } from 'react';

function AppContent() {
  // NO VALIDATION AT ALL - just show the app
  useEffect(() => {
    console.log('🔍 APPLICANT-FRONTEND: Loading app without any validation');
    console.log('🔍 APPLICANT-FRONTEND: URL:', window.location.href);

    // Clean URL if it has sessionKey
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('sessionKey')) {
      console.log('✅ APPLICANT-FRONTEND: Cleaning sessionKey from URL');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
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
