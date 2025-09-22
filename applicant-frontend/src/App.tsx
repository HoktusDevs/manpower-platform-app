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

  // Manejar autenticación de forma secuencial (como admin-frontend)
  useEffect(() => {
    const checkAuthentication = async () => {
      console.log('🔍 APPLICANT-FRONTEND: Checking authentication...');
      console.log('🔍 APPLICANT-FRONTEND: Current URL:', window.location.href);

      // Import SessionExchangeService
      const { SessionExchangeService } = await import('./services/sessionExchangeService');

      // Check if we have a sessionKey from URL
      const sessionKey = SessionExchangeService.getSessionKeyFromURL();
      console.log('🔍 APPLICANT-FRONTEND: SessionKey found:', !!sessionKey);

      if (sessionKey) {
        console.log('✅ APPLICANT-FRONTEND: SessionKey found, processing...');
        
        try {
          const result = await SessionExchangeService.exchangeSessionKey(sessionKey);
          console.log('🔍 APPLICANT-FRONTEND: Exchange result:', result);

          if (result.success && result.user?.userType === 'postulante') {
            console.log('✅ APPLICANT-FRONTEND: SessionKey exchange successful for postulante');
            setIsAuthChecked(true);
            return;
          } else {
            console.log('❌ APPLICANT-FRONTEND: SessionKey exchange failed or wrong user type');
            console.log('🔍 APPLICANT-FRONTEND: Success:', result.success);
            console.log('🔍 APPLICANT-FRONTEND: User type:', result.user?.userType);
            
            // Agregar delay para poder ver los logs
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            localStorage.clear();
            window.location.href = 'http://localhost:6100/login?redirect=applicant&error=session_exchange_failed';
            return;
          }
        } catch (error) {
          console.error('❌ APPLICANT-FRONTEND: Error during session exchange:', error);
          
          // Agregar delay para poder ver los logs
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          localStorage.clear();
          window.location.href = 'http://localhost:6100/login?redirect=applicant&error=session_exchange_error';
          return;
        }
      }

      // Check existing tokens (using same keys as sessionExchange)
      const authToken = localStorage.getItem('cognito_access_token');
      const authUser = localStorage.getItem('user');
      console.log('🔍 APPLICANT-FRONTEND: Existing tokens - Token:', !!authToken, 'User:', !!authUser);

      if (authToken && authUser) {
        try {
          const user = JSON.parse(authUser);
          console.log('🔍 APPLICANT-FRONTEND: User role:', user['custom:role']);
          
          if (user['custom:role'] === 'postulante') {
            console.log('✅ APPLICANT-FRONTEND: Valid existing tokens found');
            setIsAuthChecked(true);
            return;
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }

      // No valid authentication, redirect to login
      console.log('❌ APPLICANT-FRONTEND: No valid authentication, redirecting to login');
      
      // Agregar delay para poder ver los logs
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      localStorage.clear();
      window.location.href = 'http://localhost:6100/login?redirect=applicant';
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
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
