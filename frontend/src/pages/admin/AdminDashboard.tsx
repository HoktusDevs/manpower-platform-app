import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAWSNative } from '../../hooks/useAWSNative';
import { FeatureFlagControl } from '../../components/FeatureFlagControl';

// interface Application {
//   userId: string;
//   applicationId: string;
//   companyName: string;
//   position: string;
//   status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW' | 'INTERVIEW_SCHEDULED' | 'HIRED';
//   description?: string;
//   salary?: string;
//   location?: string;
//   createdAt: string;
//   updatedAt: string;
//   companyId?: string;
// }

// Utility functions for future implementation
// const getStatusColor = (status: Application['status']) => {
//   switch (status) {
//     case 'PENDING': return 'bg-yellow-100 text-yellow-800';
//     case 'APPROVED': return 'bg-green-100 text-green-800';
//     case 'REJECTED': return 'bg-red-100 text-red-800';
//     case 'IN_REVIEW': return 'bg-blue-100 text-blue-800';
//     case 'INTERVIEW_SCHEDULED': return 'bg-purple-100 text-purple-800';
//     case 'HIRED': return 'bg-emerald-100 text-emerald-800';
//     default: return 'bg-gray-100 text-gray-800';
//   }
// };

// const getStatusText = (status: Application['status']) => {
//   switch (status) {
//     case 'PENDING': return 'Pendiente';
//     case 'APPROVED': return 'Aprobado';
//     case 'REJECTED': return 'Rechazado';
//     case 'IN_REVIEW': return 'En Revisión';
//     case 'INTERVIEW_SCHEDULED': return 'Entrevista Programada';
//     case 'HIRED': return 'Contratado';
//     default: return status;
//   }
// };

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const {
    // applications,
    // loading,
    // error,
    fetchAllApplications,
    // updateApplicationStatus,
    // getApplicationStats,
    isAWSNativeAvailable,
    // clearError
  } = useAWSNative();

  // const [selectedStatus, setSelectedStatus] = useState<Application['status'] | 'ALL'>('ALL');
  // const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const isAWSNative = isAWSNativeAvailable();
  // const stats = getApplicationStats();

  useEffect(() => {
    if (user?.role === 'admin' && isAWSNative) {
      fetchAllApplications();
    }
  }, [user, isAWSNative, fetchAllApplications]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // const handleStatusUpdate = async (userId: string, applicationId: string, newStatus: Application['status']) => {
  //   setUpdatingStatus(`${userId}-${applicationId}`);
  //   
  //   const success = await updateApplicationStatus(userId, applicationId, newStatus);
  //   
  //   if (success) {
  //     // Optionally refresh the list
  //     await fetchAllApplications();
  //   }
  //   
  //   setUpdatingStatus(null);
  // };

  // const filteredApplications = selectedStatus === 'ALL' 
  //   ? applications 
  //   : applications.filter(app => app.status === selectedStatus);

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <h3 className="text-red-800 font-medium">🚨 Acceso Denegado</h3>
          <p className="text-red-600 mt-2">Solo los administradores pueden acceder a este panel.</p>
          <button
            onClick={() => navigate('/postulante')}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Ir al Dashboard de Postulante
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold text-gray-900">
                📊 Admin Dashboard
              </h1>
              <FeatureFlagControl feature="applications" showDetails className="ml-4" />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {user?.fullName || 'Administrador'}
              </span>
              <button
                onClick={() => navigate('/admin/migration')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200"
              >
                🔀 Migration Dashboard
              </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Postulantes</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Postulaciones aprobadas</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pendientes</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Postulaciones activas</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Acciones Rápidas</h3>
            </div>
            <div className="p-6 space-y-4">
              <button className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 transition duration-200">
                Crear Nuevo Formulario
              </button>
              <button className="w-full bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 transition duration-200">
                Gestionar Postulaciones
              </button>
              <button className="w-full bg-purple-600 text-white px-4 py-3 rounded-md hover:bg-purple-700 transition duration-200">
                Ver Reportes
              </button>
              <button className="w-full bg-gray-600 text-white px-4 py-3 rounded-md hover:bg-gray-700 transition duration-200">
                Administrar Usuarios
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Actividad Reciente</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Nueva aplicación recibida</p>
                    <p className="text-xs text-gray-500">Hace 5 minutos</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Formulario actualizado</p>
                    <p className="text-xs text-gray-500">Hace 1 hora</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Postulante pendiente de revisión</p>
                    <p className="text-xs text-gray-500">Hace 2 horas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};