import React, { useState, useEffect } from 'react';
import { useGraphQL } from '../../hooks/useGraphQL';
import { useToast } from '../../core-ui/useToast';
import { ConfirmModal } from '../../core-ui/ConfirmModal';
import type { JobPosting, CreateJobPostingInput } from '../../services/graphqlService';
import { 
  validateJobPostingBasic, 
  formatZodErrors
} from '../../schemas/jobPostingSchema';
import { CompanySelector } from '../../components/CompanySelector';
import { FoldersProvider } from '../../components/FoldersAndFiles';
import { UniversalTableManager } from '../../components/UniversalTable/UniversalTableManager';
import type { TableColumn, TableAction, BulkAction } from '../../components/UniversalTable/UniversalTableManager';

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

export const JobPostingsManagementPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const {
    jobPostings,
    forms,
    loading,
    error,
    fetchAllJobPostings,
    fetchAllForms,
    createJobPosting,
    updateJobPosting,
    deleteJobPosting,
    clearError,
    isGraphQLAvailable
  } = useGraphQL();

  const [selectedStatus, setSelectedStatus] = useState<JobPosting['status'] | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection and bulk actions states
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [deletingJobs, setDeletingJobs] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // Confirmation modal states
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
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'fields' | 'forms'>('basic');
  const [jobData, setJobData] = useState({
    title: '',
    description: '',
    companyName: '',
    requirements: '',
    // Los siguientes campos ahora se manejan via fieldValues
    salary: '',
    location: '',
    employmentType: 'FULL_TIME' as JobPosting['employmentType'],
    experienceLevel: 'ENTRY_LEVEL' as JobPosting['experienceLevel'],
    benefits: '',
    expiresAt: ''
  });
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showFieldConfigModal, setShowFieldConfigModal] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (isGraphQLAvailable()) {
      const statusFilter = selectedStatus === 'ALL' ? undefined : selectedStatus;
      fetchAllJobPostings(statusFilter);
      fetchAllForms(); // Load forms for the modal
    }
  }, [selectedStatus]); // Removed functions from dependencies to prevent infinite loops

  // Filter job postings by search term
  const filteredJobPostings = jobPostings.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group job postings by status for summary (currently unused but may be needed later)
  // const statusSummary = jobPostings.reduce((acc, job) => {
  //   acc[job.status] = (acc[job.status] || 0) + 1;
  //   return acc;
  // }, {} as Record<JobPosting['status'], number>);

  // Field validation errors state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Zod-based validation functions
  const validateBasicFields = () => {
    const basicData = {
      title: jobData.title,
      companyName: jobData.companyName,
      description: jobData.description,
      requirements: jobData.requirements,
    };
    
    const result = validateJobPostingBasic(basicData);
    return result.success ? {} : formatZodErrors(result.error);
  };

  const validateForm = (): Record<string, string> => {
    // Start with basic field validation
    const basicErrors = validateBasicFields();
    
    // Add custom validation for dynamic fields
    const customErrors: Record<string, string> = {};
    
    // Validate additional field values
    selectedFields.forEach(fieldId => {
      const fieldSpec = AVAILABLE_JOB_FIELDS.find(f => f.id === fieldId);
      if (!fieldSpec) return;

      const fieldValue = fieldValues[fieldId];
      
      if (fieldSpec.required && (!fieldValue || 
        (typeof fieldValue === 'string' && !fieldValue.trim()) ||
        (typeof fieldValue === 'object' && Object.values(fieldValue).every(v => !v)))) {
        customErrors[`field_${fieldId}`] = `${fieldSpec.label} es requerido`;
      }

      // Specific validation for salary range
      if (fieldId === 'salary' && fieldValue && typeof fieldValue === 'object') {
        const salaryObj = fieldValue as { min?: string; max?: string };
        if (salaryObj.min && salaryObj.max) {
          const minVal = parseFloat(salaryObj.min);
          const maxVal = parseFloat(salaryObj.max);
          if (minVal >= maxVal) {
            customErrors[`field_${fieldId}`] = 'El salario mínimo debe ser menor al máximo';
          }
        }
      }

      // Specific validation for location
      if (fieldId === 'location' && fieldValue && typeof fieldValue === 'object') {
        const locationObj = fieldValue as { type?: string; address?: string };
        if (locationObj.type && locationObj.type !== 'remote' && !locationObj.address?.trim()) {
          customErrors[`field_${fieldId}`] = 'La dirección es requerida para ubicaciones no remotas';
        }
      }
    });

    return { ...basicErrors, ...customErrors };
  };


  // Function to validate and show errors (only used on submit)
  const validateAndShowErrors = () => {
    const errors = validateForm();
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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
      companyName: '',
      requirements: '',
      salary: '',
      location: '',
      employmentType: 'FULL_TIME' as JobPosting['employmentType'],
      experienceLevel: 'ENTRY_LEVEL' as JobPosting['experienceLevel'],
      benefits: '',
      expiresAt: ''
    });
    setSelectedFolderId(undefined);
    setSelectedFields(new Set());
    setFieldValues({});
    setSelectedFormId(null);
    setActiveTab('basic');
    setIsCreating(false);
    setFieldErrors({});
    setShowFieldConfigModal(false);
    setHasAttemptedSubmit(false);
    
    // Reset edit mode states
    setIsEditMode(false);
    setEditingJobId(null);
  };

  // Handle company selection from folder system
  const handleCompanySelection = (companyName: string, folderId?: string) => {
    setJobData(prev => ({ ...prev, companyName }));
    setSelectedFolderId(folderId);
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

  // Helper function to set modal loading state
  const setModalLoading = (loading: boolean) => {
    setConfirmModal(prev => ({ ...prev, isLoading: loading }));
  };

  // Helper function to load job data for editing
  const loadJobForEdit = (job: JobPosting) => {
    setIsEditMode(true);
    setEditingJobId(job.jobId);
    setJobData({
      title: job.title,
      description: job.description,
      companyName: job.companyName,
      location: job.location,
      salary: job.salary || '',
      experienceLevel: job.experienceLevel,
      employmentType: job.employmentType,
      requirements: job.requirements,
      benefits: job.benefits || '',
      expiresAt: job.expiresAt || ''
    });
    
    // If the job has a folderId, set it
    if (job.folderId) {
      setSelectedFolderId(job.folderId);
    }
    
    // Reset other states
    setActiveTab('basic');
    setFieldErrors({});
    setHasAttemptedSubmit(false);
    
    // Show the modal
    setShowCreateModal(true);
  };


  const handleBulkDelete = () => {
    if (selectedJobs.size === 0) return;
    
    showConfirmModal(
      'Eliminar ofertas seleccionadas',
      `¿Estás seguro de que quieres eliminar ${selectedJobs.size} oferta${selectedJobs.size !== 1 ? 's' : ''} de trabajo? Esta acción no se puede deshacer.`,
      async () => {
        setModalLoading(true);
        setIsBulkDeleting(true);
        
        let successCount = 0;
        let errorCount = 0;
        const jobIds = Array.from(selectedJobs);

        for (const jobId of jobIds) {
          try {
            const success = await deleteJobPosting(jobId);
            if (success) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            console.error(`Error deleting job ${jobId}:`, error);
            errorCount++;
          }
        }

        // Show results
        if (successCount > 0) {
          showSuccess(
            `${successCount} ofertas eliminadas`,
            errorCount > 0 ? `${errorCount} ofertas no pudieron eliminarse` : undefined
          );
        }
        
        if (errorCount > 0 && successCount === 0) {
          showError('Error al eliminar ofertas', 'No se pudieron eliminar las ofertas seleccionadas');
        }

        // Refresh the list
        const statusFilter = selectedStatus === 'ALL' ? undefined : selectedStatus;
        await fetchAllJobPostings(statusFilter);
        
        // Clear selection and close modal
        setSelectedJobs(new Set());
        setIsBulkDeleting(false);
        setModalLoading(false);
        closeConfirmModal();
      },
      'danger'
    );
  };

  const handleEditJob = (jobId: string) => {
    const job = jobPostings.find(j => j.jobId === jobId);
    if (job) {
      loadJobForEdit(job);
    } else {
      showError('Error', 'No se encontró la oferta de trabajo');
    }
  };

  const handleDeleteJob = (jobId: string) => {
    showConfirmModal(
      'Eliminar oferta de trabajo',
      '¿Estás seguro de que quieres eliminar esta oferta de trabajo? Esta acción no se puede deshacer.',
      async () => {
        setModalLoading(true);
        
        // Add job to deleting set
        setDeletingJobs(prev => new Set([...prev, jobId]));

        try {
          const success = await deleteJobPosting(jobId);
          
          if (success) {
            showSuccess('Oferta eliminada', 'La oferta de trabajo se eliminó correctamente');
            
            // Refresh the list
            const statusFilter = selectedStatus === 'ALL' ? undefined : selectedStatus;
            await fetchAllJobPostings(statusFilter);
          } else {
            showError('Error al eliminar', 'No se pudo eliminar la oferta de trabajo');
          }
        } catch (error) {
          console.error('Error deleting job:', error);
          showError('Error al eliminar', 'Ocurrió un error al eliminar la oferta de trabajo');
        } finally {
          // Remove job from deleting set
          setDeletingJobs(prev => {
            const newSet = new Set(prev);
            newSet.delete(jobId);
            return newSet;
          });
          setModalLoading(false);
          closeConfirmModal();
        }
      },
      'danger'
    );
  };

  // Map fieldValues to API format
  const mapFieldValuesToAPI = () => {
    const mappedData: Partial<CreateJobPostingInput> = {};
    
    // Handle salary range
    if (fieldValues.salary && typeof fieldValues.salary === 'object') {
      const salaryObj = fieldValues.salary as { min?: string; max?: string };
      if (salaryObj.min || salaryObj.max) {
        const salaryParts = [];
        if (salaryObj.min) salaryParts.push(`$${salaryObj.min}`);
        if (salaryObj.max) salaryParts.push(`$${salaryObj.max}`);
        mappedData.salary = salaryParts.join(' - ');
      }
    }
    
    // Handle location
    if (fieldValues.location && typeof fieldValues.location === 'object') {
      const locationObj = fieldValues.location as { type?: string; address?: string };
      const locationParts = [];
      if (locationObj.address) locationParts.push(locationObj.address);
      if (locationObj.type) {
        const typeMap = {
          'remote': '100% Remoto',
          'office': 'Presencial',
          'hybrid': 'Híbrido'
        };
        locationParts.push(`(${typeMap[locationObj.type as keyof typeof typeMap] || locationObj.type})`);
      }
      if (locationParts.length > 0) {
        mappedData.location = locationParts.join(' ');
      }
    }
    
    // Handle requirements from fieldValues
    if (fieldValues.requirements && typeof fieldValues.requirements === 'string') {
      mappedData.requirements = fieldValues.requirements.trim();
    }
    
    // Handle benefits from fieldValues
    if (fieldValues.benefits && typeof fieldValues.benefits === 'string') {
      mappedData.benefits = fieldValues.benefits.trim();
    }
    
    // Handle experience level from fieldValues
    if (fieldValues.experience && typeof fieldValues.experience === 'string') {
      const experienceMap = {
        'Junior': 'ENTRY_LEVEL',
        'Semi-Senior': 'MID_LEVEL', 
        'Senior': 'SENIOR_LEVEL',
        'Ejecutivo': 'EXECUTIVE',
        'Práctica': 'INTERNSHIP'
      };
      mappedData.experienceLevel = experienceMap[fieldValues.experience as keyof typeof experienceMap] as JobPosting['experienceLevel'];
    }
    
    // Handle employment type from fieldValues
    if (fieldValues.employment_type && typeof fieldValues.employment_type === 'string') {
      const typeMap = {
        'Tiempo Completo': 'FULL_TIME',
        'Medio Tiempo': 'PART_TIME',
        'Contrato': 'CONTRACT',
        'Freelance': 'FREELANCE',
        'Práctica': 'INTERNSHIP',
        'Temporal': 'TEMPORARY'
      };
      mappedData.employmentType = typeMap[fieldValues.employment_type as keyof typeof typeMap] as JobPosting['employmentType'];
    }
    
    return mappedData;
  };

  // Get user-friendly error message
  const getUserFriendlyErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') {
      // Common API error patterns
      if (error.includes('Network Error') || error.includes('fetch')) {
        return 'Error de conexión. Verifica tu conexión a internet e inténtalo de nuevo.';
      }
      if (error.includes('Unauthorized') || error.includes('401')) {
        return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      }
      if (error.includes('Forbidden') || error.includes('403')) {
        return 'No tienes permisos para crear ofertas de trabajo.';
      }
      if (error.includes('Validation') || error.includes('Invalid')) {
        return 'Algunos campos contienen información inválida. Revisa los datos ingresados.';
      }
      if (error.includes('Duplicate') || error.includes('already exists')) {
        return 'Ya existe una oferta de trabajo con información similar.';
      }
      if (error.includes('Timeout') || error.includes('timeout')) {
        return 'La operación tardó demasiado tiempo. Inténtalo de nuevo.';
      }
      return error;
    }
    
    if (error instanceof Error) {
      return getUserFriendlyErrorMessage(error.message);
    }
    
    return 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.';
  };

  // Handle job creation and update
  const handleCreateJob = async () => {
    setHasAttemptedSubmit(true);
    if (!validateAndShowErrors()) {
      // Validation failed and errors are now shown
      return;
    }

    setIsCreating(true);
    
    try {
      // Map additional field values to API format
      const mappedFieldData = mapFieldValuesToAPI();
      
      if (isEditMode && editingJobId) {
        // Update existing job
        const updateJobData = {
          jobId: editingJobId,
          title: jobData.title.trim(),
          description: jobData.description.trim(),
          requirements: jobData.requirements.trim(),
          companyName: jobData.companyName.trim(),
          // Use mapped field values or defaults
          location: mappedFieldData.location || 'Por definir',
          employmentType: mappedFieldData.employmentType || 'FULL_TIME',
          experienceLevel: mappedFieldData.experienceLevel || 'ENTRY_LEVEL',
          // Optional fields
          ...(mappedFieldData.salary && { salary: mappedFieldData.salary }),
          ...(mappedFieldData.benefits && { benefits: mappedFieldData.benefits }),
          ...(jobData.expiresAt.trim() && { expiresAt: jobData.expiresAt.trim() }),
          ...(selectedFolderId && { folderId: selectedFolderId }),
        };

        const success = await updateJobPosting(updateJobData);
        if (success) {
          showSuccess('Oferta actualizada', 'La oferta de trabajo se actualizó correctamente');
          setShowCreateModal(false);
          resetModalState();
          
          // Refresh the job postings list
          const statusFilter = selectedStatus === 'ALL' ? undefined : selectedStatus;
          await fetchAllJobPostings(statusFilter);
        }
      } else {
        // Create new job
        const jobPostingData: CreateJobPostingInput = {
          title: jobData.title.trim(),
          description: jobData.description.trim(),
          requirements: jobData.requirements.trim(),
          companyName: jobData.companyName.trim(),
          // Use mapped field values or defaults
          location: mappedFieldData.location || 'Por definir',
          employmentType: mappedFieldData.employmentType || 'FULL_TIME',
          experienceLevel: mappedFieldData.experienceLevel || 'ENTRY_LEVEL',
          // Optional fields
          ...(mappedFieldData.salary && { salary: mappedFieldData.salary }),
          ...(mappedFieldData.benefits && { benefits: mappedFieldData.benefits }),
          ...(jobData.expiresAt.trim() && { expiresAt: jobData.expiresAt.trim() }),
          ...(selectedFolderId && { folderId: selectedFolderId }),
        };

        // Call the GraphQL service
        const success = await createJobPosting(jobPostingData);
        
        if (success) {
          showSuccess('Oferta creada', 'La oferta de trabajo se creó correctamente');
          setShowCreateModal(false);
          resetModalState();
          
          // Refresh the job postings list
          const statusFilter = selectedStatus === 'ALL' ? undefined : selectedStatus;
          await fetchAllJobPostings(statusFilter);
        }
      }
    } catch (err) {
      console.error('Error handling job posting:', err);
      const friendlyMessage = getUserFriendlyErrorMessage(err);
      showError('Error', friendlyMessage);
      
      // Optional: You could show a more specific error in a toast or modal
      // For now, the error from the GraphQL hook will be displayed
    } finally {
      setIsCreating(false);
    }
  };

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

  // Define columns for UniversalTableManager
  const columns: TableColumn<JobPosting>[] = [
    {
      key: 'title',
      label: 'Título / Empresa',
      render: (job) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{job.title}</div>
          <div className="text-sm text-gray-500">{job.companyName}</div>
        </div>
      )
    },
    {
      key: 'location',
      label: 'Ubicación / Tipo',
      render: (job) => (
        <div>
          <div className="text-sm text-gray-900">{job.location}</div>
          <div className="text-sm text-gray-500">{getEmploymentTypeText(job.employmentType)}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Estado',
      render: (job) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(job.status)}`}>
          {getStatusText(job.status)}
        </span>
      )
    },
    {
      key: 'details',
      label: 'Detalles',
      render: (job) => (
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
      )
    }
  ];

  // Define row actions for UniversalTableManager
  const rowActions: TableAction<JobPosting>[] = [
    {
      key: 'edit',
      label: 'Editar',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      variant: 'primary',
      onClick: (job) => handleEditJob(job.jobId)
    },
    {
      key: 'delete',
      label: 'Eliminar',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      variant: 'danger',
      onClick: (job) => handleDeleteJob(job.jobId)
    }
  ];

  // Define bulk actions for UniversalTableManager
  const bulkActions: BulkAction<JobPosting>[] = [
    {
      key: 'delete',
      label: 'Eliminar Seleccionadas',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      variant: 'danger',
      onClick: (jobs) => {
        const jobIds = new Set(jobs.map(job => job.jobId));
        setSelectedJobs(jobIds);
        handleBulkDelete();
      }
    }
  ];

  return (
    <FoldersProvider>
      <div className="p-6">
        <UniversalTableManager
          title="Gestión de Ofertas de Trabajo"
          data={filteredJobPostings}
          columns={columns}
          loading={loading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          rowActions={rowActions}
          bulkActions={bulkActions}
          selectable={true}
          selectedItems={selectedJobs}
          onSelectionChange={setSelectedJobs}
          getItemId={(job) => job.jobId}
          createButton={{
            label: '+ Crear Empleo',
            onClick: () => setShowCreateModal(true)
          }}
        />

      {/* Create Job Posting Modal */}
      {showCreateModal && (
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
                    setShowCreateModal(false);
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
                  onClick={() => setActiveTab('forms')}
                  className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'forms'
                      ? 'border-green-500 text-green-600 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100'
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
                    setShowCreateModal(false);
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
        </div>
      )}

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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        isLoading={confirmModal.isLoading}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
      </div>
    </FoldersProvider>
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