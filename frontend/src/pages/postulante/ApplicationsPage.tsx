import React, { useState, useEffect } from 'react';
import { useAWSNative } from '../../hooks/useAWSNative';
import { useGraphQL } from '../../hooks/useGraphQL';
import { cognitoAuthService } from '../../services/cognitoAuthService';
import { FeatureFlagControl } from '../../components/FeatureFlagControl';

interface Application {
  userId: string;
  applicationId: string;
  companyName: string;
  position: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW' | 'INTERVIEW_SCHEDULED' | 'HIRED';
  description?: string;
  salary?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  companyId?: string;
}

const getStatusColor = (status: Application['status']) => {
  switch (status) {
    case 'PENDING': return 'bg-yellow-100 text-yellow-800';
    case 'APPROVED': return 'bg-green-100 text-green-800';
    case 'REJECTED': return 'bg-red-100 text-red-800';
    case 'IN_REVIEW': return 'bg-blue-100 text-blue-800';
    case 'INTERVIEW_SCHEDULED': return 'bg-purple-100 text-purple-800';
    case 'HIRED': return 'bg-emerald-100 text-emerald-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status: Application['status']) => {
  switch (status) {
    case 'PENDING': return 'Pendiente';
    case 'APPROVED': return 'Aprobado';
    case 'REJECTED': return 'Rechazado';
    case 'IN_REVIEW': return 'En Revisión';
    case 'INTERVIEW_SCHEDULED': return 'Entrevista Programada';
    case 'HIRED': return 'Contratado';
    default: return status;
  }
};

export const ApplicationsPage: React.FC = () => {
  // Use GraphQL service as primary, fallback to DynamoDB direct
  const graphQL = useGraphQL();
  const awsNative = useAWSNative();
  
  // Choose service based on availability
  const useGraphQLService = graphQL.isGraphQLAvailable();
  
  const {
    applications,
    loading,
    error,
    fetchMyApplications,
    createApplication,
    updateMyApplication,
    clearError
  } = useGraphQLService ? graphQL : {
    applications: awsNative.applications,
    loading: awsNative.loading,
    error: awsNative.error,
    fetchMyApplications: awsNative.fetchMyApplications,
    createApplication: awsNative.createApplication,
    updateMyApplication: awsNative.updateMyApplication,
    clearError: awsNative.clearError
  };

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingApp, setEditingApp] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    companyName: '',
    position: '',
    description: '',
    salary: '',
    location: ''
  });

  const user = cognitoAuthService.getCurrentUser();
  const isServiceAvailable = useGraphQLService ? graphQL.isGraphQLAvailable() : awsNative.isAWSNativeAvailable();

  useEffect(() => {
    if (user?.role === 'postulante' && isServiceAvailable) {
      fetchMyApplications();
    }
  }, [user, isServiceAvailable, fetchMyApplications]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName || !formData.position) {
      alert('Empresa y posición son obligatorios');
      return;
    }

    const success = await createApplication({
      jobId: 'temp-job-id', // TODO: Get actual jobId from job posting
      companyName: formData.companyName,
      position: formData.position,
      description: formData.description || undefined,
      salary: formData.salary || undefined,
      location: formData.location || undefined
    });

    if (success) {
      setShowCreateForm(false);
      setFormData({
        companyName: '',
        position: '',
        description: '',
        salary: '',
        location: ''
      });
    }
  };

  const handleEditSubmit = async (applicationId: string) => {
    const success = await updateMyApplication(applicationId, {
      companyName: formData.companyName,
      position: formData.position,
      description: formData.description || undefined,
      salary: formData.salary || undefined,
      location: formData.location || undefined
    });

    if (success) {
      setEditingApp(null);
      setFormData({
        companyName: '',
        position: '',
        description: '',
        salary: '',
        location: ''
      });
    }
  };

  const startEdit = (app: Application) => {
    setEditingApp(app.applicationId);
    setFormData({
      companyName: app.companyName,
      position: app.position,
      description: app.description || '',
      salary: app.salary || '',
      location: app.location || ''
    });
  };

  if (user?.role !== 'postulante') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Acceso Denegado</h3>
          <p className="text-red-600 mt-1">Solo los postulantes pueden ver esta página.</p>
        </div>
      </div>
    );
  }

  if (!isServiceAvailable) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-yellow-800 font-medium">🚀 {useGraphQLService ? 'Configurando GraphQL' : 'Migrando a AWS-Native'}</h3>
          <p className="text-yellow-700 mt-1">
            {useGraphQLService 
              ? 'El cliente GraphQL se está inicializando. Verifica las variables de entorno.' 
              : 'El sistema se está actualizando a la nueva arquitectura AWS-Native.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Mis Aplicaciones</h1>
          <p className="mt-2 text-sm text-gray-700 flex items-center">
            Gestiona todas tus aplicaciones de trabajo. 
            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
              useGraphQLService 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {useGraphQLService ? '📡 GraphQL' : '🔄 DynamoDB'}
            </span>
            <FeatureFlagControl feature="applications" showDetails className="ml-2" />
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Nueva Aplicación
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={clearError}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Nueva Aplicación</h3>
            <form onSubmit={handleCreateSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Empresa *</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Posición *</label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Descripción</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Salario</label>
                    <input
                      type="text"
                      value={formData.salary}
                      onChange={(e) => setFormData({...formData, salary: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ubicación</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear Aplicación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Applications List */}
      <div className="mt-8">
        {loading && !applications.length ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Cargando aplicaciones...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12">
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
            <p className="mt-1 text-sm text-gray-500">Comienza creando tu primera aplicación.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Nueva Aplicación
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {applications.map((app) => (
              <div key={app.applicationId} className="bg-white shadow rounded-lg p-6 border border-gray-200">
                {editingApp === app.applicationId ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleEditSubmit(app.applicationId); }}>
                    <div className="space-y-4">
                      <div>
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                          className="w-full text-lg font-medium border-b border-gray-300 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={formData.position}
                          onChange={(e) => setFormData({...formData, position: e.target.value})}
                          className="w-full text-sm text-gray-600 border-b border-gray-300 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingApp(null)}
                          className="text-sm text-gray-600 hover:text-gray-500"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="text-sm text-indigo-600 hover:text-indigo-500"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{app.companyName}</h3>
                        <p className="text-sm text-gray-600">{app.position}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                        {getStatusText(app.status)}
                      </span>
                    </div>
                    
                    {app.description && (
                      <p className="mt-2 text-sm text-gray-500">{app.description}</p>
                    )}
                    
                    <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
                      <div>
                        {app.salary && <span className="mr-3">💰 {app.salary}</span>}
                        {app.location && <span>📍 {app.location}</span>}
                      </div>
                      <div>
                        {new Date(app.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => startEdit(app)}
                        className="text-sm text-indigo-600 hover:text-indigo-500"
                      >
                        Editar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};