import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PostulanteLayout } from './components/PostulanteLayout';
import { JobSearchPage } from './pages/JobSearchPage';
import { ApplicationsPage } from './pages/ApplicationsPage';

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
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Completar Aplicaciones</h2>
                <p className="text-gray-600">Funcionalidad en desarrollo</p>
              </div>
            </PostulanteLayout>
          }
        />
        <Route
          path="/perfil"
          element={
            <PostulanteLayout>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Mi Perfil</h2>
                <p className="text-gray-600">Funcionalidad en desarrollo</p>
              </div>
            </PostulanteLayout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
