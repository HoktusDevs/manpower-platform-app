import React, { useState, useEffect } from 'react';
import type { FormField, JobApplicationForm as FormType } from '../services/formsService';
import type { JobPosting } from '../services/jobPostingsService';
import { useForms } from '../hooks/useForms';
import { useAuth } from '../hooks/useAuth';
import './JobApplicationForm.css';

interface JobApplicationFormProps {
  formId: string;
  jobPosting?: JobPosting;
  onSubmissionComplete?: (submissionId: string) => void;
  onCancel?: () => void;
}

interface FormFieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({
  field,
  value,
  onChange,
  error
}) => {
  const renderField = () => {
    const commonProps = {
      id: field.id,
      required: field.required,
      className: error ? 'error' : '',
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            {...commonProps}
            type={field.type}
            placeholder={field.placeholder}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            pattern={field.validation?.pattern}
          />
        );

      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
            placeholder={field.placeholder}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'textarea':
        return (
          <textarea
            {...commonProps}
            placeholder={field.placeholder}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
          />
        );

      case 'select':
        return (
          <select
            {...commonProps}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select an option...</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            {...commonProps}
            type="date"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'checkbox':
        return (
          <label className="checkbox-field">
            <input
              {...commonProps}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="checkbox-label">{field.label}</span>
          </label>
        );

      case 'file':
        return (
          <div className="file-input-wrapper">
            <input
              {...commonProps}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Validate file type and size
                  if (field.validation?.fileTypes) {
                    const fileExtension = file.name.split('.').pop()?.toLowerCase();
                    if (fileExtension && !field.validation.fileTypes.includes(fileExtension)) {
                      alert(`File type not allowed. Allowed types: ${field.validation.fileTypes.join(', ')}`);
                      return;
                    }
                  }
                  
                  if (field.validation?.maxFileSize && file.size > field.validation.maxFileSize) {
                    const maxSizeMB = Math.round(field.validation.maxFileSize / (1024 * 1024));
                    alert(`File too large. Maximum size: ${maxSizeMB}MB`);
                    return;
                  }
                  
                  onChange({
                    file: file,
                    name: file.name,
                    size: file.size,
                    type: file.type
                  });
                }
              }}
              accept={field.validation?.fileTypes?.map(ext => `.${ext}`).join(',')}
            />
            {value && typeof value === 'object' && value !== null && 'name' in value && 'size' in value && (
              <div className="file-info">
                <span className="file-name">{String((value as { name: string }).name)}</span>
                <span className="file-size">({Math.round((value as { size: number }).size / 1024)}KB)</span>
              </div>
            )}
          </div>
        );

      default:
        return (
          <input
            {...commonProps}
            type="text"
            placeholder={field.placeholder}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  if (field.type === 'checkbox') {
    return (
      <div className="form-field checkbox-field-wrapper">
        {renderField()}
        {error && <span className="error-message">{error}</span>}
        {field.description && <p className="field-description">{field.description}</p>}
      </div>
    );
  }

  return (
    <div className="form-field">
      <label htmlFor={field.id} className="field-label">
        {field.label}
        {field.required && <span className="required">*</span>}
      </label>
      {field.description && <p className="field-description">{field.description}</p>}
      {renderField()}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

const JobApplicationForm: React.FC<JobApplicationFormProps> = ({
  formId,
  jobPosting,
  onSubmissionComplete,
  onCancel
}) => {
  const [form, setForm] = useState<FormType | null>(null);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const { getForm, submitForm, validateFormFields } = useForms();
  const { user } = useAuth();

  // Load form on mount
  useEffect(() => {
    const loadForm = async () => {
      try {
        const formData = await getForm(formId);
        if (formData) {
          setForm(formData);
        } else {
          setSubmitError('Form not found or not available');
        }
      } catch {
        setSubmitError('Failed to load form');
      }
    };

    loadForm();
  }, [formId, getForm]);

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Clear field error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !user) return;

    // Validate form
    const validation = validateFormFields(form.fields, responses);
    if (!validation.isValid) {
      const fieldErrors: Record<string, string> = {};
      validation.errors.forEach(error => {
        // Extract field name from error message and map to field ID
        const field = form.fields.find(f => error.includes(f.label));
        if (field) {
          fieldErrors[field.id] = error;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const submission = await submitForm(formId, responses);
      onSubmissionComplete?.(submission.submissionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit application';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!form) {
    return (
      <div className="form-loading">
        <div className="loading-spinner"></div>
        <p>Loading application form...</p>
        {submitError && (
          <div className="error-banner">
            <p>{submitError}</p>
            {onCancel && (
              <button onClick={onCancel} className="secondary">
                Go Back
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (form.status !== 'active') {
    return (
      <div className="form-unavailable">
        <h3>Application Form Unavailable</h3>
        <p>This job application form is currently not accepting submissions.</p>
        {onCancel && (
          <button onClick={onCancel} className="secondary">
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="job-application-form">
      <div className="form-header">
        <div className="job-info">
          {jobPosting && (
            <>
              <h2>{jobPosting.title}</h2>
              <p className="company">{jobPosting.company}</p>
              <p className="location">{jobPosting.location}</p>
            </>
          )}
        </div>
        
        <div className="form-title">
          <h3>{form.title}</h3>
          {form.description && <p className="form-description">{form.description}</p>}
        </div>
      </div>

      {submitError && (
        <div className="error-banner">
          <p>{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="application-form">
        <div className="form-fields">
          {form.fields.map(field => (
            <FormFieldRenderer
              key={field.id}
              field={field}
              value={responses[field.id]}
              onChange={(value) => handleFieldChange(field.id, value)}
              error={errors[field.id]}
            />
          ))}
        </div>

        <div className="form-footer">
          <div className="form-actions">
            {onCancel && (
              <button 
                type="button" 
                onClick={onCancel} 
                className="secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            
            <button 
              type="submit" 
              className="primary"
              disabled={isSubmitting || !user}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>

          {!user && (
            <div className="auth-notice">
              <p>You must be logged in to submit an application.</p>
            </div>
          )}

          <div className="form-info">
            <p className="privacy-notice">
              Your information will be kept confidential and used only for recruitment purposes.
            </p>
            {form.metadata.submitCount !== undefined && (
              <p className="submission-stats">
                {form.metadata.submitCount} applications submitted so far
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default JobApplicationForm;