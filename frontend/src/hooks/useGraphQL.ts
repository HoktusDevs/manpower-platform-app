import { useState, useCallback } from 'react';
import { graphqlService } from '../services/graphqlService';
import { cognitoAuthService } from '../services/cognitoAuthService';
import type { 
  Application, 
  Document, 
  CreateApplicationInput, 
  UploadDocumentInput, 
  ApplicationStats,
  JobPosting,
  CreateJobPostingInput,
  UpdateJobPostingInput,
  JobPostingStats,
  Form,
  FormSubmission,
  FormsStats,
  CreateFormInput,
  UpdateFormInput,
  SubmitFormInput,
  ReviewSubmissionInput
} from '../services/graphqlService';

interface UseGraphQLReturn {
  // State
  applications: Application[];
  documents: Document[];
  applicationStats: ApplicationStats | null;
  jobPostings: JobPosting[];
  jobPostingStats: JobPostingStats | null;
  forms: Form[];
  formSubmissions: FormSubmission[];
  formsStats: FormsStats | null;
  loading: boolean;
  error: string | null;
  
  // Methods
  fetchMyApplications: () => Promise<void>;
  fetchAllApplications: (status?: Application['status']) => Promise<void>;
  fetchMyDocuments: () => Promise<void>;
  fetchApplicationStats: () => Promise<void>;
  
  // Job Posting Methods
  fetchActiveJobPostings: (limit?: number) => Promise<void>;
  fetchJobPosting: (jobId: string) => Promise<JobPosting | null>;
  fetchAllJobPostings: (status?: JobPosting['status']) => Promise<void>;
  fetchJobPostingStats: () => Promise<void>;
  
  // Dynamic Forms Methods
  fetchActiveForms: (jobId?: string, limit?: number) => Promise<void>;
  fetchAllForms: (status?: string, jobId?: string, limit?: number) => Promise<void>;
  fetchForm: (formId: string) => Promise<Form | null>;
  fetchFormSubmissions: (formId: string, status?: string, limit?: number) => Promise<void>;
  fetchMyFormSubmissions: (formId?: string) => Promise<void>;
  fetchFormsStats: () => Promise<void>;
  
  // Mutations
  createApplication: (input: CreateApplicationInput) => Promise<boolean>;
  updateMyApplication: (applicationId: string, updates: Partial<CreateApplicationInput>) => Promise<boolean>;
  deleteMyApplication: (applicationId: string) => Promise<boolean>;
  updateApplicationStatus: (userId: string, applicationId: string, status: Application['status']) => Promise<boolean>;
  uploadDocument: (input: UploadDocumentInput) => Promise<boolean>;
  
  // Job Posting Mutations
  createJobPosting: (input: CreateJobPostingInput) => Promise<boolean>;
  updateJobPosting: (input: UpdateJobPostingInput) => Promise<boolean>;
  deleteJobPosting: (jobId: string) => Promise<boolean>;
  publishJobPosting: (jobId: string) => Promise<boolean>;
  pauseJobPosting: (jobId: string) => Promise<boolean>;
  
  // Dynamic Forms Mutations
  createForm: (input: CreateFormInput) => Promise<boolean>;
  updateForm: (input: UpdateFormInput) => Promise<boolean>;
  deleteForm: (formId: string) => Promise<boolean>;
  publishForm: (formId: string) => Promise<boolean>;
  pauseForm: (formId: string) => Promise<boolean>;
  submitForm: (input: SubmitFormInput) => Promise<boolean>;
  reviewSubmission: (input: ReviewSubmissionInput) => Promise<boolean>;
  
  // Utils
  clearError: () => void;
  isGraphQLAvailable: () => boolean;
}

export const useGraphQL = (): UseGraphQLReturn => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [applicationStats, setApplicationStats] = useState<ApplicationStats | null>(null);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [jobPostingStats, setJobPostingStats] = useState<JobPostingStats | null>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<FormSubmission[]>([]);
  const [formsStats, setFormsStats] = useState<FormsStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GraphQL service is now initialized in App component

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isGraphQLAvailable = useCallback(() => {
    const isServiceInitialized = graphqlService.isInitialized();
    const hasGraphQLUrl = !!import.meta.env.VITE_GRAPHQL_URL;
    const isUserAuthenticated = cognitoAuthService.isAuthenticated();
    const currentUser = cognitoAuthService.getCurrentUser();
    const hasValidToken = cognitoAuthService.getIdToken() !== null;
    
    const isAvailable = isServiceInitialized && hasGraphQLUrl && isUserAuthenticated && hasValidToken && currentUser !== null;
    
    // Only log when GraphQL is actually unavailable for debugging
    if (!isAvailable) {
      console.log('🔍 GraphQL not available:', {
        isServiceInitialized,
        hasGraphQLUrl,
        isUserAuthenticated,
        hasValidToken,
        hasCurrentUser: !!currentUser,
        graphqlUrl: import.meta.env.VITE_GRAPHQL_URL
      });
    }
    
    return isAvailable;
  }, []);

  // ========== QUERIES ==========

  const fetchMyApplications = useCallback(async () => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getMyApplications();
      setApplications(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch applications';
      setError(errorMessage);
      console.error('Error fetching my applications:', err);
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const fetchAllApplications = useCallback(async (status?: Application['status']) => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getAllApplications(status);
      setApplications(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch all applications';
      setError(errorMessage);
      console.error('Error fetching all applications:', err);
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const fetchMyDocuments = useCallback(async () => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getMyDocuments();
      setDocuments(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch documents';
      setError(errorMessage);
      console.error('Error fetching my documents:', err);
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const fetchApplicationStats = useCallback(async () => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getApplicationStats();
      setApplicationStats(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch application stats';
      setError(errorMessage);
      console.error('Error fetching application stats:', err);
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  // ========== DYNAMIC FORMS QUERIES ==========

  const fetchActiveForms = useCallback(async (jobId?: string, limit?: number) => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getActiveForms(jobId, limit);
      setForms(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch active forms';
      setError(errorMessage);
      console.error('Error fetching active forms:', err);
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const fetchAllForms = useCallback(async (status?: string, jobId?: string, limit?: number) => {
    console.log('🔥 fetchAllForms CALLED', { status, jobId, limit, timestamp: new Date().toISOString() });
    
    if (!isGraphQLAvailable()) {
      console.warn('GraphQL service not available, skipping fetchAllForms');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getAllForms(status, jobId, limit);
      setForms(result);
      console.log('✅ fetchAllForms SUCCESS', result.length, 'forms');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch all forms';
      setError(errorMessage);
      console.error('❌ fetchAllForms ERROR:', err);
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const fetchForm = useCallback(async (formId: string) => {
    if (!isGraphQLAvailable()) return null;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getForm(formId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch form';
      setError(errorMessage);
      console.error('Error fetching form:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const fetchFormSubmissions = useCallback(async (formId: string, status?: string, limit?: number) => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getFormSubmissions(formId, status, limit);
      setFormSubmissions(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch form submissions';
      setError(errorMessage);
      console.error('Error fetching form submissions:', err);
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const fetchMyFormSubmissions = useCallback(async (formId?: string) => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getMyFormSubmissions(formId);
      setFormSubmissions(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch my form submissions';
      setError(errorMessage);
      console.error('Error fetching my form submissions:', err);
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const fetchFormsStats = useCallback(async () => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getFormsStats();
      setFormsStats(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch forms stats';
      setError(errorMessage);
      console.error('Error fetching forms stats:', err);
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  // ========== MUTATIONS ==========

  const createApplication = useCallback(async (input: CreateApplicationInput): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.createApplication(input);
      
      // Add new application to local state
      setApplications(prev => [result, ...prev]);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create application';
      setError(errorMessage);
      console.error('Error creating application:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const updateMyApplication = useCallback(async (
    applicationId: string, 
    updates: Partial<CreateApplicationInput>
  ): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.updateMyApplication(applicationId, updates);
      
      // Update application in local state
      setApplications(prev => 
        prev.map(app => 
          app.applicationId === applicationId ? result : app
        )
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update application';
      setError(errorMessage);
      console.error('Error updating application:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const deleteMyApplication = useCallback(async (applicationId: string): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const success = await graphqlService.deleteMyApplication(applicationId);
      
      if (success) {
        // Remove application from local state
        setApplications(prev => 
          prev.filter(app => app.applicationId !== applicationId)
        );
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete application';
      setError(errorMessage);
      console.error('Error deleting application:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const updateApplicationStatus = useCallback(async (
    userId: string,
    applicationId: string,
    status: Application['status']
  ): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.updateApplicationStatus(userId, applicationId, status);
      
      // Update application status in local state
      setApplications(prev => 
        prev.map(app => 
          app.applicationId === applicationId ? result : app
        )
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update application status';
      setError(errorMessage);
      console.error('Error updating application status:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const uploadDocument = useCallback(async (input: UploadDocumentInput): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.uploadDocument(input);
      
      // Add new document to local state
      setDocuments(prev => [result, ...prev]);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
      console.error('Error uploading document:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  // ========== JOB POSTING METHODS ==========
  
  const fetchActiveJobPostings = useCallback(async (limit?: number) => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getActiveJobPostings(limit);
      setJobPostings(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job postings';
      setError(errorMessage);
      console.error('Error fetching active job postings:', err);
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const fetchJobPosting = useCallback(async (jobId: string): Promise<JobPosting | null> => {
    if (!isGraphQLAvailable()) return null;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getJobPosting(jobId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job posting';
      setError(errorMessage);
      console.error('Error fetching job posting:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const fetchAllJobPostings = useCallback(async (status?: JobPosting['status']) => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getAllJobPostings(status);
      setJobPostings(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch all job postings';
      setError(errorMessage);
      console.error('Error fetching all job postings:', err);
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const fetchJobPostingStats = useCallback(async () => {
    if (!isGraphQLAvailable()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.getJobPostingStats();
      setJobPostingStats(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job posting stats';
      setError(errorMessage);
      console.error('Error fetching job posting stats:', err);
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const createJobPosting = useCallback(async (input: CreateJobPostingInput): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.createJobPosting(input);
      
      // Add new job posting to local state
      setJobPostings(prev => [result, ...prev]);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create job posting';
      setError(errorMessage);
      console.error('Error creating job posting:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const updateJobPosting = useCallback(async (input: UpdateJobPostingInput): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.updateJobPosting(input);
      
      // Update job posting in local state
      setJobPostings(prev => 
        prev.map(job => 
          job.jobId === input.jobId ? result : job
        )
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update job posting';
      setError(errorMessage);
      console.error('Error updating job posting:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const deleteJobPosting = useCallback(async (jobId: string): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const success = await graphqlService.deleteJobPosting(jobId);
      
      if (success) {
        // Remove job posting from local state
        setJobPostings(prev => 
          prev.filter(job => job.jobId !== jobId)
        );
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete job posting';
      setError(errorMessage);
      console.error('Error deleting job posting:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const publishJobPosting = useCallback(async (jobId: string): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.publishJobPosting(jobId);
      
      // Update job posting status in local state
      setJobPostings(prev => 
        prev.map(job => 
          job.jobId === jobId ? result : job
        )
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish job posting';
      setError(errorMessage);
      console.error('Error publishing job posting:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const pauseJobPosting = useCallback(async (jobId: string): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.pauseJobPosting(jobId);
      
      // Update job posting status in local state
      setJobPostings(prev => 
        prev.map(job => 
          job.jobId === jobId ? result : job
        )
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause job posting';
      setError(errorMessage);
      console.error('Error pausing job posting:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  // ========== DYNAMIC FORMS MUTATIONS ==========

  const createForm = useCallback(async (input: CreateFormInput): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.createForm(input);
      
      // Add new form to local state
      setForms(prev => [result, ...prev]);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create form';
      setError(errorMessage);
      console.error('Error creating form:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const updateForm = useCallback(async (input: UpdateFormInput): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.updateForm(input);
      
      // Update form in local state
      setForms(prev => 
        prev.map(form => 
          form.formId === input.formId ? result : form
        )
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update form';
      setError(errorMessage);
      console.error('Error updating form:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const deleteForm = useCallback(async (formId: string): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const success = await graphqlService.deleteForm(formId);
      
      if (success) {
        // Remove form from local state
        setForms(prev => 
          prev.filter(form => form.formId !== formId)
        );
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete form';
      setError(errorMessage);
      console.error('Error deleting form:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const publishForm = useCallback(async (formId: string): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.publishForm(formId);
      
      // Update form status in local state
      setForms(prev => 
        prev.map(form => 
          form.formId === formId ? { ...form, status: result.status } : form
        )
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish form';
      setError(errorMessage);
      console.error('Error publishing form:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const pauseForm = useCallback(async (formId: string): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.pauseForm(formId);
      
      // Update form status in local state
      setForms(prev => 
        prev.map(form => 
          form.formId === formId ? { ...form, status: result.status } : form
        )
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause form';
      setError(errorMessage);
      console.error('Error pausing form:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const submitForm = useCallback(async (input: SubmitFormInput): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.submitForm(input);
      
      // Add new submission to local state
      setFormSubmissions(prev => [result, ...prev]);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit form';
      setError(errorMessage);
      console.error('Error submitting form:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  const reviewSubmission = useCallback(async (input: ReviewSubmissionInput): Promise<boolean> => {
    if (!isGraphQLAvailable()) return false;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlService.reviewSubmission(input);
      
      // Update submission in local state
      setFormSubmissions(prev => 
        prev.map(submission => 
          submission.submissionId === input.submissionId ? result : submission
        )
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to review submission';
      setError(errorMessage);
      console.error('Error reviewing submission:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // FIXED: Remove isGraphQLAvailable dependency to prevent infinite loops

  return {
    // State
    applications,
    documents,
    applicationStats,
    jobPostings,
    jobPostingStats,
    forms,
    formSubmissions,
    formsStats,
    loading,
    error,
    
    // Queries
    fetchMyApplications,
    fetchAllApplications,
    fetchMyDocuments,
    fetchApplicationStats,
    
    // Job Posting Queries
    fetchActiveJobPostings,
    fetchJobPosting,
    fetchAllJobPostings,
    fetchJobPostingStats,
    
    // Dynamic Forms Queries
    fetchActiveForms,
    fetchAllForms,
    fetchForm,
    fetchFormSubmissions,
    fetchMyFormSubmissions,
    fetchFormsStats,
    
    // Mutations
    createApplication,
    updateMyApplication,
    deleteMyApplication,
    updateApplicationStatus,
    uploadDocument,
    
    // Job Posting Mutations
    createJobPosting,
    updateJobPosting,
    deleteJobPosting,
    publishJobPosting,
    pauseJobPosting,
    
    // Dynamic Forms Mutations
    createForm,
    updateForm,
    deleteForm,
    publishForm,
    pauseForm,
    submitForm,
    reviewSubmission,
    
    // Utils
    clearError,
    isGraphQLAvailable,
  };
};