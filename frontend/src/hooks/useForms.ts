import { useState, useEffect, useCallback } from 'react';
import { formsService } from '../services/formsService';
import type { JobApplicationForm, FormSubmission, FormField } from '../services/formsService';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export interface UseFormsReturn {
  // Forms state
  forms: JobApplicationForm[];
  currentForm: JobApplicationForm | null;
  submissions: FormSubmission[];
  
  // Loading states
  loading: boolean;
  submitting: boolean;
  
  // Form operations
  createForm: (jobId: string, title: string, description: string, fields: FormField[]) => Promise<JobApplicationForm>;
  updateForm: (formId: string, updates: Partial<JobApplicationForm>) => Promise<JobApplicationForm>;
  getForm: (formId: string) => Promise<JobApplicationForm | null>;
  deleteForm: (formId: string) => Promise<void>;
  listForms: (filters?: { jobId?: string; status?: JobApplicationForm['status'] }) => Promise<void>;
  
  // Submission operations
  submitForm: (formId: string, responses: Record<string, unknown>) => Promise<FormSubmission>;
  getSubmissions: (filters?: { formId?: string; applicantId?: string }) => Promise<void>;
  reviewSubmission: (submissionId: string, status: 'under_review' | 'accepted' | 'rejected', notes?: string, score?: number) => Promise<FormSubmission>;
  
  // Utility functions
  validateFormFields: (fields: FormField[], responses: Record<string, unknown>) => { isValid: boolean; errors: string[] };
  generateFormPreview: (form: JobApplicationForm) => string;
}

export const useForms = (): UseFormsReturn => {
  const [forms, setForms] = useState<JobApplicationForm[]>([]);
  const [currentForm, setCurrentForm] = useState<JobApplicationForm | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  // Create a new form (admin only)
  const createForm = useCallback(async (
    jobId: string,
    title: string,
    description: string,
    fields: FormField[]
  ): Promise<JobApplicationForm> => {
    if (!user || user.role !== 'admin') {
      throw new Error('Unauthorized: Only admins can create forms');
    }

    setSubmitting(true);
    try {
      const form = await formsService.createForm(
        jobId,
        title,
        description,
        fields,
        user.userId,
        '' // TODO: Get actual idToken from auth service
      );
      
      setForms(prev => [form, ...prev]);
      showSuccess('Form created successfully');
      return form;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create form';
      showError(message);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [user, showSuccess, showError]);

  // Update an existing form (admin only)
  const updateForm = useCallback(async (
    formId: string,
    updates: Partial<Pick<JobApplicationForm, 'title' | 'description' | 'fields' | 'status'>>
  ): Promise<JobApplicationForm> => {
    if (!user || user.role !== 'admin') {
      throw new Error('Unauthorized: Only admins can update forms');
    }

    setSubmitting(true);
    try {
      const updatedForm = await formsService.updateForm(formId, updates, ''); // TODO: Get actual idToken
      
      setForms(prev => prev.map(form => 
        form.formId === formId ? updatedForm : form
      ));
      
      if (currentForm && currentForm.formId === formId) {
        setCurrentForm(updatedForm);
      }
      
      showSuccess('Form updated successfully');
      return updatedForm;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update form';
      showError(message);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [user, currentForm, showSuccess, showError]);

  // Get a specific form
  const getForm = useCallback(async (formId: string): Promise<JobApplicationForm | null> => {
    setLoading(true);
    try {
      const form = await formsService.getForm(formId, ''); // TODO: Get actual idToken
      if (form) {
        setCurrentForm(form);
      }
      return form;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get form';
      showError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Delete a form (admin only)
  const deleteForm = useCallback(async (formId: string): Promise<void> => {
    if (!user || user.role !== 'admin') {
      throw new Error('Unauthorized: Only admins can delete forms');
    }

    setSubmitting(true);
    try {
      await formsService.deleteForm(formId, ''); // TODO: Get actual idToken
      setForms(prev => prev.filter(form => form.formId !== formId));
      
      if (currentForm && currentForm.formId === formId) {
        setCurrentForm(null);
      }
      
      showSuccess('Form deleted successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete form';
      showError(message);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [user, currentForm, showSuccess, showError]);

  // List forms with filters
  const listForms = useCallback(async (filters?: { 
    jobId?: string; 
    status?: JobApplicationForm['status'] 
  }): Promise<void> => {
    setLoading(true);
    try {
      const formsList = await formsService.listForms(filters, ''); // TODO: Get actual idToken
      setForms(formsList);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load forms';
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Submit a form application
  const submitForm = useCallback(async (
    formId: string,
    responses: Record<string, unknown>
  ): Promise<FormSubmission> => {
    if (!user) {
      throw new Error('Authentication required');
    }

    setSubmitting(true);
    try {
      const submission = await formsService.submitForm(
        formId,
        responses,
        user.userId,
        '' // TODO: Get actual idToken from auth service
      );
      
      showSuccess('Application submitted successfully');
      return submission;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit application';
      showError(message);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [user, showSuccess, showError]);

  // Get form submissions
  const getSubmissions = useCallback(async (filters?: {
    formId?: string;
    applicantId?: string;
    status?: FormSubmission['status'];
  }): Promise<void> => {
    setLoading(true);
    try {
      const submissionsList = await formsService.getSubmissions(filters, ''); // TODO: Get actual idToken
      setSubmissions(submissionsList);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load submissions';
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Review a submission (admin only)
  const reviewSubmission = useCallback(async (
    submissionId: string,
    status: 'under_review' | 'accepted' | 'rejected',
    notes?: string,
    score?: number
  ): Promise<FormSubmission> => {
    if (!user || user.role !== 'admin') {
      throw new Error('Unauthorized: Only admins can review submissions');
    }

    setSubmitting(true);
    try {
      const updatedSubmission = await formsService.reviewSubmission(
        submissionId,
        status,
        user.userId,
        notes,
        score,
        '' // TODO: Get actual idToken from auth service
      );
      
      setSubmissions(prev => prev.map(sub => 
        sub.submissionId === submissionId ? updatedSubmission : sub
      ));
      
      showSuccess('Submission reviewed successfully');
      return updatedSubmission;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to review submission';
      showError(message);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [user, showSuccess, showError]);

  // Validate form fields
  const validateFormFields = useCallback((
    fields: FormField[],
    responses: Record<string, unknown>
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    fields.forEach(field => {
      const value = responses[field.id];
      
      // Required field validation
      if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        errors.push(`${field.label} is required`);
        return;
      }

      // Skip validation if field is empty and not required
      if (!value) return;

      // Type-specific validation
      switch (field.type) {
        case 'email': {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value as string)) {
            errors.push(`${field.label} must be a valid email`);
          }
          break;
        }
          
        case 'phone': {
          const phoneRegex = /^\+?[\d\s\-()]+$/;
          if (!phoneRegex.test(value as string)) {
            errors.push(`${field.label} must be a valid phone number`);
          }
          break;
        }
          
        case 'number':
          if (isNaN(Number(value))) {
            errors.push(`${field.label} must be a valid number`);
          } else {
            const numValue = Number(value);
            if (field.validation?.min !== undefined && numValue < field.validation.min) {
              errors.push(`${field.label} must be at least ${field.validation.min}`);
            }
            if (field.validation?.max !== undefined && numValue > field.validation.max) {
              errors.push(`${field.label} must be no more than ${field.validation.max}`);
            }
          }
          break;
      }

      // String length validation
      if (typeof value === 'string') {
        if (field.validation?.minLength && value.length < field.validation.minLength) {
          errors.push(`${field.label} must be at least ${field.validation.minLength} characters`);
        }
        if (field.validation?.maxLength && value.length > field.validation.maxLength) {
          errors.push(`${field.label} must be no more than ${field.validation.maxLength} characters`);
        }
      }

      // Pattern validation
      if (field.validation?.pattern && typeof value === 'string') {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          errors.push(`${field.label} format is invalid`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // Generate form preview HTML
  const generateFormPreview = useCallback((form: JobApplicationForm): string => {
    let html = `<div class="form-preview">
      <h2>${form.title}</h2>
      <p>${form.description}</p>
      <div class="fields">`;

    form.fields.forEach(field => {
      html += `<div class="field">
        <label>${field.label}${field.required ? ' *' : ''}</label>`;
        
      if (field.description) {
        html += `<p class="field-description">${field.description}</p>`;
      }
      
      switch (field.type) {
        case 'select':
          html += `<select><option>Select...</option>`;
          field.options?.forEach(option => {
            html += `<option>${option}</option>`;
          });
          html += `</select>`;
          break;
        case 'textarea':
          html += `<textarea placeholder="${field.placeholder || ''}"></textarea>`;
          break;
        case 'checkbox':
          html += `<input type="checkbox" /> ${field.label}`;
          break;
        default:
          html += `<input type="${field.type}" placeholder="${field.placeholder || ''}" />`;
      }
      
      html += `</div>`;
    });

    html += `</div></div>`;
    return html;
  }, []);

  // Load forms on mount if user is admin
  useEffect(() => {
    if (user && user.role === 'admin') {
      listForms();
    }
  }, [user, listForms]);

  return {
    forms,
    currentForm,
    submissions,
    loading,
    submitting,
    createForm,
    updateForm,
    getForm,
    deleteForm,
    listForms,
    submitForm,
    getSubmissions,
    reviewSubmission,
    validateFormFields,
    generateFormPreview
  };
};