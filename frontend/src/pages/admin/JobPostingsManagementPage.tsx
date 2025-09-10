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

// Job posting field types that can be configured
interface JobFieldSpec {
  id: string;
  label: string;
  description: string;
  type: 'text' | 'textarea' | 'select' | 'range' | 'location' | 'schedule';
  required?: boolean;
  options?: string[];
}

const AVAILABLE_JOB_FIELDS: JobFieldSpec[] = [
  {
    id: 'salary',
    label: 'Rango Salarial',
    description: 'Especifica el rango de salario para esta posición',
    type: 'range',
    required: false
  },
  {
    id: 'location',
    label: 'Ubicación',
    description: 'Lugar de trabajo (remoto, oficina, híbrido)',
    type: 'location',
    required: true
  },
  {
    id: 'schedule',
    label: 'Horario',
    description: 'Horario de trabajo y días laborables',
    type: 'schedule',
    required: false
  },
  {
    id: 'experience',
    label: 'Experiencia Requerida',
    description: 'Nivel de experiencia necesario',
    type: 'select',
    required: true,
    options: ['Junior', 'Semi-Senior', 'Senior', 'Ejecutivo', 'Práctica']
  },
  {
    id: 'employment_type',
    label: 'Tipo de Empleo',
    description: 'Modalidad de contratación',
    type: 'select',
    required: true,
    options: ['Tiempo Completo', 'Medio Tiempo', 'Contrato', 'Freelance', 'Práctica', 'Temporal']
  },
  {
    id: 'benefits',
    label: 'Beneficios',
    description: 'Beneficios adicionales que ofrece la empresa',
    type: 'textarea',
    required: false
  },
  {
    id: 'requirements',
    label: 'Requisitos',
    description: 'Requisitos específicos para el puesto',
    type: 'textarea',
    required: true
  }
];

export const JobPostingsManagementPage: React.FC = () => {
  const { user: authUser, isAuthenticated } = useAuth();
  const {
    jobPostings,
    forms,
    loading,
    error,
    fetchAllJobPostings,
    fetchAllForms,
    clearError,
    isGraphQLAvailable
  } = useGraphQL();

  const [selectedStatus, setSelectedStatus] = useState<JobPosting['status'] | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'fields' | 'forms'>('basic');
  const [jobData, setJobData] = useState({
    title: '',
    description: '',
    companyName: ''
  });
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  useEffect(() => {
    if (authUser?.role === 'admin' && isAuthenticated && isGraphQLAvailable()) {
      const statusFilter = selectedStatus === 'ALL' ? undefined : selectedStatus;
      fetchAllJobPostings(statusFilter);
      fetchAllForms(); // Load forms for the modal
    }
  }, [authUser, isAuthenticated, isGraphQLAvailable, selectedStatus, fetchAllJobPostings, fetchAllForms]);

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
            onClick={() => setShowCreateModal(true)}
            className="block rounded-md bg-green-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            + Crear Empleo
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
                            <div className="h-3 bg-gray-200 rounded w-32"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-3 bg-gray-200 rounded w-36 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-28 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-32"></div>
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

      {/* Create Job Posting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Crear Nueva Oferta de Trabajo</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`py-2 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'basic'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Información Básica
                </button>
                <button
                  onClick={() => setActiveTab('fields')}
                  className={`py-2 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'fields'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Campos Adicionales
                </button>
                <button
                  onClick={() => setActiveTab('forms')}
                  className={`py-2 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'forms'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Asignación de Formulario
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Basic Information Tab */}
              {activeTab === 'basic' && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Información Básica del Empleo</h4>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre del Empleo *
                      </label>
                      <input
                        type="text"
                        value={jobData.title}
                        onChange={(e) => setJobData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Ej: Desarrollador Full Stack Senior"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre de la Empresa *
                      </label>
                      <input
                        type="text"
                        value={jobData.companyName}
                        onChange={(e) => setJobData(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Ej: Tech Solutions Inc"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción General *
                      </label>
                      <textarea
                        value={jobData.description}
                        onChange={(e) => setJobData(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Describe el puesto de trabajo, responsabilidades principales y lo que hace especial a esta oportunidad..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Fields Tab */}
              {activeTab === 'fields' && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Campos Adicionales</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Selecciona los campos que quieres especificar para este empleo:
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {AVAILABLE_JOB_FIELDS.map((field) => (
                      <div key={field.id} className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id={field.id}
                            type="checkbox"
                            checked={selectedFields.has(field.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedFields);
                              if (e.target.checked) {
                                newSelected.add(field.id);
                              } else {
                                newSelected.delete(field.id);
                                // Remove field value when unchecked
                                const newValues = { ...fieldValues };
                                delete newValues[field.id];
                                setFieldValues(newValues);
                              }
                              setSelectedFields(newSelected);
                            }}
                            className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor={field.id} className="font-medium text-gray-700">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <p className="text-gray-500">{field.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Dynamic Field Specifications */}
                  {Array.from(selectedFields).length > 0 && (
                    <div className="border-t pt-6">
                      <h5 className="text-sm font-medium text-gray-900 mb-4">Especificaciones de Campos</h5>
                      <div className="space-y-6">
                        {Array.from(selectedFields).map((fieldId) => {
                          const fieldSpec = AVAILABLE_JOB_FIELDS.find(f => f.id === fieldId);
                          if (!fieldSpec) return null;

                          return (
                            <div key={fieldId} className="bg-gray-50 p-4 rounded-lg">
                              <h6 className="font-medium text-gray-900 mb-3">{fieldSpec.label}</h6>
                              {renderFieldSpecification(fieldSpec, fieldValues[fieldId], (value) => {
                                setFieldValues(prev => ({ ...prev, [fieldId]: value }));
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Form Assignment Tab */}
              {activeTab === 'forms' && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Asignación de Formulario</h4>
                  <p className="text-sm text-gray-600 mb-6">
                    Selecciona el formulario que los candidatos deberán completar al aplicar a este empleo:
                  </p>

                  {forms.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500 mb-4">No hay formularios disponibles</p>
                      <p className="text-sm text-gray-400">
                        Crea un formulario en la sección de Gestión de Formularios primero.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {forms.filter(form => form.status === 'PUBLISHED').map((form) => (
                        <div
                          key={form.formId}
                          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                            selectedFormId === form.formId
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedFormId(form.formId)}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name="form-selection"
                              checked={selectedFormId === form.formId}
                              onChange={() => setSelectedFormId(form.formId)}
                              className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                            />
                            <div className="ml-3 flex-1">
                              <h5 className="font-medium text-gray-900">{form.title}</h5>
                              {form.description && (
                                <p className="text-sm text-gray-500 mt-1">{form.description}</p>
                              )}
                              <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                                <span>{form.fields.length} campos</span>
                                <span>•</span>
                                <span>{form.isRequired ? 'Obligatorio' : 'Opcional'}</span>
                                <span>•</span>
                                <span>Creado: {new Date(form.createdAt).toLocaleDateString('es-ES')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {forms.filter(form => form.status === 'PUBLISHED').length === 0 && forms.length > 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        No hay formularios publicados disponibles. Publica un formulario primero para poder asignarlo.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // TODO: Handle job creation
                    alert('Crear empleo - función próximamente');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Crear Empleo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to render field specifications dynamically
const renderFieldSpecification = (fieldSpec: JobFieldSpec, value: unknown, onChange: (value: unknown) => void) => {
  switch (fieldSpec.type) {
    case 'text':
      return (
        <input
          type="text"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder={`Especifica ${fieldSpec.label.toLowerCase()}`}
        />
      );

    case 'textarea':
      return (
        <textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder={`Especifica ${fieldSpec.label.toLowerCase()}`}
        />
      );

    case 'select':
      return (
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Selecciona una opción</option>
          {fieldSpec.options?.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );

    case 'range':
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Salario Mínimo</label>
            <input
              type="number"
              value={(value as { min?: string; max?: string })?.min || ''}
              onChange={(e) => onChange({ ...(value as object), min: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ej: 50000"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Salario Máximo</label>
            <input
              type="number"
              value={(value as { min?: string; max?: string })?.max || ''}
              onChange={(e) => onChange({ ...(value as object), max: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ej: 80000"
            />
          </div>
        </div>
      );

    case 'location':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo de Ubicación</label>
            <select
              value={(value as { type?: string; address?: string })?.type || ''}
              onChange={(e) => onChange({ ...(value as object), type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Selecciona tipo</option>
              <option value="remote">100% Remoto</option>
              <option value="office">Presencial</option>
              <option value="hybrid">Híbrido</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dirección / Ciudad</label>
            <input
              type="text"
              value={(value as { type?: string; address?: string })?.address || ''}
              onChange={(e) => onChange({ ...(value as object), address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ej: Ciudad de México, CDMX"
            />
          </div>
        </div>
      );

    case 'schedule':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Horario</label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="time"
                value={(value as { start?: string; end?: string; days?: number[] })?.start || ''}
                onChange={(e) => onChange({ ...(value as object), start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="time"
                value={(value as { start?: string; end?: string; days?: number[] })?.end || ''}
                onChange={(e) => onChange({ ...(value as object), end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Días Laborables</label>
            <div className="flex flex-wrap gap-2">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, index) => (
                <label key={day} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(value as { start?: string; end?: string; days?: number[] })?.days?.includes(index) || false}
                    onChange={(e) => {
                      const days = (value as { start?: string; end?: string; days?: number[] })?.days || [];
                      const newDays = e.target.checked 
                        ? [...days, index]
                        : days.filter((d: number) => d !== index);
                      onChange({ ...(value as object), days: newDays });
                    }}
                    className="mr-1 h-3 w-3 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm">{day}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      );

    default:
      return <div className="text-gray-500 text-sm">Tipo de campo no soportado</div>;
  }
};