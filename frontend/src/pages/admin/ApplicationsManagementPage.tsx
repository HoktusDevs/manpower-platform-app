import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useGraphQL } from '../../hooks/useGraphQL';
import { cognitoAuthService } from '../../services/cognitoAuthService';
import type { Application } from '../../services/graphqlService';

const getStatusColor = (status: Application['status']) => {
  switch (status) {
    case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
    case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
    case 'IN_REVIEW': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'INTERVIEW_SCHEDULED': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'HIRED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

const statusOptions: Application['status'][] = [
  'PENDING',
  'IN_REVIEW', 
  'APPROVED',
  'INTERVIEW_SCHEDULED',
  'HIRED',
  'REJECTED'
];

export const ApplicationsManagementPage: React.FC = () => {
  const { user: authUser, isAuthenticated } = useAuth();
  const {
    applications,
    loading,
    error,
    fetchAllApplications,
    updateApplicationStatus,
    clearError,
    isGraphQLAvailable
  } = useGraphQL();

  const [selectedStatus, setSelectedStatus] = useState<Application['status'] | 'ALL'>('ALL');
  const [editingApplication, setEditingApplication] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');


  useEffect(() => {
    // SKIP GraphQL fetch - just show empty applications interface
    console.log('⚠️ Skipping GraphQL applications fetch - showing empty interface');
    // TODO: Re-enable when GraphQL is properly configured
    // if (authUser?.role === 'admin' && isAuthenticated && isGraphQLAvailable()) {
    //   const statusFilter = selectedStatus === 'ALL' ? undefined : selectedStatus;
    //   fetchAllApplications(statusFilter);
    // }
  }, [authUser, isAuthenticated, isGraphQLAvailable, selectedStatus, fetchAllApplications]);

  const handleStatusChange = async (
    userId: string,
    applicationId: string,
    newStatus: Application['status']
  ) => {
    const success = await updateApplicationStatus(userId, applicationId, newStatus);
    
    if (success) {
      setEditingApplication(null);
      // Refresh the list
      const statusFilter = selectedStatus === 'ALL' ? undefined : selectedStatus;
      fetchAllApplications(statusFilter);
    }
  };

  // Filter applications by search term
  const filteredApplications = applications.filter(app => 
    app.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group applications by status for summary
  const statusSummary = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<Application['status'], number>);

  if (authUser?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Acceso Denegado</h3>
          <p className="text-red-600 mt-1">Solo los administradores pueden ver esta página.</p>
        </div>
      </div>
    );
  }

  if (!isGraphQLAvailable()) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-yellow-800 font-medium">🚀 Sistema de Gestión</h3>
          <p className="text-yellow-700 mt-1">
            La gestión de aplicaciones requiere GraphQL. Verifica la configuración.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Aplicaciones</h1>
          <p className="mt-2 text-sm text-gray-700 flex items-center">
            Administra todas las aplicaciones de trabajo del sistema.
            <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
              🛡️ ADMIN ONLY
            </span>
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              const statusFilter = selectedStatus === 'ALL' ? undefined : selectedStatus;
              fetchAllApplications(statusFilter);
            }}
            disabled={loading}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : '🔄 Actualizar'}
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(statusSummary).map(([status, count]) => (
          <div
            key={status}
            className={`relative rounded-lg border-2 p-4 ${getStatusColor(status as Application['status'])}`}
          >
            <div className="text-center">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs font-medium uppercase tracking-wide">
                {getStatusText(status as Application['status'])}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por empresa, posición o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as Application['status'] | 'ALL')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="ALL">Todos los Estados</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {getStatusText(status)}
              </option>
            ))}
          </select>
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

      {/* Applications Table */}
      <div className="mt-8">
        {loading && !applications.length ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Cargando aplicaciones...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron aplicaciones</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Intenta con diferentes términos de búsqueda.' : 'No hay aplicaciones con el filtro seleccionado.'}
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Postulante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa / Posición
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detalles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={app.applicationId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium text-xs text-gray-500 font-mono">
                        {app.userId.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{app.companyName}</div>
                      <div className="text-sm text-gray-500">{app.position}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingApplication === app.applicationId ? (
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.userId, app.applicationId, e.target.value as Application['status'])}
                          className="text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          {statusOptions.map(status => (
                            <option key={status} value={status}>
                              {getStatusText(status)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                          {getStatusText(app.status)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="space-y-1">
                        {app.salary && (
                          <div className="text-xs">💰 {app.salary}</div>
                        )}
                        {app.location && (
                          <div className="text-xs">📍 {app.location}</div>
                        )}
                        {app.description && (
                          <div className="text-xs text-gray-400 truncate max-w-xs" title={app.description}>
                            {app.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="text-xs">
                        Creado: {new Date(app.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs">
                        Actualizado: {new Date(app.updatedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingApplication === app.applicationId ? (
                        <button
                          onClick={() => setEditingApplication(null)}
                          className="text-gray-600 hover:text-gray-500 mr-3"
                        >
                          Cancelar
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingApplication(app.applicationId)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Cambiar Estado
                        </button>
                      )}
                      <button
                        onClick={() => {
                          // TODO: Implement view details functionality
                          alert(`Detalles de aplicación: ${app.applicationId}`);
                        }}
                        className="text-gray-600 hover:text-gray-500"
                      >
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};