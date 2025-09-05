import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAWSNative } from '../../hooks/useAWSNative';
import { ApplicationsPage } from './ApplicationsPage';
import { FeatureFlagControl } from '../../components/FeatureFlagControl';

export const PostulanteDashboard = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { applications, getApplicationStats, isAWSNativeAvailable } = useAWSNative();
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get real-time stats from AWS-Native
  const stats = getApplicationStats();
  const isAWSNative = isAWSNativeAvailable();

  if (activeTab === 'applications') {
    return <ApplicationsPage />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span className="text-sm text-gray-600">Total:</span>
                <span className="ml-1 font-semibold text-gray-900">{stats.total}</span>
                <FeatureFlagControl feature="applications" className="ml-2" />
              </div>

              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span className="text-sm text-gray-600">Aprobadas:</span>
                <span className="ml-1 font-semibold text-gray-900">{stats.approved}</span>
              </div>

              <div className="flex items-center">
                <svg className="h-5 w-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span className="text-sm text-gray-600">En Revisión:</span>
                <span className="ml-1 font-semibold text-gray-900">{stats.inReview}</span>
              </div>

              <div className="flex items-center">
                <svg className="h-5 w-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span className="text-sm text-gray-600">Pendientes:</span>
                <span className="ml-1 font-semibold text-gray-900">{stats.pending}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {user?.fullName || 'Postulante'}
              </span>
              <button 
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition duration-200"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Postulaciones Disponibles</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                <h4 className="font-medium text-gray-900">Desarrollador Frontend</h4>
                <p className="text-sm text-gray-600 mt-1">React, TypeScript, TailwindCSS</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Activa</span>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Ver detalles
                  </button>
                </div>
              </div>

              <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                <h4 className="font-medium text-gray-900">Analista de Datos</h4>
                <p className="text-sm text-gray-600 mt-1">Python, SQL, PowerBI</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Activa</span>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Ver detalles
                  </button>
                </div>
              </div>

              <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                <h4 className="font-medium text-gray-900">Diseñador UX/UI</h4>
                <p className="text-sm text-gray-600 mt-1">Figma, Adobe XD, Prototipado</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Activa</span>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Ver detalles
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Mis Aplicaciones</h3>
                <button
                  onClick={() => setActiveTab('applications')}
                  className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  Ver todas →
                </button>
              </div>
            </div>
            <div className="p-6">
              {applications.length === 0 ? (
                <div className="text-center py-6">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No tienes aplicaciones</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {isAWSNative ? 
                      'Comienza creando tu primera aplicación con AWS-Native.' :
                      'El sistema se está migrando a la nueva arquitectura.'
                    }
                  </p>
                  {isAWSNative && (
                    <div className="mt-6">
                      <button
                        onClick={() => setActiveTab('applications')}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                      >
                        🚀 Nueva Aplicación
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.slice(0, 3).map((app) => (
                    <div key={app.applicationId} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{app.companyName}</h4>
                          <p className="text-sm text-gray-600">{app.position}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(app.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          app.status === 'APPROVED' ? 'text-green-600 bg-green-100' :
                          app.status === 'IN_REVIEW' ? 'text-yellow-600 bg-yellow-100' :
                          app.status === 'PENDING' ? 'text-gray-600 bg-gray-100' :
                          app.status === 'REJECTED' ? 'text-red-600 bg-red-100' :
                          'text-blue-600 bg-blue-100'
                        }`}>
                          {app.status === 'APPROVED' ? 'Aprobada' :
                           app.status === 'IN_REVIEW' ? 'En Revisión' :
                           app.status === 'PENDING' ? 'Pendiente' :
                           app.status === 'REJECTED' ? 'Rechazada' :
                           app.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {applications.length > 3 && (
                    <div className="text-center pt-4">
                      <button
                        onClick={() => setActiveTab('applications')}
                        className="text-sm text-indigo-600 hover:text-indigo-500"
                      >
                        Ver {applications.length - 3} aplicaciones más
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};