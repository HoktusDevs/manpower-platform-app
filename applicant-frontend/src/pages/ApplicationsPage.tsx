import { useState, useEffect } from 'react';
import type { Application } from '../types';
import { applicationsService } from '../services/applicationsService';
import { JobDetailsModal } from '../components/JobDetailsModal';
import { ConfirmModal } from '../components/ConfirmModal';

export const ApplicationsPage = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger',
    isLoading: false
  });

  // Cargar aplicaciones al montar el componente
  useEffect(() => {
    const loadApplications = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await applicationsService.getMyApplications();
        
        if (response.success && response.applications) {
          setApplications(response.applications);
        } else {
          setError(response.message || 'Error al cargar aplicaciones');
        }
      } catch (err) {
        console.error('Error loading applications:', err);
        setError('Error de conexión al cargar aplicaciones');
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, []);


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper function to show confirmation modal
  const showConfirmModal = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: 'danger' | 'warning' | 'info' = 'danger'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      variant,
      isLoading: false
    });
  };

  // Helper function to close confirmation modal
  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // Set modal loading state
  const setModalLoading = (loading: boolean) => {
    setConfirmModal(prev => ({ ...prev, isLoading: loading }));
  };

  // Show error modal
  const showErrorModal = (title: string, message: string) => {
    showConfirmModal(
      title,
      message,
      () => closeConfirmModal(),
      'danger'
    );
  };

  const handleDeleteApplication = async (applicationId: string) => {
    showConfirmModal(
      'Eliminar aplicación',
      '¿Estás seguro de que quieres eliminar esta aplicación?',
      async () => {
        setModalLoading(true);

        try {
          const response = await applicationsService.deleteApplication(applicationId);

          if (response.success) {
            setApplications(prev => prev.filter(app => app.applicationId !== applicationId));
            closeConfirmModal();
          } else {
            closeConfirmModal();
            showErrorModal('Error al eliminar', response.message || 'No se pudo eliminar la aplicación');
          }
        } catch (err) {
          console.error('Error deleting application:', err);
          closeConfirmModal();
          showErrorModal('Error al eliminar', 'Error de conexión al eliminar la aplicación');
        }
      },
      'danger'
    );
  };

  const handleCardClick = (application: Application) => {
    setSelectedApplication(application);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedApplication(null);
  };

  // Mostrar loading
  if (loading) {
    return (
      <div className="h-full bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Mis Aplicaciones</h2>
            </div>
            <div className="px-6 py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando aplicaciones...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="h-full bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Mis Aplicaciones</h2>
            </div>
            <div className="px-6 py-8 text-center">
              <div className="text-red-600 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar aplicaciones</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Mis Aplicaciones</h2>
            <p className="text-gray-600 mt-1">
              Gestiona y revisa el estado de tus aplicaciones
            </p>
          </div>

          <div className="px-6 py-4">
            {applications.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes aplicaciones</h3>
                <p className="text-gray-600 mb-4">
                  Aún no has aplicado a ningún puesto de trabajo.
                </p>
                <a
                  href="/buscar-empleos"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-block"
                >
                  Buscar Empleos
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <div
                    key={application.applicationId}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer bg-white"
                    onClick={() => handleCardClick(application)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {application.position}
                          </h3>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="font-medium">{application.title}</span>
                          {application.location && application.location !== 'Por definir' && (
                            <>
                              <span>•</span>
                              <span>{application.location}</span>
                            </>
                          )}
                          {application.salary && (
                            <>
                              <span>•</span>
                              <span className="text-green-600 font-medium">{application.salary}</span>
                            </>
                          )}
                        </div>

                        {application.description && (
                          <p className="text-gray-700 mb-3 line-clamp-2">
                            {application.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            Aplicado el {formatDate(application.createdAt)}
                          </span>
                          {application.updatedAt !== application.createdAt && (
                            <span>
                              • Actualizado el {formatDate(application.updatedAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteApplication(application.applicationId);
                          }}
                          className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Eliminar aplicación"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {applications.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="text-sm text-gray-600">
                Total: {applications.length} aplicación{applications.length > 1 ? 'es' : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalles del trabajo */}
      <JobDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        application={selectedApplication}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        isLoading={confirmModal.isLoading}
      />
    </div>
  );
};