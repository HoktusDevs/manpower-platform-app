import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface Application {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  location: string;
  salary?: string;
  appliedDate: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  isActive: boolean; // true for active applications, false for inactive/closed
  description: string;
  employmentType: string;
}

export const MyApplicationsPage = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

  // Cargar aplicaciones del usuario
  useEffect(() => {
    const loadApplications = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Reemplazar con llamada real a la API
        console.log('🔄 Cargando aplicaciones para usuario:', user?.email);

        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock data - simulando aplicaciones del usuario
        const mockApplications: Application[] = [
          {
            applicationId: 'app-001',
            jobId: 'job-001',
            jobTitle: 'Desarrollador Full Stack',
            companyName: 'TechCorp Innovations',
            location: 'Madrid, España',
            salary: '45.000€ - 60.000€ anuales',
            appliedDate: '2024-01-15',
            status: 'IN_REVIEW',
            isActive: true,
            description: 'Desarrollo de aplicaciones web con React y Node.js',
            employmentType: 'Tiempo completo'
          },
          {
            applicationId: 'app-002',
            jobId: 'job-002',
            jobTitle: 'Diseñador UX/UI Senior',
            companyName: 'Design Studio Pro',
            location: 'Barcelona, España',
            salary: '40.000€ - 55.000€ anuales',
            appliedDate: '2024-01-10',
            status: 'PENDING',
            isActive: true,
            description: 'Diseño de experiencias digitales excepcionales',
            employmentType: 'Tiempo completo'
          },
          {
            applicationId: 'app-003',
            jobId: 'job-003',
            jobTitle: 'Analista de Datos',
            companyName: 'DataWorks Analytics',
            location: 'Valencia, España',
            salary: '38.000€ - 50.000€ anuales',
            appliedDate: '2024-01-05',
            status: 'APPROVED',
            isActive: false,
            description: 'Análisis de grandes volúmenes de información',
            employmentType: 'Tiempo completo'
          },
          {
            applicationId: 'app-004',
            jobId: 'job-004',
            jobTitle: 'Marketing Digital Specialist',
            companyName: 'Digital Growth Agency',
            location: 'Sevilla, España',
            salary: '25.000€ - 35.000€ anuales',
            appliedDate: '2023-12-20',
            status: 'REJECTED',
            isActive: false,
            description: 'Gestión de campañas digitales',
            employmentType: 'Tiempo parcial'
          },
          {
            applicationId: 'app-005',
            jobId: 'job-005',
            jobTitle: 'Desarrollador Backend',
            companyName: 'StartupTech Solutions',
            location: 'Remoto',
            appliedDate: '2023-12-15',
            status: 'EXPIRED',
            isActive: false,
            description: 'Desarrollo de APIs y servicios backend',
            employmentType: 'Tiempo completo'
          }
        ];

        console.log('✅ Aplicaciones cargadas:', mockApplications.length);
        setApplications(mockApplications);

      } catch (err) {
        console.error('❌ Error cargando aplicaciones:', err);
        setError('No se pudieron cargar tus aplicaciones. Por favor intenta de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, [user]);

  // Filtrar aplicaciones por estado activo/inactivo
  const activeApplications = applications.filter(app => app.isActive);
  const inactiveApplications = applications.filter(app => !app.isActive);
  const currentApplications = activeTab === 'active' ? activeApplications : inactiveApplications;

  // Función para obtener el estilo del estado
  const getStatusStyle = (status: Application['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'IN_REVIEW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Función para obtener el texto del estado
  const getStatusText = (status: Application['status']) => {
    switch (status) {
      case 'PENDING':
        return 'Pendiente de revisión';
      case 'IN_REVIEW':
        return 'En revisión';
      case 'APPROVED':
        return 'Aprobada';
      case 'REJECTED':
        return 'Rechazada';
      case 'EXPIRED':
        return 'Expirada';
      default:
        return status;
    }
  };

  // Skeleton loader component
  const ApplicationSkeleton = () => (
    <div className="border border-gray-200 rounded-lg p-6 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="flex justify-between items-center">
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  );

  return (
    <div className="h-full bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Mis Aplicaciones</h2>
            <p className="text-gray-600 mt-1">Gestiona y revisa el estado de todas tus postulaciones</p>

            {/* Stats */}
            {!loading && !error && (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{applications.length}</div>
                  <div className="text-sm text-blue-700">Total</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{activeApplications.length}</div>
                  <div className="text-sm text-green-700">Activas</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{inactiveApplications.length}</div>
                  <div className="text-sm text-gray-700">Finalizadas</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {applications.filter(app => app.status === 'IN_REVIEW').length}
                  </div>
                  <div className="text-sm text-yellow-700">En revisión</div>
                </div>
              </div>
            )}

            {/* Tabs */}
            {!loading && !error && (
              <div className="mt-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'active'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Activas ({activeApplications.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('inactive')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'inactive'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Finalizadas ({inactiveApplications.length})
                  </button>
                </nav>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {error ? (
              // Error State
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-red-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar aplicaciones</h3>
                <p className="text-gray-500 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            ) : loading ? (
              // Loading State with Skeleton
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <ApplicationSkeleton key={index} />
                ))}
              </div>
            ) : currentApplications.length === 0 ? (
              // Empty State
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No tienes aplicaciones {activeTab === 'active' ? 'activas' : 'finalizadas'}
                </h3>
                <p className="text-gray-500">
                  {activeTab === 'active'
                    ? 'Cuando apliques a trabajos, aparecerán aquí.'
                    : 'No tienes aplicaciones finalizadas aún.'
                  }
                </p>
              </div>
            ) : (
              // Applications List
              <div className="space-y-4">
                {currentApplications.map((application) => (
                  <div
                    key={application.applicationId}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {application.jobTitle}
                        </h3>
                        <div className="text-gray-600 mb-2">
                          <span className="font-medium">{application.companyName}</span>
                          <span className="mx-2">•</span>
                          <span>{application.location}</span>
                          <span className="mx-2">•</span>
                          <span>{application.employmentType}</span>
                        </div>
                        {application.salary && (
                          <div className="text-green-600 font-medium text-sm mb-2">
                            💰 {application.salary}
                          </div>
                        )}
                        <p className="text-gray-700 text-sm">{application.description}</p>
                      </div>
                      <div className="ml-4 flex flex-col items-end">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusStyle(application.status)}`}
                        >
                          {getStatusText(application.status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>
                        Aplicado el {new Date(application.appliedDate).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <button className="text-blue-600 hover:text-blue-800 font-medium">
                        Ver detalles →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};