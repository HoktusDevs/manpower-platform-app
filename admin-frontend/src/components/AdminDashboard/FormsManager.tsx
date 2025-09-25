import React, { useState, useEffect } from 'react';
import { useForms } from '../../hooks/useForms';
import type { FormField, JobApplicationForm } from '../../services/formsService';
import { jobPostingsService } from '../../services/jobPostingsService';
import { useAuth } from '../../hooks/useAuth';
import './FormsManager.css';

interface FormBuilderProps {
  onSave: (title: string, description: string, fields: FormField[]) => Promise<void>;
  onCancel: () => void;
  initialForm?: JobApplicationForm;
  jobId: string;
  loading?: boolean;
}

const FormBuilder: React.FC<FormBuilderProps> = ({
  onSave,
  onCancel,
  initialForm,
  loading = false
}) => {
  const [title, setTitle] = useState(initialForm?.title || '');
  const [description, setDescription] = useState(initialForm?.description || '');
  const [fields, setFields] = useState<FormField[]>(initialForm?.fields || []);

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: `New ${type} field`,
      required: false,
      placeholder: type === 'select' ? undefined : `Enter ${type}...`,
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined,
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(fields.map((field, i) => i === index ? { ...field, ...updates } : field));
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setFields(newFields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || fields.length === 0) return;
    
    await onSave(title.trim(), description.trim(), fields);
  };

  return (
    <div className="form-builder">
      <form onSubmit={handleSubmit}>
        <div className="form-header">
          <h3>{initialForm ? 'Edit Form' : 'Create New Form'}</h3>
          <div className="form-actions">
            <button type="button" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={loading || !title.trim() || fields.length === 0}>
              {loading ? 'Saving...' : 'Save Form'}
            </button>
          </div>
        </div>

        <div className="form-content">
          <div className="form-basic-info">
            <div className="input-group">
              <label htmlFor="form-title">Form Title *</label>
              <input
                id="form-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Job Application Form"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="form-description">Description</label>
              <textarea
                id="form-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please fill out this form to apply for the position..."
                rows={3}
              />
            </div>
          </div>

          <div className="form-fields-section">
            <div className="section-header">
              <h4>Form Fields ({fields.length})</h4>
              <div className="field-types">
                <button type="button" onClick={() => addField('text')}>+ Text</button>
                <button type="button" onClick={() => addField('email')}>+ Email</button>
                <button type="button" onClick={() => addField('phone')}>+ Phone</button>
                <button type="button" onClick={() => addField('textarea')}>+ Textarea</button>
                <button type="button" onClick={() => addField('select')}>+ Select</button>
                <button type="button" onClick={() => addField('date')}>+ Date</button>
                <button type="button" onClick={() => addField('file')}>+ File</button>
                <button type="button" onClick={() => addField('checkbox')}>+ Checkbox</button>
              </div>
            </div>

            <div className="form-fields-list">
              {fields.length === 0 && (
                <div className="empty-fields">
                  <p>No fields added yet. Click the buttons above to add form fields.</p>
                </div>
              )}

              {fields.map((field, index) => (
                <div key={field.id} className="field-editor">
                  <div className="field-header">
                    <span className="field-type-badge">{field.type}</span>
                    <div className="field-controls">
                      <button 
                        type="button" 
                        onClick={() => moveField(index, 'up')}
                        disabled={index === 0}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button 
                        type="button" 
                        onClick={() => moveField(index, 'down')}
                        disabled={index === fields.length - 1}
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button 
                        type="button" 
                        onClick={() => removeField(index)}
                        className="danger"
                        title="Remove field"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="field-properties">
                    <div className="input-group">
                      <label>Field Label *</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        required
                      />
                    </div>

                    <div className="input-group">
                      <label>Placeholder</label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(index, { placeholder: e.target.value })}
                      />
                    </div>

                    {field.type === 'select' && (
                      <div className="input-group">
                        <label>Options (one per line)</label>
                        <textarea
                          value={field.options?.join('\n') || ''}
                          onChange={(e) => updateField(index, { 
                            options: e.target.value.split('\n').filter(opt => opt.trim()) 
                          })}
                          rows={3}
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                        />
                      </div>
                    )}

                    <div className="field-settings">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                        />
                        Required field
                      </label>

                      {(field.type === 'text' || field.type === 'textarea') && (
                        <div className="validation-settings">
                          <div className="input-row">
                            <input
                              type="number"
                              placeholder="Min length"
                              value={field.validation?.minLength || ''}
                              onChange={(e) => updateField(index, {
                                validation: {
                                  ...field.validation,
                                  minLength: e.target.value ? parseInt(e.target.value) : undefined
                                }
                              })}
                            />
                            <input
                              type="number"
                              placeholder="Max length"
                              value={field.validation?.maxLength || ''}
                              onChange={(e) => updateField(index, {
                                validation: {
                                  ...field.validation,
                                  maxLength: e.target.value ? parseInt(e.target.value) : undefined
                                }
                              })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

const FormsManager: React.FC = () => {
  const { user } = useAuth();
  const { 
    forms, 
    loading, 
    submitting,
    createForm, 
    updateForm, 
    deleteForm,
    getSubmissions,
    submissions
  } = useForms();

  const [jobPostings, setJobPostings] = useState<Array<{ jobId: string; title: string; company: string }>>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [editingForm, setEditingForm] = useState<JobApplicationForm | undefined>();
  const [viewMode, setViewMode] = useState<'forms' | 'submissions'>('forms');

  // Load job postings on mount
  useEffect(() => {
    const loadJobPostings = async () => {
      try {
        const jobs = await jobPostingsService.listJobPostings({});
        setJobPostings(jobs);
      } catch {
        // Silently handle job postings loading errors
      }
    };
    
    loadJobPostings();
  }, []);

  // Load submissions when switching to submissions view
  useEffect(() => {
    if (viewMode === 'submissions') {
      getSubmissions();
    }
  }, [viewMode, getSubmissions]);

  const handleCreateForm = async (title: string, description: string, fields: FormField[]) => {
    if (!selectedJobId) return;
    
    try {
      await createForm(selectedJobId, title, description, fields);
      setShowFormBuilder(false);
      setSelectedJobId('');
    } catch {
      // Silently handle form creation errors
    }
  };

  const handleUpdateForm = async (title: string, description: string, fields: FormField[]) => {
    if (!editingForm) return;
    
    try {
      await updateForm(editingForm.formId, { title, description, fields });
      setShowFormBuilder(false);
      setEditingForm(undefined);
    } catch {
      // Silently handle form creation errors
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteForm(formId);
    } catch {
      // Silently handle form creation errors
    }
  };

  const handleEditForm = (form: JobApplicationForm) => {
    setEditingForm(form);
    setShowFormBuilder(true);
  };

  const handlePublishForm = async (formId: string) => {
    try {
      await updateForm(formId, { status: 'active' });
    } catch {
      // Silently handle form creation errors
    }
  };

  if (!user || user.role !== 'admin') {
    return <div className="unauthorized">Access denied. Admin privileges required.</div>;
  }

  if (showFormBuilder) {
    return (
      <FormBuilder
        jobId={selectedJobId}
        initialForm={editingForm}
        onSave={editingForm ? handleUpdateForm : handleCreateForm}
        onCancel={() => {
          setShowFormBuilder(false);
          setEditingForm(undefined);
          setSelectedJobId('');
        }}
        loading={submitting}
      />
    );
  }

  return (
    <div className="forms-manager">
      <div className="manager-header">
        <h2>Forms Management</h2>
        <div className="header-controls">
          <div className="view-toggle">
            <button 
              className={viewMode === 'forms' ? 'active' : ''}
              onClick={() => setViewMode('forms')}
            >
              Forms ({forms.length})
            </button>
            <button 
              className={viewMode === 'submissions' ? 'active' : ''}
              onClick={() => setViewMode('submissions')}
            >
              Submissions ({submissions.length})
            </button>
          </div>
          
          {viewMode === 'forms' && (
            <div className="create-form-section">
              <select 
                value={selectedJobId} 
                onChange={(e) => setSelectedJobId(e.target.value)}
              >
                <option value="">Select a job posting...</option>
                {jobPostings.map(job => (
                  <option key={job.jobId} value={job.jobId}>
                    {job.title} - {job.company}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => setShowFormBuilder(true)}
                disabled={!selectedJobId}
                className="primary"
              >
                Create Form
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}

      {viewMode === 'forms' && (
        <div className="forms-list">
          {forms.length === 0 && !loading && (
            <div className="empty-state">
              <h3>No forms created yet</h3>
              <p>Create your first job application form by selecting a job posting above.</p>
            </div>
          )}

          {forms.map(form => {
            const jobPosting = jobPostings.find(job => job.jobId === form.jobId);
            
            return (
              <div key={form.formId} className="form-card">
                <div className="form-card-header">
                  <div className="form-info">
                    <h3>{form.title}</h3>
                    <p className="job-reference">
                      Job: {jobPosting?.title || 'Unknown'} - {jobPosting?.company || 'Unknown'}
                    </p>
                    <span className={`status-badge ${form.status}`}>
                      {form.status}
                    </span>
                  </div>
                  <div className="form-actions">
                    <button onClick={() => handleEditForm(form)}>Edit</button>
                    {form.status === 'draft' && (
                      <button 
                        onClick={() => handlePublishForm(form.formId)}
                        className="primary"
                      >
                        Publish
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteForm(form.formId)}
                      className="danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="form-stats">
                  <span>{form.fields.length} fields</span>
                  <span>{form.metadata.submitCount} submissions</span>
                  <span>Created {new Date(form.createdAt).toLocaleDateString()}</span>
                </div>
                
                {form.description && (
                  <p className="form-description">{form.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'submissions' && (
        <div className="submissions-list">
          {submissions.length === 0 && !loading && (
            <div className="empty-state">
              <h3>No submissions yet</h3>
              <p>Submissions will appear here once users start applying to your forms.</p>
            </div>
          )}

          {submissions.map(submission => {
            const form = forms.find(f => f.formId === submission.formId);
            const jobPosting = jobPostings.find(job => job.jobId === submission.jobId);
            
            return (
              <div key={submission.submissionId} className="submission-card">
                <div className="submission-header">
                  <div className="submission-info">
                    <h4>{form?.title || 'Unknown Form'}</h4>
                    <p>{jobPosting?.title || 'Unknown Job'} - {jobPosting?.company || 'Unknown Company'}</p>
                    <span className={`status-badge ${submission.status}`}>
                      {submission.status}
                    </span>
                  </div>
                  <div className="submission-meta">
                    <p>Submitted: {new Date(submission.submittedAt).toLocaleDateString()}</p>
                    <p>Applicant: {submission.applicantId}</p>
                  </div>
                </div>
                
                <div className="submission-responses">
                  {Object.entries(submission.responses).map(([fieldId, value]) => {
                    const field = form?.fields.find(f => f.id === fieldId);
                    return (
                      <div key={fieldId} className="response-item">
                        <strong>{field?.label || fieldId}:</strong>
                        <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                      </div>
                    );
                  })}
                </div>
                
                {submission.notes && (
                  <div className="submission-notes">
                    <strong>Notes:</strong> {submission.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FormsManager;