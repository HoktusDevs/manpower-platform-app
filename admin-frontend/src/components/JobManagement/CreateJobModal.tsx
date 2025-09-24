import React, { useState, useEffect } from 'react';
import { useToast } from '../../core-ui/useToast';
import { 
  validateJobPostingBasic, 
  formatZodErrors
} from '../../schemas/jobPostingSchema';
import { CompanySelector } from '../CompanySelector';
import { jobsService, type JobPosting, type CreateJobInput } from '../../services/jobsService';
import { FoldersApiService, type CreateFolderInput } from '../../services/foldersApiService';
import { useCreateFolder } from '../../hooks/useFoldersApi';
import { DocumentTypeAutocomplete } from '../DocumentTypeAutocomplete';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedCompany?: string;
  isEditMode?: boolean;
  editingJobId?: string | null;
  // Contexto para manejo de carpetas
  context?: 'jobs-management' | 'folders-management';
  selectedFolderId?: string; // Para contexto de carpetas
  parentFolderPath?: string; // Para mostrar árbol desde carpeta específica
}

// Tipos locales para compatibilidad con la UI
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
    id: 'location',
    label: 'Ubicación Detallada',
    description: 'Especifica el tipo de ubicación y dirección exacta',
    type: 'location',
    required: true
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
    id: 'experience',
    label: 'Nivel de Experiencia',
    description: 'Nivel de experiencia requerido para el puesto',
    type: 'select',
    required: true,
    options: ['Junior', 'Semi-Senior', 'Senior', 'Ejecutivo', 'Práctica']
  },
  {
    id: 'salary',
    label: 'Rango Salarial',
    description: 'Especifica el rango de salario para esta posición',
    type: 'range',
    required: false
  },
  {
    id: 'schedule',
    label: 'Horario de Trabajo',
    description: 'Horario de trabajo y días laborables',
    type: 'schedule',
    required: false
  },
  {
    id: 'benefits',
    label: 'Beneficios Adicionales',
    description: 'Beneficios extra que ofrece la empresa',
    type: 'textarea',
    required: false
  }
];

export const CreateJobModal: React.FC<CreateJobModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedCompany = '',
  isEditMode = false,
  editingJobId = null,
  context = 'jobs-management',
  selectedFolderId,
  parentFolderPath
}) => {
  const { showSuccess, showError } = useToast();
  const createFolderMutation = useCreateFolder();
  
  // Estados del modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'fields' | 'documents'>('basic');
  const [jobData, setJobData] = useState<CreateJobPostingInput>({
    title: '',
    description: '',
    companyName: '',
    requirements: '',
    salary: '',
    location: '',
    employmentType: 'FULL_TIME' as JobPosting['employmentType'],
    experienceLevel: 'ENTRY_LEVEL' as JobPosting['experienceLevel'],
    benefits: '',
    schedule: '',
    expiresAt: '',
    status: 'PUBLISHED' as JobPosting['status']
  });
  const [internalSelectedFolderId, setInternalSelectedFolderId] = useState<string | undefined>(undefined);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [showFieldConfigModal, setShowFieldConfigModal] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>([]);
  const [documentInput, setDocumentInput] = useState('');

  // Sincronizar con props
  useEffect(() => {
    setShowCreateModal(isOpen);
    if (isOpen && preselectedCompany) {
      setJobData(prev => ({ ...prev, companyName: preselectedCompany }));
    }
  }, [isOpen, preselectedCompany]);

  // Cargar datos del empleo para edición
  useEffect(() => {
    if (isOpen && isEditMode && editingJobId) {
      loadJobForEdit(editingJobId);
    }
  }, [isOpen, isEditMode, editingJobId]);

  // Validación de campos
  const validateAndShowErrors = () => {
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

  // Handle field blur - simplified (no premature validation)
  const handleFieldBlur = () => {
    // Real-time validation disabled to prevent premature errors
  };

  // Clear field error when user starts typing (DISABLED to prevent premature errors)
  const handleFieldFocus = (fieldName: string) => {
    // Only clear errors if they already exist (after form submission)
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Reset modal state
  const resetModalState = () => {
    setJobData({
      title: '',
      description: '',
      companyName: preselectedCompany || '',
      requirements: '',
      salary: '',
      location: '',
      employmentType: 'FULL_TIME' as JobPosting['employmentType'],
      experienceLevel: 'ENTRY_LEVEL' as JobPosting['experienceLevel'],
      benefits: '',
      schedule: '',
      expiresAt: '',
      status: 'PUBLISHED' as JobPosting['status']
    });
    setInternalSelectedFolderId(undefined);
    setSelectedFields(new Set());
    setFieldValues({});
    setActiveTab('basic');
    setIsCreating(false);
    setFieldErrors({});
    setShowFieldConfigModal(false);
    setHasAttemptedSubmit(false);
    setRequiredDocuments([]);
    setDocumentInput('');
  };

  // Función para manejar la entrada de documentos (ahora manejada por el componente de autocompletado)
  const handleDocumentInputChange = (value: string) => {
    setDocumentInput(value);
    
    // Si hay una coma, procesar los elementos
    if (value.includes(',')) {
      const newDocuments = value
        .split(',')
        .map(doc => doc.trim())
        .filter(doc => doc.length > 0);
      
      setRequiredDocuments(prev => [...prev, ...newDocuments]);
      setDocumentInput('');
    }
  };

  // Función para eliminar un documento
  const removeDocument = (index: number) => {
    setRequiredDocuments(prev => prev.filter((_, i) => i !== index));
  };

  // Función para agregar documento con Enter
  const handleDocumentKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && documentInput.trim()) {
      e.preventDefault();
      setRequiredDocuments(prev => [...prev, documentInput.trim()]);
      setDocumentInput('');
    }
  };

  // Handle company selection from folder system
  const handleCompanySelection = (companyName: string, folderId?: string) => {
    setJobData(prev => ({ ...prev, companyName }));
    setInternalSelectedFolderId(folderId);
  };

  // Crear carpeta para el empleo según el contexto
  const createFolderForJob = async (): Promise<string> => {
    try {
      const currentFolderId = selectedFolderId || internalSelectedFolderId;
      
      console.log('📁 Context:', context);
      console.log('📁 Current folder ID:', currentFolderId);
      console.log('📁 Job data:', { companyName: jobData.companyName, title: jobData.title });
      
      if (context === 'folders-management' && currentFolderId) {
        // Desde Directorios y Archivos: crear subcarpeta dentro de la carpeta seleccionada
        const subfolderName = `${jobData.companyName} - ${jobData.title}`;
        
        console.log('📁 Creando subcarpeta:', subfolderName);
        
        const folderInput: CreateFolderInput = {
          name: subfolderName,
          type: 'Cargo',
          parentId: currentFolderId,
          metadata: {
            jobTitle: jobData.title,
            companyName: jobData.companyName,
            createdFrom: 'folders-management'
          }
        };
        
        console.log('📁 Folder input:', folderInput);
        
        // Usar el hook con carga optimista
        const response = await createFolderMutation.mutateAsync(folderInput);
        console.log('📁 Folder response COMPLETA:', JSON.stringify(response, null, 2));
        console.log('📁 Response success:', response.success);
        console.log('📁 Response data:', response.data);
        console.log('📁 Response message:', response.message);
        
        if (response.success && response.folder) {
          // La respuesta tiene la estructura: { success: true, folder: { folderId: "..." } }
          const folderId = response.folder.folderId;
          console.log('📁 Extracted folder ID:', folderId);
          return folderId;
        } else {
          console.error('📁 Error en respuesta:', response);
          throw new Error(response.message || 'Error al crear carpeta');
        }
      } else {
        // Desde Gestión de Empleos: crear carpeta principal de empresa
        const folderName = `${jobData.companyName} - ${jobData.title}`;
        
        console.log('📁 Creando carpeta principal:', folderName);
        
        const folderInput: CreateFolderInput = {
          name: folderName,
          type: 'Cargo',
          metadata: {
            jobTitle: jobData.title,
            companyName: jobData.companyName,
            createdFrom: 'jobs-management'
          }
        };
        
        console.log('📁 Folder input:', folderInput);
        
        // Usar el hook con carga optimista
        const response = await createFolderMutation.mutateAsync(folderInput);
        console.log('📁 Folder response COMPLETA:', JSON.stringify(response, null, 2));
        console.log('📁 Response success:', response.success);
        console.log('📁 Response data:', response.data);
        console.log('📁 Response message:', response.message);
        
        if (response.success && response.folder) {
          // La respuesta tiene la estructura: { success: true, folder: { folderId: "..." } }
          const folderId = response.folder.folderId;
          console.log('📁 Extracted folder ID:', folderId);
          return folderId;
        } else {
          console.error('📁 Error en respuesta:', response);
          throw new Error(response.message || 'Error al crear carpeta');
        }
      }
    } catch (error) {
      console.error('Error creating folder for job:', error);
      showError('Error al crear carpeta', 'No se pudo crear la carpeta para el empleo');
      throw error;
    }
  };

  // Cargar datos del empleo para edición
  const loadJobForEdit = async (jobId: string) => {
    try {
      const response = await jobsService.getJob(jobId);
      
      if (response.success && response.job) {
        const job = response.job;
        
        // Cargar datos básicos
        setJobData({
          title: job.title || '',
          description: job.description || '',
          companyName: job.companyName || '',
          requirements: job.requirements || '',
          salary: job.salary || '',
          location: job.location || '',
          employmentType: job.employmentType as JobPosting['employmentType'] || 'FULL_TIME',
          experienceLevel: job.experienceLevel as JobPosting['experienceLevel'] || 'ENTRY_LEVEL',
          benefits: job.benefits || '',
          schedule: job.schedule || '',
          expiresAt: job.expiresAt ? job.expiresAt.split('T')[0] : '', // Convertir ISO a YYYY-MM-DD
          status: job.status as JobPosting['status'] || 'PUBLISHED'
        });

        // Cargar documentos requeridos
        setRequiredDocuments(job.requiredDocuments || []);

        // Cargar campos adicionales basados en los datos existentes
        const newSelectedFields = new Set<string>();
        const newFieldValues: Record<string, unknown> = {};

        // Mapear ubicación si existe
        if (job.location && job.location !== 'Por definir') {
          newSelectedFields.add('location');
          const locationData = parseLocationFromAPI(job.location);
          newFieldValues.location = {
            type: locationData.type,
            address: locationData.address
          };
        }

        // Mapear tipo de empleo si existe
        if (job.employmentType) {
          newSelectedFields.add('employment_type');
          newFieldValues.employment_type = mapEmploymentTypeFromBackend(job.employmentType);
        }

        // Mapear nivel de experiencia si existe
        if (job.experienceLevel) {
          newSelectedFields.add('experience');
          newFieldValues.experience = mapExperienceLevelFromBackend(job.experienceLevel);
        }

        // Mapear salario si existe
        if (job.salary) {
          newSelectedFields.add('salary');
          newFieldValues.salary = parseSalaryFromAPI(job.salary);
        }

        // Mapear horario si existe
        if (job.schedule) {
          newSelectedFields.add('schedule');
          newFieldValues.schedule = parseScheduleFromAPI(job.schedule);
        }

        // Mapear beneficios si existen
        if (job.benefits) {
          newSelectedFields.add('benefits');
          newFieldValues.benefits = job.benefits;
        }

        setSelectedFields(newSelectedFields);
        setFieldValues(newFieldValues);
      } else {
        showError('Error al cargar empleo', response.message || 'No se pudo cargar el empleo');
      }
    } catch (error) {
      console.error('Error loading job for edit:', error);
      showError('Error al cargar empleo', 'No se pudo cargar el empleo para edición');
    }
  };

  // Handle job creation and update
  const handleCreateJob = async () => {
    // Prevent double-click/double-submission
    if (isCreating) {
      return;
    }

    setHasAttemptedSubmit(true);
    if (!validateAndShowErrors()) {
      // Validation failed and errors are now shown
      return;
    }

    setIsCreating(true);

    try {
      let folderId = selectedFolderId || internalSelectedFolderId;

      // SIEMPRE crear carpeta nueva para el empleo (excepto en modo edición)
      if (!isEditMode) {
        console.log('🏗️ Creando carpeta para el empleo...');
        folderId = await createFolderForJob();
        console.log('✅ Carpeta creada con ID:', folderId);
      }

      // Mapear location desde fieldValues si existe
      let finalLocation = jobData.location;
      if (fieldValues.location && typeof fieldValues.location === 'object') {
        const locationData = fieldValues.location as { type?: string; address?: string };
        if (locationData.type && locationData.address) {
          finalLocation = `${locationData.address} (${locationData.type})`;
        }
      }

      const createJobInput: CreateJobInput = {
        title: jobData.title.trim(),
        description: jobData.description.trim(),
        companyName: jobData.companyName.trim(),
        requirements: jobData.requirements.trim(),
        salary: jobData.salary,
        location: finalLocation || 'Por definir',
        employmentType: jobData.employmentType,
        experienceLevel: jobData.experienceLevel,
        benefits: jobData.benefits,
        schedule: jobData.schedule,
        expiresAt: jobData.expiresAt ? new Date(jobData.expiresAt).toISOString() : undefined,
        fieldValues: { ...fieldValues, ...jobData.fieldValues },
        status: jobData.status,
        requiredDocuments: requiredDocuments,
        folderId: folderId
      };

      // Debug: Log what we're sending
      console.log('🚀 Sending job data:', createJobInput);
      console.log('📁 Folder ID:', folderId);
      console.log('🏢 Company Name:', jobData.companyName);
      console.log('📍 Location:', jobData.location);

      if (isEditMode && editingJobId) {
        // Update existing job
        await jobsService.updateJob(editingJobId, createJobInput);
        showSuccess('Empleo actualizado', 'El empleo se ha actualizado exitosamente');
      } else {
        // Create new job
        await jobsService.createJob(createJobInput);
        showSuccess('Empleo creado', 'El empleo se ha creado exitosamente');
      }
      
      onSuccess?.();
      onClose();
      resetModalState();
      
    } catch (error) {
      console.error('Error creating/updating job:', error);
      showError('Error al procesar empleo', 'No se pudo procesar el empleo. Inténtalo de nuevo.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!showCreateModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {isEditMode ? 'Editar Oferta de Trabajo' : 'Crear Nueva Oferta de Trabajo'}
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
                    placeholder={
                      context === 'folders-management' 
                        ? `Buscar en ${parentFolderPath || 'carpeta seleccionada'}...`
                        : "Buscar empresa en carpetas o escribir nombre..."
                    }
                    hasError={hasAttemptedSubmit && !!fieldErrors.companyName}
                  />
                  {hasAttemptedSubmit && fieldErrors.companyName && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.companyName}</p>
                  )}
                  {(selectedFolderId || internalSelectedFolderId) && (
                    <p className="mt-1 text-sm text-green-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      Empresa vinculada con carpeta del sistema
                    </p>
                  )}
                  
                  {/* Mostrar contexto de carpeta cuando viene desde Directorios y Archivos */}
                  {context === 'folders-management' && parentFolderPath && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v1H8V5z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            Creando empleo desde carpeta:
                          </p>
                          <p className="text-sm text-blue-700">
                            {parentFolderPath}
                          </p>
                        </div>
                      </div>
                    </div>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Expiración
                  </label>
                  <input
                    type="date"
                    value={jobData.expiresAt}
                    onChange={(e) => setJobData(prev => ({ ...prev, expiresAt: e.target.value }))}
                    onBlur={handleFieldBlur}
                    onFocus={() => handleFieldFocus('expiresAt')}
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
                        value="PAUSED"
                        checked={jobData.status === 'PAUSED'}
                        onChange={(e) => setJobData(prev => ({ ...prev, status: e.target.value as JobPosting['status'] }))}
                        className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300"
                      />
                      <label htmlFor="status-inactive" className="ml-2 block text-sm text-gray-900">
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                          Desactivado
                        </span>
                      </label>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    El empleo se creará en el estado seleccionado
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Additional Fields Tab */}
          {activeTab === 'fields' && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Campos Adicionales</h4>
              <p className="text-sm text-gray-600 mb-6">
                Selecciona los campos que quieres especificar para este empleo:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {AVAILABLE_JOB_FIELDS.map((field) => (
                  <div key={field.id} className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
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
                    <div className="ml-3 text-sm flex-1">
                      <label htmlFor={field.id} className="font-medium text-gray-900 cursor-pointer">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <p className="text-gray-500 mt-1">{field.description}</p>
                      {selectedFields.has(field.id) && fieldValues[field.id] !== undefined && (
                        <div className="mt-2 text-xs text-green-600 font-medium">
                          ✓ Configurado
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Configure Button */}
              {selectedFields.size > 0 && (
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">
                        {selectedFields.size} campo{selectedFields.size !== 1 ? 's' : ''} seleccionado{selectedFields.size !== 1 ? 's' : ''}
                      </h5>
                      <p className="text-sm text-gray-500">
                        Haz clic en "Configurar Campos" para especificar los detalles
                      </p>
                    </div>
                    <button
                      onClick={() => setShowFieldConfigModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Configurar Campos
                    </button>
                  </div>
                </div>
              )}

              {selectedFields.size === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Selecciona al menos un campo adicional para continuar</p>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Documentación Necesaria</h4>
              <p className="text-sm text-gray-600 mb-6">
                Especifica qué documentos deben presentar los candidatos para este empleo:
              </p>
              
              <div className="space-y-4">
                {/* Input para agregar documentos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agregar Documentos
                  </label>
                  <DocumentTypeAutocomplete
                    value={documentInput}
                    onChange={handleDocumentInputChange}
                    onKeyPress={handleDocumentKeyPress}
                    placeholder="Escribe un documento y presiona Enter o separa con comas (ej: CV, Certificado de estudios, Cédula de identidad)"
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Separa múltiples documentos con comas o presiona Enter para agregar uno por uno. 
                    <span className="text-green-600 font-medium"> Los tipos más usados aparecerán como sugerencias.</span>
                  </p>
                </div>

                {/* Lista de documentos agregados */}
                {requiredDocuments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Documentos Requeridos ({requiredDocuments.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {requiredDocuments.map((document, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 border border-green-200"
                        >
                          <span className="mr-2">{document}</span>
                          <button
                            type="button"
                            onClick={() => removeDocument(index)}
                            className="text-green-600 hover:text-green-800 focus:outline-none"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mensaje cuando no hay documentos */}
                {requiredDocuments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>No se han agregado documentos requeridos</p>
                    <p className="text-sm">Agrega los documentos que deben presentar los candidatos</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {/* Validation Error Summary - Only show after attempted submission */}
          {hasAttemptedSubmit && Object.keys(fieldErrors).length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-red-400 mt-0.5" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m0 0V9m0 0V6m0 0H6m3 0h3" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Corrige los siguientes errores:
                  </h3>
                  <ul className="mt-2 text-sm text-red-700 space-y-1">
                    {Object.entries(fieldErrors).map(([field, error]) => (
                      <li key={field}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                onClose();
                resetModalState();
              }}
              disabled={isCreating}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateJob}
              disabled={isCreating}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isCreating && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isCreating 
                ? (isEditMode ? 'Actualizando...' : 'Creando...') 
                : (isEditMode ? 'Actualizar Empleo' : 'Crear Empleo')
              }
            </button>
          </div>
        </div>
      </div>

      {/* Field Configuration Modal */}
      {showFieldConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Configurar Campos Adicionales
                </h3>
                <button
                  onClick={() => setShowFieldConfigModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Especifica los detalles para los {selectedFields.size} campos seleccionados:
              </p>
              
              <div className="space-y-6">
                {Array.from(selectedFields).map((fieldId, index) => {
                  const fieldSpec = AVAILABLE_JOB_FIELDS.find(f => f.id === fieldId);
                  if (!fieldSpec) return null;

                  return (
                    <div key={fieldId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-medium rounded-full mr-3">
                          {index + 1}
                        </span>
                        <h4 className="font-medium text-gray-900">
                          {fieldSpec.label}
                          {fieldSpec.required && <span className="text-red-500 ml-1">*</span>}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">{fieldSpec.description}</p>
                      
                      {renderFieldSpecification(fieldSpec, fieldValues[fieldId], (value) => {
                        setFieldValues(prev => ({ ...prev, [fieldId]: value }));
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowFieldConfigModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setShowFieldConfigModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Guardar Configuración
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
            <label className="block text-xs text-gray-500 mb-1">Dirección Específica</label>
            <input
              type="text"
              value={(value as { type?: string; address?: string })?.address || ''}
              onChange={(e) => onChange({ ...(value as object), address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ej: Santiago, Chile"
            />
          </div>
        </div>
      );

    case 'schedule':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Días de Trabajo</label>
            <div className="flex flex-wrap gap-2">
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                <label key={day} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(value as { days?: string[] })?.days?.includes(day) || false}
                    onChange={(e) => {
                      const currentDays = (value as { days?: string[] })?.days || [];
                      const newDays = e.target.checked 
                        ? [...currentDays, day]
                        : currentDays.filter(d => d !== day);
                      onChange({ ...(value as object), days: newDays });
                    }}
                    className="mr-1"
                  />
                  <span className="text-sm">{day}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Horario</label>
            <input
              type="text"
              value={(value as { schedule?: string })?.schedule || ''}
              onChange={(e) => onChange({ ...(value as object), schedule: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ej: 9:00 - 18:00"
            />
          </div>
        </div>
      );

    default:
      return null;
  }
};

// Helper functions to parse data from API
const parseLocationFromAPI = (locationString: string): { type: string; address: string } => {
  if (!locationString || locationString === 'Por definir') {
    return { type: 'office', address: 'Por definir' };
  }
  
  // Parse location string to extract type and address
  const typeMatch = locationString.match(/\(([^)]+)\)/);
  if (typeMatch) {
    const locationType = typeMatch[1].toLowerCase();
    const address = locationString.replace(/\s*\([^)]+\)/, '').trim();
    return { type: locationType, address };
  }
  
  return { type: 'office', address: locationString };
};

const mapEmploymentTypeFromBackend = (backendType: string): string => {
  const typeMap: Record<string, string> = {
    'FULL_TIME': 'Tiempo Completo',
    'PART_TIME': 'Medio Tiempo',
    'CONTRACT': 'Contrato',
    'FREELANCE': 'Freelance',
    'INTERNSHIP': 'Práctica',
    'TEMPORARY': 'Temporal'
  };
  return typeMap[backendType] || 'Tiempo Completo';
};

const mapExperienceLevelFromBackend = (backendLevel: string): string => {
  const levelMap: Record<string, string> = {
    'ENTRY_LEVEL': 'Junior',
    'MID_LEVEL': 'Semi-Senior',
    'SENIOR_LEVEL': 'Senior',
    'EXECUTIVE': 'Ejecutivo',
    'INTERNSHIP': 'Práctica'
  };
  return levelMap[backendLevel] || 'Junior';
};

const parseSalaryFromAPI = (salaryString: string): { min?: string; max?: string } => {
  if (!salaryString) return {};
  
  // Parse salary string like "$50000 - $80000" or "$50000"
  const parts = salaryString.split(' - ');
  if (parts.length === 2) {
    return {
      min: parts[0].replace('$', ''),
      max: parts[1].replace('$', '')
    };
  } else if (parts.length === 1 && parts[0].includes('$')) {
    return {
      max: parts[0].replace('$', '')
    };
  }
  
  return {};
};

const parseScheduleFromAPI = (scheduleString: string): { start?: string; end?: string; days?: string[]; description?: string } => {
  if (!scheduleString) return {};
  
  // Parse schedule string like "9:00 - 18:00, Lunes a Viernes"
  const timeMatch = scheduleString.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  const daysMatch = scheduleString.match(/(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)/g);
  
  return {
    start: timeMatch?.[1] || '',
    end: timeMatch?.[2] || '',
    days: daysMatch || [],
    description: scheduleString
  };
};