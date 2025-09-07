import React, { useState, useEffect } from 'react';
import { useGraphQL } from '../../hooks/useGraphQL';
import { cognitoAuthService } from '../../services/cognitoAuthService';
import type { JobPosting, CreateApplicationInput } from '../../services/graphqlService';

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

const getEmploymentTypeColor = (type: JobPosting['employmentType']) => {
  switch (type) {
    case 'FULL_TIME': return 'bg-green-100 text-green-800';
    case 'PART_TIME': return 'bg-blue-100 text-blue-800';
    case 'CONTRACT': return 'bg-purple-100 text-purple-800';
    case 'FREELANCE': return 'bg-yellow-100 text-yellow-800';
    case 'INTERNSHIP': return 'bg-indigo-100 text-indigo-800';
    case 'TEMPORARY': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
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

const getExperienceLevelColor = (level: JobPosting['experienceLevel']) => {
  switch (level) {
    case 'ENTRY_LEVEL': return 'bg-green-50 text-green-700 border-green-200';
    case 'MID_LEVEL': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'SENIOR_LEVEL': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'EXECUTIVE': return 'bg-red-50 text-red-700 border-red-200';
    case 'INTERNSHIP': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export const JobPostingsPage: React.FC = () => {
  const {
    jobPostings,
    loading,
    error,
    fetchActiveJobPostings,
    createApplication,
    clearError,
    isGraphQLAvailable
  } = useGraphQL();

  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<JobPosting['employmentType'] | 'ALL'>('ALL');
  const [experienceLevelFilter, setExperienceLevelFilter] = useState<JobPosting['experienceLevel'] | 'ALL'>('ALL');
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const user = cognitoAuthService.getCurrentUser();

  useEffect(() => {
    if (user?.role === 'postulante' && isGraphQLAvailable()) {
      fetchActiveJobPostings(50); // Limit to 50 for performance
    }
  }, [user, isGraphQLAvailable, fetchActiveJobPostings]);

  // Filter job postings
  const filteredJobPostings = jobPostings.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = !locationFilter || 
                           job.location.toLowerCase().includes(locationFilter.toLowerCase());
    
    const matchesEmploymentType = employmentTypeFilter === 'ALL' || 
                                 job.employmentType === employmentTypeFilter;
    
    const matchesExperienceLevel = experienceLevelFilter === 'ALL' || 
                                  job.experienceLevel === experienceLevelFilter;

    return matchesSearch && matchesLocation && matchesEmploymentType && matchesExperienceLevel;
  });

  // Get unique locations for filter
  const availableLocations = [...new Set(jobPostings.map(job => job.location))];

  const handleApplyToJob = async (job: JobPosting) => {
    if (!user) return;

    const applicationData: CreateApplicationInput = {
      companyName: job.companyName,
      position: job.title,
      description: `Aplicación para: ${job.title}`,
      salary: job.salary,
      location: job.location,
      companyId: job.companyId
    };

    const success = await createApplication(applicationData);
    
    if (success) {
      alert('¡Aplicación enviada exitosamente!');
      setSelectedJob(null);
      setShowApplicationForm(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isJobExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
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

  if (!isGraphQLAvailable()) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-yellow-800 font-medium">🚀 Ofertas de Trabajo</h3>
          <p className="text-yellow-700 mt-1">
            Las ofertas de trabajo requieren GraphQL. Verifica la configuración.
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
          <h1 className="text-2xl font-semibold text-gray-900">Ofertas de Trabajo</h1>
          <p className="mt-2 text-sm text-gray-700 flex items-center">
            Explora las mejores oportunidades laborales disponibles.
            <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
              📡 En Vivo
            </span>
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => fetchActiveJobPostings(50)}
            disabled={loading}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : '🔄 Actualizar Ofertas'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <input
            type="text"
            placeholder="Buscar por título, empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Todas las ubicaciones</option>
            {availableLocations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={employmentTypeFilter}
            onChange={(e) => setEmploymentTypeFilter(e.target.value as JobPosting['employmentType'] | 'ALL')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="ALL">Todos los tipos</option>
            <option value="FULL_TIME">Tiempo Completo</option>
            <option value="PART_TIME">Medio Tiempo</option>
            <option value="CONTRACT">Contrato</option>
            <option value="FREELANCE">Freelance</option>
            <option value="INTERNSHIP">Práctica</option>
            <option value="TEMPORARY">Temporal</option>
          </select>
        </div>
        <div>
          <select
            value={experienceLevelFilter}
            onChange={(e) => setExperienceLevelFilter(e.target.value as JobPosting['experienceLevel'] | 'ALL')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="ALL">Todos los niveles</option>
            <option value="ENTRY_LEVEL">Junior</option>
            <option value="MID_LEVEL">Semi-Senior</option>
            <option value="SENIOR_LEVEL">Senior</option>
            <option value="EXECUTIVE">Ejecutivo</option>
            <option value="INTERNSHIP">Práctica</option>
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

      {/* Job Postings List */}
      <div className="mt-8">
        {loading && !jobPostings.length ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Cargando ofertas de trabajo...</p>
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
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron ofertas de trabajo</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || locationFilter || employmentTypeFilter !== 'ALL' || experienceLevelFilter !== 'ALL'
                ? 'Intenta ajustar los filtros de búsqueda.'
                : 'No hay ofertas de trabajo disponibles en este momento.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {filteredJobPostings.map((job) => (
              <div key={job.jobId} className="bg-white shadow rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{job.title}</h3>
                      <p className="text-sm text-gray-600 font-medium">{job.companyName}</p>
                    </div>
                    {isJobExpired(job.expiresAt) && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Expirado
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {job.location}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEmploymentTypeColor(job.employmentType)}`}>
                        {getEmploymentTypeText(job.employmentType)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getExperienceLevelColor(job.experienceLevel)}`}>
                        {getExperienceLevelText(job.experienceLevel)}
                      </span>
                    </div>

                    {job.salary && (
                      <div className="flex items-center text-sm font-medium text-green-600">
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        {job.salary}
                      </div>
                    )}

                    <p className="text-sm text-gray-600 line-clamp-3">
                      {job.description}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Publicado: {formatDate(job.createdAt)}
                      {job.expiresAt && (
                        <div className="mt-1">
                          Expira: {formatDate(job.expiresAt)}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                      >
                        Ver Detalles
                      </button>
                      {!isJobExpired(job.expiresAt) && (
                        <button
                          onClick={() => handleApplyToJob(job)}
                          disabled={loading}
                          className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-500 disabled:opacity-50"
                        >
                          Aplicar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedJob.title}</h2>
                <p className="text-lg text-gray-600">{selectedJob.companyName}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Descripción del Trabajo</h3>
                  <div className="text-gray-700 whitespace-pre-line">
                    {selectedJob.description}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Requisitos</h3>
                  <div className="text-gray-700 whitespace-pre-line">
                    {selectedJob.requirements}
                  </div>
                </div>

                {selectedJob.benefits && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Beneficios</h3>
                    <div className="text-gray-700 whitespace-pre-line">
                      {selectedJob.benefits}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Detalles del Trabajo</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ubicación:</span>
                      <span className="text-gray-900">{selectedJob.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo:</span>
                      <span className="text-gray-900">{getEmploymentTypeText(selectedJob.employmentType)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Experiencia:</span>
                      <span className="text-gray-900">{getExperienceLevelText(selectedJob.experienceLevel)}</span>
                    </div>
                    {selectedJob.salary && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Salario:</span>
                        <span className="text-gray-900 font-medium">{selectedJob.salary}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Publicado:</span>
                      <span className="text-gray-900">{formatDate(selectedJob.createdAt)}</span>
                    </div>
                    {selectedJob.expiresAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Expira:</span>
                        <span className="text-gray-900">{formatDate(selectedJob.expiresAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {!isJobExpired(selectedJob.expiresAt) && (
                  <button
                    onClick={() => handleApplyToJob(selectedJob)}
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? 'Aplicando...' : 'Aplicar a este Trabajo'}
                  </button>
                )}

                {isJobExpired(selectedJob.expiresAt) && (
                  <div className="w-full bg-red-100 text-red-800 px-4 py-2 rounded-md text-center text-sm font-medium">
                    Esta oferta ha expirado
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};