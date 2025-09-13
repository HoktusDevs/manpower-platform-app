/**
 * Forms GraphQL Types
 * Types specific to dynamic forms management
 */

export interface Form {
  formId: string;
  title: string;
  description?: string;
  jobId?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'EXPIRED' | 'CLOSED';
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  isRequired: boolean;
  maxSubmissions?: number;
  currentSubmissions?: number;
}

export interface FormField {
  fieldId: string;
  type: 'TEXT' | 'TEXTAREA' | 'EMAIL' | 'PHONE' | 'NUMBER' | 'DATE' | 'SELECT' | 'RADIO' | 'CHECKBOX' | 'FILE_UPLOAD' | 'RATING' | 'URL';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: FieldValidation;
  order: number;
  description?: string;
  defaultValue?: string;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minValue?: number;
  maxValue?: number;
  customMessage?: string;
}

export interface FormSubmission {
  submissionId: string;
  formId: string;
  applicantId: string;
  responses: FieldResponse[];
  submittedAt: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PENDING_INFO';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  score?: number;
}

export interface FieldResponse {
  fieldId: string;
  value: string;
  fieldType: FormField['type'];
}

export interface CreateFormInput {
  title: string;
  description?: string;
  jobId?: string;
  fields: CreateFormFieldInput[];
  expiresAt?: string;
  isRequired: boolean;
  maxSubmissions?: number;
}

export interface CreateFormFieldInput {
  type: FormField['type'];
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: FieldValidation;
  order: number;
  description?: string;
  defaultValue?: string;
}

export interface UpdateFormInput {
  formId: string;
  title?: string;
  description?: string;
  jobId?: string;
  status?: Form['status'];
  fields?: UpdateFormFieldInput[];
  expiresAt?: string;
  isRequired?: boolean;
  maxSubmissions?: number;
}

export interface UpdateFormFieldInput {
  fieldId?: string;
  type?: FormField['type'];
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validation?: FieldValidation;
  order?: number;
  description?: string;
  defaultValue?: string;
}

export interface SubmitFormInput {
  formId: string;
  responses: SubmitFieldResponseInput[];
}

export interface SubmitFieldResponseInput {
  fieldId: string;
  value: string;
}

export interface ReviewSubmissionInput {
  submissionId: string;
  status: FormSubmission['status'];
  reviewNotes?: string;
  score?: number;
}

export interface FormsStats {
  totalForms: number;
  activeForms: number;
  totalSubmissions: number;
  averageCompletionRate?: number;
  topPerformingForms: Array<{
    formId: string;
    title: string;
    submissionCount: number;
    completionRate: number;
    averageScore?: number;
  }>;
}