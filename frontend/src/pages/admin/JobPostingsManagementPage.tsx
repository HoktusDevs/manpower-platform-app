import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useGraphQL } from '../../hooks/useGraphQL';
import type { JobPosting } from '../../services/graphqlService';

const getStatusColor = (status: JobPosting['status']) => {
  switch (status) {
    case 'PUBLISHED': return 'bg-green-100 text-green-800 border-green-200';
    case 'DRAFT': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'PAUSED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'EXPIRED': return 'bg-red-100 text-red-800 border-red-200';
    case 'CLOSED': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusText = (status: JobPosting['status']) => {
  switch (status) {
    case 'PUBLISHED': return 'Publicado';
    case 'DRAFT': return 'Borrador';
    case 'PAUSED': return 'Pausado';
    case 'EXPIRED': return 'Expirado';
    case 'CLOSED': return 'Cerrado';
    default: return status;
  }
};

const getEmploymentTypeText = (type: JobPosting['employmentType']) => {
  switch (type) {
    case 'FULL_TIME': return 'Tiempo Completo';
    case 'PART_TIME': return 'Medio Tiempo';
    case 'CONTRACT': return 'Contrato';
    case 'FREELANCE': return 'Freelance';
    case 'INTERNSHIP': return 'Práctica';
    case 'TEMPORARY': return 'Temporal';
    default: return type;
  }
};

const getExperienceLevelText = (level: JobPosting['experienceLevel']) => {
  switch (level) {
    case 'ENTRY_LEVEL': return 'Junior';
    case 'MID_LEVEL': return 'Semi-Senior';
    case 'SENIOR_LEVEL': return 'Senior';
    case 'EXECUTIVE': return 'Ejecutivo';
    case 'INTERNSHIP': return 'Práctica';
    default: return level;
  }
};

const statusOptions: JobPosting['status'][] = ['DRAFT', 'PUBLISHED', 'PAUSED', 'EXPIRED', 'CLOSED'];

export const JobPostingsManagementPage: React.FC = () => {
  const { user: authUser, isAuthenticated } = useAuth();
  const {
    jobPostings,
    loading,
    error,
    fetchAllJobPostings,
    clearError,
    isGraphQLAvailable
  } = useGraphQL();

  const [selectedStatus, setSelectedStatus] = useState<JobPosting['status'] | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authUser?.role === 'admin' && isAuthenticated && isGraphQLAvailable()) {
      const statusFilter = selectedStatus === 'ALL' ? undefined : selectedStatus;
      fetchAllJobPostings(statusFilter);
    }
  }, [authUser, isAuthenticated, isGraphQLAvailable, selectedStatus, fetchAllJobPostings]);

  // Filter job postings by search term
  const filteredJobPostings = jobPostings.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group job postings by status for summary
  const statusSummary = jobPostings.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {} as Record<JobPosting['status'], number>);

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
            La gestión de empleos requiere GraphQL. Verifica la configuración.
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
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Ofertas de Trabajo</h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              const statusFilter = selectedStatus === 'ALL' ? undefined : selectedStatus;
              fetchAllJobPostings(statusFilter);
            }}
            disabled={loading}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : '🔄 Actualizar'}
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(statusSummary).map(([status, count]) => (
          <div
            key={status}
            className={`relative rounded-lg border-2 p-4 ${getStatusColor(status as JobPosting['status'])}`}
          >
            <div className="text-center">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs font-medium uppercase tracking-wide">
                {getStatusText(status as JobPosting['status'])}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Card */}
      <div className="mt-6 bg-white shadow rounded-lg">
        <div className="p-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por título, empresa o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as JobPosting['status'] | 'ALL')}
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

          {/* Job Postings Table */}
          <div className="mt-6">
            {loading && !jobPostings.length ? (
              <div className="space-y-4">
                {/* Skeleton for table */}
                <div className="overflow-hidden border border-gray-200 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Título / Empresa
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ubicación / Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Detalles
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {[...Array(5)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-32"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded w-36 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-28"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-3 bg-gray-200 rounded w-40 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-28 mb-1"></div>
                            <div className="h-2 bg-gray-200 rounded w-24"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : filteredJobPostings.length === 0 ? (
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
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-8 0h8m-8 0a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron ofertas de trabajo</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Intenta con diferentes términos de búsqueda.' : 'No hay ofertas de trabajo con el filtro seleccionado.'}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden border border-gray-200 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Título / Empresa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ubicación / Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Detalles
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredJobPostings.map((job) => (
                      <tr key={job.jobId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{job.title}</div>
                            <div className="text-sm text-gray-500">{job.companyName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{job.location}</div>
                          <div className="text-sm text-gray-500">{getEmploymentTypeText(job.employmentType)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(job.status)}`}>
                            {getStatusText(job.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="text-sm text-gray-500">
                              Experiencia: {getExperienceLevelText(job.experienceLevel)}
                            </div>
                            {job.salary && (
                              <div className="text-sm text-gray-500">Salario: {job.salary}</div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              Creado: {new Date(job.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};