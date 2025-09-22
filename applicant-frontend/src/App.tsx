import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PostulanteLayout } from './components/PostulanteLayout';
import { JobSearchPage } from './pages/JobSearchPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CompletarAplicacionesPage } from './pages/CompletarAplicacionesPage';
import { MiPerfilPage } from './pages/MiPerfilPage';
import { AplicarPage } from './pages/AplicarPage';
import { RedirectToLogin } from './components/RedirectToLogin';
import { useEffect, useState } from 'react';

function AppContent() {
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    setIsAuthChecked(true);
  }, []);

  // Mostrar loading mientras se verifica la autenticación
  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticación...</p>
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
