import React, { useState, useEffect } from 'react';
import { useGraphQL } from '../../hooks/useGraphQL';
import { cognitoAuthService } from '../../services/cognitoAuthService';
import type { JobPosting, CreateJobPostingInput, UpdateJobPostingInput } from '../../services/graphqlService';

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
const employmentTypeOptions: JobPosting['employmentType'][] = [
  'FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'TEMPORARY'
];
const experienceLevelOptions: JobPosting['experienceLevel'][] = [
  'ENTRY_LEVEL', 'MID_LEVEL', 'SENIOR_LEVEL', 'EXECUTIVE', 'INTERNSHIP'
];

export const JobPostingsManagementPage: React.FC = () => {
  const {
    jobPostings,
    jobPostingStats,
    loading,
    error,
    fetchAllJobPostings,
    fetchJobPostingStats,
    createJobPosting,
    updateJobPosting,
    deleteJobPosting,
    publishJobPosting,
    pauseJobPosting,
    clearError,
    isGraphQLAvailable
  } = useGraphQL();

  const [selectedStatus, setSelectedStatus] = useState<JobPosting['status'] | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [formData, setFormData] = useState<CreateJobPostingInput>({
    title: '',
    description: '',
    requirements: '',
    salary: '',
    location: '',
    employmentType: 'FULL_TIME',
    companyName: '',
    companyId: '',
    benefits: '',
    experienceLevel: 'MID_LEVEL',
    expiresAt: ''
  });

  const user = cognitoAuthService.getCurrentUser();

  useEffect(() => {
    if (user?.role === 'admin' && isGraphQLAvailable()) {
      const statusFilter = selectedStatus === 'ALL' ? undefined : selectedStatus;
      fetchAllJobPostings(statusFilter);
      fetchJobPostingStats();
    }
  }, [user, isGraphQLAvailable, selectedStatus, fetchAllJobPostings, fetchJobPostingStats]);

  // Filter job postings by search term
  const filteredJobPostings = jobPostings.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.requirements || !formData.location || !formData.companyName) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    const success = await createJobPosting(formData);

    if (success) {
      setShowCreateForm(false);
      resetForm();
      // Refresh the list
      const statusFilter = selectedStatus === 'ALL' ? undefined : selectedStatus;
      fetchAllJobPostings(statusFilter);
      fetchJobPostingStats();
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingJob) return;

    const updateData: UpdateJobPostingInput = {
      jobId: editingJob.jobId,
      ...formData
    };

    const success = await updateJobPosting(updateData);

    if (success) {
      setEditingJob(null);
      resetForm();
      fetchJobPostingStats();
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta oferta de trabajo?')) return;

    const success = await deleteJobPosting(jobId);
    
    if (success) {
      fetchJobPostingStats();
    }
  };

  const handlePublish = async (jobId: string) => {
    const success = await publishJobPosting(jobId);
    
    if (success) {
      fetchJobPostingStats();
    }
  };

  const handlePause = async (jobId: string) => {
    const success = await pauseJobPosting(jobId);
    
    if (success) {
      fetchJobPostingStats();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      requirements: '',
      salary: '',
      location: '',
      employmentType: 'FULL_TIME',
      companyName: '',
      companyId: '',
      benefits: '',
      experienceLevel: 'MID_LEVEL',
      expiresAt: ''
    });
  };

  const startEdit = (job: JobPosting) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      salary: job.salary || '',
      location: job.location,
      employmentType: job.employmentType,
      companyName: job.companyName,
      companyId: job.companyId || '',
      benefits: job.benefits || '',
      experienceLevel: job.experienceLevel,
      expiresAt: job.expiresAt || ''
    });
  };

  if (user?.role !== 'admin') {
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
          <h3 className="text-yellow-800 font-medium">🚀 Sistema de Job Postings</h3>
          <p className="text-yellow-700 mt-1">
            La gestión de ofertas de trabajo requiere GraphQL. Verifica la configuración.
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
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Ofertas de Trabajo</h1>
          <p className="mt-2 text-sm text-gray-700 flex items-center">
            Administra todas las ofertas de trabajo del sistema.
            <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
              🛡️ ADMIN ONLY
            </span>
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-2">
          <button
            onClick={() => {
              const statusFilter = selectedStatus === 'ALL' ? undefined : selectedStatus;
              fetchAllJobPostings(statusFilter);
              fetchJobPostingStats();
            }}
            disabled={loading}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : '🔄 Actualizar'}
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            ➕ Nueva Oferta
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {jobPostingStats && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="relative rounded-lg border-2 bg-blue-50 border-blue-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">{jobPostingStats.totalJobPostings}</div>
              <div className="text-xs font-medium uppercase tracking-wide text-blue-800">Total</div>
            </div>
          </div>
          <div className="relative rounded-lg border-2 bg-green-50 border-green-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-900">{jobPostingStats.publishedCount}</div>
              <div className="text-xs font-medium uppercase tracking-wide text-green-800">Publicados</div>
            </div>
          </div>
          <div className="relative rounded-lg border-2 bg-gray-50 border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{jobPostingStats.draftCount}</div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-800">Borradores</div>
            </div>
          </div>
          <div className="relative rounded-lg border-2 bg-yellow-50 border-yellow-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-900">{jobPostingStats.pausedCount}</div>
              <div className="text-xs font-medium uppercase tracking-wide text-yellow-800">Pausados</div>
            </div>
          </div>
          <div className="relative rounded-lg border-2 bg-red-50 border-red-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-900">{jobPostingStats.expiredCount}</div>
              <div className="text-xs font-medium uppercase tracking-wide text-red-800">Expirados</div>
            </div>
          </div>
          <div className="relative rounded-lg border-2 bg-purple-50 border-purple-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-900">{jobPostingStats.closedCount}</div>
              <div className="text-xs font-medium uppercase tracking-wide text-purple-800">Cerrados</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
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

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingJob) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingJob ? 'Editar Oferta de Trabajo' : 'Nueva Oferta de Trabajo'}
            </h3>
            <form onSubmit={editingJob ? handleUpdateSubmit : handleCreateSubmit}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Título *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
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
                  <label className="block text-sm font-medium text-gray-700">Ubicación *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de Empleo *</label>
                  <select
                    required
                    value={formData.employmentType}
                    onChange={(e) => setFormData({...formData, employmentType: e.target.value as JobPosting['employmentType']})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {employmentTypeOptions.map(type => (
                      <option key={type} value={type}>
                        {getEmploymentTypeText(type)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nivel de Experiencia *</label>
                  <select
                    required
                    value={formData.experienceLevel}
                    onChange={(e) => setFormData({...formData, experienceLevel: e.target.value as JobPosting['experienceLevel']})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {experienceLevelOptions.map(level => (
                      <option key={level} value={level}>
                        {getExperienceLevelText(level)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Salario</label>
                  <input
                    type="text"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    placeholder="ej. $50,000 - $70,000"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Expiración</label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Descripción *</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Requisitos *</label>
                  <textarea
                    rows={3}
                    required
                    value={formData.requirements}
                    onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Beneficios</label>
                  <textarea
                    rows={2}
                    value={formData.benefits}
                    onChange={(e) => setFormData({...formData, benefits: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingJob(null);
                    resetForm();
                  }}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : (editingJob ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
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
              {searchTerm ? 'Intenta con diferentes términos de búsqueda.' : 'Comienza creando tu primera oferta de trabajo.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  ➕ Nueva Oferta de Trabajo
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {filteredJobPostings.map((job) => (
              <div key={job.jobId} className="bg-white shadow rounded-lg p-6 border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{job.title}</h3>
                    <p className="text-sm text-gray-600">{job.companyName}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                    {getStatusText(job.status)}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <span className="mr-2">📍</span>
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">🕐</span>
                    <span>{getEmploymentTypeText(job.employmentType)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">📊</span>
                    <span>{getExperienceLevelText(job.experienceLevel)}</span>
                  </div>
                  {job.salary && (
                    <div className="flex items-center">
                      <span className="mr-2">💰</span>
                      <span>{job.salary}</span>
                    </div>
                  )}
                  {job.applicationCount !== undefined && (
                    <div className="flex items-center">
                      <span className="mr-2">👥</span>
                      <span>{job.applicationCount} aplicaciones</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEdit(job)}
                      className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                    >
                      Editar
                    </button>
                    {job.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublish(job.jobId)}
                        className="text-green-600 hover:text-green-500 text-sm font-medium"
                      >
                        Publicar
                      </button>
                    )}
                    {job.status === 'PUBLISHED' && (
                      <button
                        onClick={() => handlePause(job.jobId)}
                        className="text-yellow-600 hover:text-yellow-500 text-sm font-medium"
                      >
                        Pausar
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(job.jobId)}
                    className="text-red-600 hover:text-red-500 text-sm font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};