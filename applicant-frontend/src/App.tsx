import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostulanteLayout } from './components/PostulanteLayout';
import { JobSearchPage } from './pages/JobSearchPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CompletarAplicacionesPage } from './pages/CompletarAplicacionesPage';
import { MiPerfilPage } from './pages/MiPerfilPage';
import { AplicarPage } from './pages/AplicarPage';
import { RedirectToLogin } from './components/RedirectToLogin';
import { useEffect, useState } from 'react';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Refetch al volver a la ventana
      retry: 2, // Reintentar 2 veces en caso de error
      staleTime: 2 * 60 * 1000, // 2 minutos - balance entre performance y freshness
      gcTime: 5 * 60 * 1000, // 5 minutos garbage collection (antes cacheTime en v4)
      refetchOnMount: 'always', // Siempre refetch al montar componente
    },
    mutations: {
      retry: 1, // Reintentar mutaciones 1 vez
    },
  },
});

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

        if (result.success) {
          setIsAuthChecked(true);
          return;
        } 
        // else {
        //   localStorage.clear();
        //   window.location.href = 'http://localhost:6100/login?redirect=applicant&error=session_exchange_failed';
        //   return;
        // }
      }

      // Check existing tokens
      const authToken = localStorage.getItem('cognito_access_token');
      const authUser = localStorage.getItem('user');

      if (authToken && authUser) {
        setIsAuthChecked(true);
        return;
      }

      // No valid authentication, redirect to login
      // localStorage.clear();
      // window.location.href = 'http://localhost:6100/login?redirect=applicant';
    };

    checkAuthentication();
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
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
