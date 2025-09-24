import React, { useState, useEffect } from 'react';
import { useToast } from '../../core-ui/useToast';
import { CompanySelector } from '../CompanySelector';
import { DocumentTypeAutocomplete } from '../DocumentTypeAutocomplete';
import { jobsService, type JobPosting, type CreateJobInput } from '../../services/jobsService';
import { validateJobPostingBasic, formatZodErrors } from '../../schemas/jobPostingSchema';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedCompany?: string;
}

interface CreateJobPostingInput {
  title: string;
  description: string;
  companyName: string;
  requirements: string;
  salary?: string;
  location: string;
  employmentType: JobPosting['employmentType'];
  experienceLevel: JobPosting['experienceLevel'];
  benefits?: string;
  schedule?: string;
  expiresAt?: string;
  fieldValues?: Record<string, unknown>;
  status?: JobPosting['status'];
  requiredDocuments?: string[];
}

const getEmploymentTypeText = (type: JobPosting['employmentType']) => {
  const types = {
    'FULL_TIME': 'Tiempo Completo',
    'PART_TIME': 'Medio Tiempo',
    'CONTRACT': 'Contrato',
    'INTERNSHIP': 'Práctica',
    'FREELANCE': 'Freelance'
  };
  return types[type] || type;
};

const getExperienceLevelText = (level: JobPosting['experienceLevel']) => {
  const levels = {
    'ENTRY': 'Principiante',
    'JUNIOR': 'Junior',
    'MID': 'Intermedio',
    'SENIOR': 'Senior',
    'LEAD': 'Líder',
    'EXECUTIVE': 'Ejecutivo'
  };
  return levels[level] || level;
};

export const CreateJobModal: React.FC<CreateJobModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedCompany = ''
}) => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'basic' | 'fields' | 'documents'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [jobData, setJobData] = useState<CreateJobPostingInput>({
    title: '',
    description: '',
    companyName: preselectedCompany,
    requirements: '',
    salary: '',
    location: '',
    employmentType: 'FULL_TIME',
    experienceLevel: 'ENTRY',
    benefits: '',
    schedule: '',
    expiresAt: '',
    fieldValues: {},
    status: 'PUBLISHED',
    requiredDocuments: []
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setJobData(prev => ({
        ...prev,
        companyName: preselectedCompany
      }));
      setHasAttemptedSubmit(false);
      setFieldErrors({});
      setActiveTab('basic');
    }
  }, [isOpen, preselectedCompany]);

  const handleFieldFocus = (fieldName: string) => {
    setFocusedField(fieldName);
    // Clear error when user starts typing
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const handleFieldBlur = () => {
    setFocusedField(null);
  };

  const handleCompanySelection = (companyName: string, folderId?: string) => {
    setJobData(prev => ({ ...prev, companyName }));
    setSelectedFolderId(folderId || null);
  };

  const validateForm = (): boolean => {
    const validation = validateJobPostingBasic({
      title: jobData.title,
      description: jobData.description,
      companyName: jobData.companyName,
      requirements: jobData.requirements,
      location: jobData.location,
      employmentType: jobData.employmentType,
      experienceLevel: jobData.experienceLevel
    });

    if (!validation.success) {
      const errors = formatZodErrors(validation.error);
      setFieldErrors(errors);
      return false;
    }

    setFieldErrors({});
    return true;
  };

  const handleSubmit = async () => {
    setHasAttemptedSubmit(true);
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const createJobInput: CreateJobInput = {
        title: jobData.title,
        description: jobData.description,
        companyName: jobData.companyName,
        requirements: jobData.requirements,
        salary: jobData.salary,
        location: jobData.location,
        employmentType: jobData.employmentType,
        experienceLevel: jobData.experienceLevel,
        benefits: jobData.benefits,
        schedule: jobData.schedule,
        expiresAt: jobData.expiresAt ? new Date(jobData.expiresAt).toISOString() : undefined,
        fieldValues: jobData.fieldValues,
        status: jobData.status,
        requiredDocuments: jobData.requiredDocuments
      };

      await jobsService.createJob(createJobInput);
      
      showSuccess('Empleo creado', 'El empleo se ha creado exitosamente');
      onSuccess?.();
      onClose();
      
    } catch (error) {
      console.error('Error creating job:', error);
      showError('Error al crear empleo', 'No se pudo crear el empleo. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModalState = () => {
    setJobData({
      title: '',
      description: '',
      companyName: preselectedCompany,
      requirements: '',
      salary: '',
      location: '',
      employmentType: 'FULL_TIME',
      experienceLevel: 'ENTRY',
      benefits: '',
      schedule: '',
      expiresAt: '',
      fieldValues: {},
      status: 'PUBLISHED',
      requiredDocuments: []
    });
    setHasAttemptedSubmit(false);
    setFieldErrors({});
    setSelectedFolderId(null);
    setActiveTab('basic');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Crear Nueva Oferta de Trabajo
            </h3>
            <button
              onClick={() => {
                onClose();
                resetModalState();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-2">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'basic'
                  ? 'border-green-500 text-green-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100'
              }`}
            >
              Información Básica
            </button>
            <button
              onClick={() => setActiveTab('fields')}
              className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'fields'
                  ? 'border-green-500 text-green-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100'
              }`}
            >
              Campos Adicionales
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'documents'
                  ? 'border-green-500 text-green-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100'
              }`}
            >
              Documentación Necesaria
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
                    onBlur={handleFieldBlur}
                    onFocus={() => handleFieldFocus('title')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      hasAttemptedSubmit && fieldErrors.title 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                    }`}
                    placeholder="Ej: Desarrollador Full Stack Senior"
                  />
                  {hasAttemptedSubmit && fieldErrors.title && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Empresa *
                  </label>
                  <CompanySelector
                    value={jobData.companyName}
                    onChange={handleCompanySelection}
                    onBlur={handleFieldBlur}
                    onFocus={() => handleFieldFocus('companyName')}
                    placeholder="Buscar empresa en carpetas o escribir nombre..."
                    hasError={hasAttemptedSubmit && !!fieldErrors.companyName}
                  />
                  {hasAttemptedSubmit && fieldErrors.companyName && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.companyName}</p>
                  )}
                  {selectedFolderId && (
                    <p className="mt-1 text-sm text-green-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      Empresa vinculada con carpeta del sistema
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción General *
                  </label>
                  <textarea
                    value={jobData.description}
                    onChange={(e) => setJobData(prev => ({ ...prev, description: e.target.value }))}
                    onBlur={handleFieldBlur}
                    onFocus={() => handleFieldFocus('description')}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      hasAttemptedSubmit && fieldErrors.description 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                    }`}
                    placeholder="Describe el puesto de trabajo, responsabilidades principales y lo que hace especial a esta oportunidad..."
                  />
                  {hasAttemptedSubmit && fieldErrors.description && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requisitos *
                  </label>
                  <textarea
                    value={jobData.requirements}
                    onChange={(e) => setJobData(prev => ({ ...prev, requirements: e.target.value }))}
                    onBlur={handleFieldBlur}
                    onFocus={() => handleFieldFocus('requirements')}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      hasAttemptedSubmit && fieldErrors.requirements 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                    }`}
                    placeholder="Especifica los requisitos indispensables para el puesto..."
                  />
                  {hasAttemptedSubmit && fieldErrors.requirements && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.requirements}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ubicación *
                    </label>
                    <input
                      type="text"
                      value={jobData.location}
                      onChange={(e) => setJobData(prev => ({ ...prev, location: e.target.value }))}
                      onBlur={handleFieldBlur}
                      onFocus={() => handleFieldFocus('location')}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        hasAttemptedSubmit && fieldErrors.location 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                      }`}
                      placeholder="Ej: Santiago, Chile"
                    />
                    {hasAttemptedSubmit && fieldErrors.location && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.location}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salario
                    </label>
                    <input
                      type="text"
                      value={jobData.salary}
                      onChange={(e) => setJobData(prev => ({ ...prev, salary: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Ej: $800.000 - $1.200.000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Empleo *
                    </label>
                    <select
                      value={jobData.employmentType}
                      onChange={(e) => setJobData(prev => ({ ...prev, employmentType: e.target.value as JobPosting['employmentType'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="FULL_TIME">Tiempo Completo</option>
                      <option value="PART_TIME">Medio Tiempo</option>
                      <option value="CONTRACT">Contrato</option>
                      <option value="INTERNSHIP">Práctica</option>
                      <option value="FREELANCE">Freelance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nivel de Experiencia *
                    </label>
                    <select
                      value={jobData.experienceLevel}
                      onChange={(e) => setJobData(prev => ({ ...prev, experienceLevel: e.target.value as JobPosting['experienceLevel'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="ENTRY">Principiante</option>
                      <option value="JUNIOR">Junior</option>
                      <option value="MID">Intermedio</option>
                      <option value="SENIOR">Senior</option>
                      <option value="LEAD">Líder</option>
                      <option value="EXECUTIVE">Ejecutivo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Expiración
                  </label>
                  <input
                    type="date"
                    value={jobData.expiresAt}
                    onChange={(e) => setJobData(prev => ({ ...prev, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Selecciona fecha de expiración (opcional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado Inicial
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="status-active"
                        name="initialStatus"
                        value="PUBLISHED"
                        checked={jobData.status === 'PUBLISHED'}
                        onChange={(e) => setJobData(prev => ({ ...prev, status: e.target.value as JobPosting['status'] }))}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                      />
                      <label htmlFor="status-active" className="ml-2 block text-sm text-gray-900">
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Activado
                        </span>
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="status-inactive"
                        name="initialStatus"
                        value="DRAFT"
                        checked={jobData.status === 'DRAFT'}
                        onChange={(e) => setJobData(prev => ({ ...prev, status: e.target.value as JobPosting['status'] }))}
                        className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300"
                      />
                      <label htmlFor="status-inactive" className="ml-2 block text-sm text-gray-900">
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                          Borrador
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Additional Fields Tab */}
          {activeTab === 'fields' && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Campos Adicionales</h4>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beneficios
                  </label>
                  <textarea
                    value={jobData.benefits}
                    onChange={(e) => setJobData(prev => ({ ...prev, benefits: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Lista los beneficios que ofrece la empresa..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horario de Trabajo
                  </label>
                  <input
                    type="text"
                    value={jobData.schedule}
                    onChange={(e) => setJobData(prev => ({ ...prev, schedule: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ej: Lunes a Viernes, 9:00 - 18:00"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Documentación Necesaria</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipos de Documentos Requeridos
                </label>
                <DocumentTypeAutocomplete
                  value={jobData.requiredDocuments || []}
                  onChange={(documents) => setJobData(prev => ({ ...prev, requiredDocuments: documents }))}
                  placeholder="Selecciona los tipos de documentos necesarios..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              resetModalState();
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creando...' : 'Crear Empleo'}
          </button>
        </div>
      </div>
    </div>
  );
};
