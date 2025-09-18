import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PostulanteLayout } from './components/PostulanteLayout';
import { JobSearchPage } from './pages/JobSearchPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CompletarAplicacionesPage } from './pages/CompletarAplicacionesPage';
import { MiPerfilPage } from './pages/MiPerfilPage';

function App() {
  return (
    <Router>
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
      </Routes>
    </Router>
  );
}

export default App;
