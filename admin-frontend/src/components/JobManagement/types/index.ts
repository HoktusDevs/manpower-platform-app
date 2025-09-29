/**
 * Comprehensive TypeScript interfaces for Job Management
 * Strict typing without any or unknown types
 */

import type { Company } from '../../../services/companiesService';
import type { Job, CreateJobData } from '../../../services/jobsService';
import type { Folder } from '../../../services/foldersService';

export type { Company, Job, CreateJobData, Folder };

// Employment types with strict literal union
export const EMPLOYMENT_TYPES = [
  'Tiempo Completo',
  'Tiempo Parcial',
  'Contrato',
  'Freelance',
  'Prácticas',
  'Temporal'
] as const;

export type EmploymentType = typeof EMPLOYMENT_TYPES[number];

// Experience levels with strict literal union
export const EXPERIENCE_LEVELS = [
  'Sin Experiencia',
  'Junior (1-2 años)',
  'Intermedio (3-5 años)',
  'Senior (5+ años)',
  'Experto (10+ años)'
] as const;

export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];

// Validation error interface with strict string keys
export interface ValidationErrors {
  readonly title?: string;
  readonly company?: string;
  readonly location?: string;
  readonly salary?: string;
  readonly employmentType?: string;
  readonly experienceLevel?: string;
  readonly description?: string;
  readonly requirements?: string;
  readonly folder?: string;
  readonly documents?: string;
}

// Document template interface with strict typing
export interface DocumentTemplate {
  readonly type: string;
  readonly description: string;
  readonly isRequired: boolean;
  readonly order: number;
}

// Form data interface extending CreateJobData with strict validation
export interface JobFormData extends CreateJobData {
  readonly title: string;
  readonly companyId: string;
  readonly location: string;
  readonly salary: string;
  readonly employmentType: EmploymentType | '';
  readonly experienceLevel: ExperienceLevel | '';
  readonly description: string;
  readonly requirements: string;
  readonly folderId: string;
}

// Modal props interface with strict callback typing
export interface CreateJobModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onJobCreated?: (job: Job) => void;
  readonly defaultValues?: Partial<JobFormData>;
}

// Form field props interface for reusable components
export interface FormFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly disabled?: boolean;
}

// Select field props with strict option typing
export interface SelectFieldProps<T extends string> {
  readonly label: string;
  readonly value: T | '';
  readonly onChange: (value: T | '') => void;
  readonly options: readonly T[];
  readonly error?: string;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly disabled?: boolean;
}

// Textarea field props
export interface TextareaFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly rows?: number;
}

// Company selector props
export interface CompanySelectorProps {
  readonly companies: readonly Company[];
  readonly selectedCompanyId: string;
  readonly onCompanySelect: (companyId: string) => void;
  readonly loading?: boolean;
  readonly error?: string;
  readonly disabled?: boolean;
}

// Folder selector props
export interface FolderSelectorProps {
  readonly folders: readonly Folder[];
  readonly selectedFolderId: string;
  readonly onFolderSelect: (folderId: string) => void;
  readonly loading?: boolean;
  readonly error?: string;
  readonly disabled?: boolean;
}

// Document template manager props
export interface DocumentTemplateManagerProps {
  readonly templates: readonly DocumentTemplate[];
  readonly onTemplatesChange: (templates: readonly DocumentTemplate[]) => void;
  readonly error?: string;
  readonly disabled?: boolean;
}

// Form validation result interface
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ValidationErrors;
}

// Form state interface for complex state management
export interface JobFormState {
  readonly data: JobFormData;
  readonly errors: ValidationErrors;
  readonly isLoading: boolean;
  readonly submitError: string | null;
  readonly submitSuccess: boolean;
}

// Form actions interface for state updates
export interface JobFormActions {
  readonly updateField: <K extends keyof JobFormData>(field: K, value: JobFormData[K]) => void;
  readonly setErrors: (errors: ValidationErrors) => void;
  readonly setLoading: (loading: boolean) => void;
  readonly setSubmitError: (error: string | null) => void;
  readonly setSubmitSuccess: (success: boolean) => void;
  readonly resetForm: () => void;
}

// Hook return type for useJobForm
export interface UseJobFormReturn {
  readonly state: JobFormState;
  readonly actions: JobFormActions;
  readonly validate: () => ValidationResult;
  readonly submitForm: () => Promise<Job | null>;
}

// Data loading state interface
export interface DataLoadingState<T> {
  readonly data: readonly T[];
  readonly loading: boolean;
  readonly error: string | null;
}

// Companies data state
export type CompaniesState = DataLoadingState<Company>;

// Folders data state
export type FoldersState = DataLoadingState<Folder>;