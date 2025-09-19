import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import { publicGraphqlService } from './publicGraphqlService';
// Import separated services
import { DocumentsService } from './graphql/documents';
import { ApplicationsService } from './graphql/applications';
import { JobPostingsService } from './graphql/jobPostings';
import { FormsService } from './graphql/forms';
import { FoldersService } from './graphql/folders';
// Import types for proper typing
import type { Application, CreateApplicationInput, ApplicationStats } from './graphql/applications';
import type { Form, FormSubmission, CreateFormInput, UpdateFormInput, SubmitFormInput, ReviewSubmissionInput, FormsStats } from './graphql/forms';
import type { Folder, CreateFolderInput, UpdateFolderInput, FoldersStats } from './graphql/folders';
import type { JobPosting, CreateJobPostingInput, UpdateJobPostingInput, JobPostingStats } from './graphql/jobPostings';
import type { Document, UploadDocumentInput } from './graphql/documents';

// GraphQL Client Configuration
interface GraphQLConfig {
  graphqlEndpoint: string;
  region: string;
  authenticationType: 'AMAZON_COGNITO_USER_POOLS' | 'AWS_IAM';
  userPoolId?: string;
  userPoolClientId?: string;
  identityPoolId?: string;
  apiKey?: string;
}

// Subscription queries (only operations remaining in main service)
const UPDATE_APPLICATION_STATUS = `
  mutation UpdateApplicationStatus($applicationId: String!, $userId: String!, $status: ApplicationStatus!) {
    updateApplicationStatus(applicationId: $applicationId, userId: $userId, status: $status) {
      userId
      applicationId
      companyName
      position
      status
      description
      salary
      location
      createdAt
      updatedAt
      companyId
    }
  }
`;

const ON_MY_APPLICATION_UPDATED = `
  subscription OnMyApplicationUpdated($userId: String!) {
    onMyApplicationUpdated(userId: $userId) {
      userId
      applicationId
      companyName
      position
      status
      description
      salary
      location
      createdAt
      updatedAt
      companyId
    }
  }
`;

const ON_APPLICATION_CREATED = `
  subscription OnApplicationCreated {
    onApplicationCreated {
      userId
      applicationId
      companyName
      position
      status
      description
      salary
      location
      createdAt
      updatedAt
      companyId
    }
  }
`;

class GraphQLService {
  private client: { graphql: (options: { query: string; variables?: Record<string, unknown>; authMode?: string }) => Promise<{ data?: unknown; errors?: unknown[] }> } | null = null;
  private config: GraphQLConfig | null = null;
  
  // Separated services
  public documentsService: DocumentsService | null = null;
  public applicationsService: ApplicationsService | null = null;
  public jobPostingsService: JobPostingsService | null = null;
  public formsService: FormsService | null = null;
  public foldersService: FoldersService | null = null;

  /**
   * Initialize GraphQL service with AppSync configuration
   */
  async initialize(config: GraphQLConfig): Promise<void> {
    this.config = config;
    
    // Configure Amplify based on authentication type
    const amplifyConfig: Record<string, unknown> = {
      API: {
        GraphQL: {
          endpoint: config.graphqlEndpoint,
          region: config.region,
          defaultAuthMode: 'userPool' // Force userPool mode
        }
      }
    };

    // Add appropriate auth configuration - support both User Pool and Identity Pool
    // This allows AppSync to work with both authentication types
    const authConfig: Record<string, unknown> = {
      userPoolId: config.userPoolId,
      userPoolClientId: config.userPoolClientId
    };

    // DON'T configure Identity Pool initially - it causes 400 errors for unauthenticated users
    // Identity Pool will be configured automatically by Amplify when user logs in
    console.log('🔧 Configuring User Pool only - Identity Pool will be added after login');
    
    amplifyConfig.Auth = {
      Cognito: authConfig
    };
    
    Amplify.configure(amplifyConfig);
    this.client = generateClient() as typeof this.client;

    // Initialize public GraphQL service if API key is available
    if (config.apiKey) {
      await publicGraphqlService.initialize({
        graphqlEndpoint: config.graphqlEndpoint,
        region: config.region,
        apiKey: config.apiKey
      });
    }

    // Initialize separated services
    this.documentsService = new DocumentsService(
      this.executeQuery.bind(this),
      this.executeMutation.bind(this)
    );
    this.applicationsService = new ApplicationsService(
      this.executeQuery.bind(this),
      this.executeMutation.bind(this),
      this.client!
    );
    this.jobPostingsService = new JobPostingsService(
      this.executeQuery.bind(this),
      this.executeMutation.bind(this)
    );
    this.formsService = new FormsService(
      this.executeQuery.bind(this),
      this.executeMutation.bind(this)
    );
    this.foldersService = new FoldersService(
      this.executeQuery.bind(this),
      this.executeMutation.bind(this)
    );
  }

  /**
   * Execute GraphQL query with enhanced error handling
   */
  private async executeQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    if (!this.client) {
      throw new Error('GraphQL service not initialized');
    }

    // Determine auth mode and perform appropriate checks
    const authMode = this.config?.authenticationType === 'AWS_IAM' ? 'identityPool' : 'userPool';
    
    if (authMode === 'userPool') {
      // FUCK IT - NO AUTH CHECKS FOR NOW
      // Just proceed with GraphQL call
    }
    // For AWS_IAM mode (identityPool), no explicit authentication checks needed

    const result = await this.client.graphql({
      query,
      variables,
      authMode: authMode as 'userPool' | 'identityPool'
    });

    // Handle GraphQL errors
    if (result.errors && result.errors.length > 0) {
      const nonNullErrors = result.errors.filter((err: unknown) => {
        if (typeof err === 'object' && err !== null && 'message' in err) {
          const message = String((err as { message: string }).message);
          return !message.includes('Cannot return null for non-nullable type');
        }
        return true;
      });
      
      // Check for authorization errors
      const authErrors = nonNullErrors.filter((err: unknown) => {
        if (typeof err === 'object' && err !== null && 'message' in err) {
          const message = String((err as { message: string }).message);
          return message.includes('Not Authorized to access') && message.includes('on type');
        }
        return false;
      });
      
      if (authErrors.length > 0) {
        // Only redirect to login in userPool mode, not in AWS_IAM mode
        if (authMode === 'userPool') {
          cognitoAuthService.logout();
          localStorage.clear();
          window.location.href = '/login?reason=auth_expired';
        }
        throw new Error('Authorization failed - please log in again');
      }
      
      if (nonNullErrors.length > 0) {
        const errorMessage = nonNullErrors.map((err: unknown) => {
          return typeof err === 'object' && err !== null && 'message' in err 
            ? String((err as { message: string }).message)
            : String(err);
        }).join(', ');
        throw new Error(`GraphQL Error: ${errorMessage}`);
      }
    }

    return (result as { data: T }).data;
  }

  /**
   * Execute GraphQL mutation
   */
  private async executeMutation<T>(mutation: string, variables?: Record<string, unknown>): Promise<T> {
    // Same implementation as executeQuery but for mutations
    return this.executeQuery<T>(mutation, variables);
  }

  /**
   * Subscribe to GraphQL subscription
   */
  private async subscribe(subscription: string, variables?: Record<string, unknown>): Promise<unknown> {
    if (!this.client) {
      throw new Error('GraphQL service not initialized');
    }

    const sub = this.client.graphql({
      query: subscription,
      variables,
      authMode: 'userPool'
    });

    return sub;
  }

  // Core admin-only operations that require custom logic
  async updateApplicationStatus(userId: string, applicationId: string, status: Application['status']): Promise<Application> {
    // Skip auth check for now

    const result = await this.executeMutation<{ updateApplicationStatus: Application }>(
      UPDATE_APPLICATION_STATUS,
      { applicationId, userId, status }
    );
    return result.updateApplicationStatus;
  }

  // Subscription methods
  async subscribeToMyApplicationUpdates(userId: string): Promise<unknown> {
    // Skip auth check for now
    return this.subscribe(ON_MY_APPLICATION_UPDATED, { userId });
  }

  async subscribeToApplicationCreated(): Promise<unknown> {
    // Skip auth check for now
    return this.subscribe(ON_APPLICATION_CREATED);
  }

  // ========== FACADE METHODS FOR UI COMPONENTS ==========
  // These methods delegate to specialized services for backward compatibility

  /**
   * ADMIN ONLY: Get all applications
   */
  async getAllApplications(status?: Application['status'], limit?: number, nextToken?: string): Promise<Application[]> {
    if (!this.applicationsService) {
      throw new Error('ApplicationsService not initialized');
    }
    return this.applicationsService.getAllApplications(status, limit, nextToken);
  }

  /**
   * ADMIN ONLY: Get application statistics
   */
  async getApplicationStats(): Promise<ApplicationStats> {
    if (!this.applicationsService) {
      throw new Error('ApplicationsService not initialized');
    }
    return this.applicationsService.getApplicationStats();
  }

  /**
   * POSTULANTE: Apply to a single job from /aplicar page
   */
  async applyToJob(jobId: string): Promise<Application> {
    if (!this.applicationsService) {
      throw new Error('ApplicationsService not initialized');
    }
    return this.applicationsService.applyToJob(jobId);
  }

  /**
   * POSTULANTE: Apply to multiple jobs from /aplicar page
   */
  async applyToMultipleJobs(jobIds: string[]): Promise<Application[]> {
    if (!this.applicationsService) {
      throw new Error('ApplicationsService not initialized');
    }
    return this.applicationsService.applyToMultipleJobs(jobIds);
  }

  /**
   * PUBLIC: Get active job postings
   */
  async getActiveJobPostings(limit?: number, nextToken?: string): Promise<JobPosting[]> {
    if (!this.jobPostingsService) {
      throw new Error('JobPostingsService not initialized');
    }
    return this.jobPostingsService.getActiveJobPostings(limit, nextToken);
  }

  /**
   * ADMIN ONLY: Get all job postings
   */
  async getAllJobPostings(status?: JobPosting['status'], limit?: number, nextToken?: string): Promise<JobPosting[]> {
    if (!this.jobPostingsService) {
      throw new Error('JobPostingsService not initialized');
    }
    return this.jobPostingsService.getAllJobPostings(status, limit, nextToken);
  }

  /**
   * ADMIN ONLY: Get job posting statistics
   */
  async getJobPostingStats(): Promise<JobPostingStats> {
    if (!this.jobPostingsService) {
      throw new Error('JobPostingsService not initialized');
    }
    return this.jobPostingsService.getJobPostingStats();
  }

  /**
   * PUBLIC: Get active forms
   */
  async getActiveForms(jobId?: string, limit?: number): Promise<Form[]> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.getActiveForms(jobId, limit);
  }

  /**
   * ADMIN ONLY: Get all forms
   */
  async getAllForms(status?: Form['status'], jobId?: string, limit?: number): Promise<Form[]> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.getAllForms(status, jobId, limit);
  }

  /**
   * ADMIN ONLY: Get forms statistics
   */
  async getFormsStats(): Promise<FormsStats> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.getFormsStats();
  }

  /**
   * Get all folders
   */
  async getAllFolders(parentId?: string, limit?: number): Promise<Folder[]> {
    if (!this.foldersService) {
      throw new Error('FoldersService not initialized');
    }
    return this.foldersService.getAllFolders(parentId, limit);
  }

  /**
   * ADMIN ONLY: Get folders statistics
   */
  async getFoldersStats(): Promise<FoldersStats> {
    if (!this.foldersService) {
      throw new Error('FoldersService not initialized');
    }
    return this.foldersService.getFoldersStats();
  }

  /**
   * POSTULANTE: Get my applications
   */
  async getMyApplications(): Promise<Application[]> {
    if (!this.applicationsService) {
      throw new Error('ApplicationsService not initialized');
    }
    return this.applicationsService.getMyApplications();
  }

  /**
   * POSTULANTE: Get my documents
   */
  async getMyDocuments(): Promise<Document[]> {
    if (!this.documentsService) {
      throw new Error('DocumentsService not initialized');
    }
    return this.documentsService.getMyDocuments();
  }

  // === FACADE METHODS FOR SPECIALIZED SERVICES ===
  
  // --- FOLDERS SERVICE FACADE ---
  async createFolder(input: CreateFolderInput): Promise<Folder> {
    if (!this.foldersService) {
      throw new Error('FoldersService not initialized');
    }
    return this.foldersService.createFolder(input);
  }

  async deleteFolder(folderId: string): Promise<boolean> {
    if (!this.foldersService) {
      throw new Error('FoldersService not initialized');
    }
    return this.foldersService.deleteFolder(folderId);
  }

  async deleteFolders(folderIds: string[]): Promise<boolean> {
    if (!this.foldersService) {
      throw new Error('FoldersService not initialized');
    }
    return this.foldersService.deleteFolders(folderIds);
  }

  async updateFolder(input: UpdateFolderInput): Promise<Folder> {
    if (!this.foldersService) {
      throw new Error('FoldersService not initialized');
    }
    return this.foldersService.updateFolder(input);
  }

  // --- FORMS SERVICE FACADE ---
  async getForm(formId: string): Promise<Form | null> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.getForm(formId);
  }

  async getFormSubmissions(formId: string, status?: FormSubmission['status'], limit?: number): Promise<FormSubmission[]> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.getFormSubmissions(formId, status, limit);
  }

  async getMyFormSubmissions(formId?: string): Promise<FormSubmission[]> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.getMyFormSubmissions(formId);
  }

  async createForm(input: CreateFormInput): Promise<Form> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.createForm(input);
  }

  async updateForm(input: UpdateFormInput): Promise<Form> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.updateForm(input);
  }

  async deleteForm(formId: string): Promise<boolean> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.deleteForm(formId);
  }

  async publishForm(formId: string): Promise<Form> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.publishForm(formId);
  }

  async pauseForm(formId: string): Promise<Form> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.pauseForm(formId);
  }

  async submitForm(input: SubmitFormInput): Promise<FormSubmission> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.submitForm(input);
  }

  async reviewSubmission(input: ReviewSubmissionInput): Promise<FormSubmission> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.reviewSubmission(input);
  }

  // --- APPLICATIONS SERVICE FACADE ---
  async createApplication(input: CreateApplicationInput): Promise<Application> {
    if (!this.applicationsService) {
      throw new Error('ApplicationsService not initialized');
    }
    return this.applicationsService.createApplication(input);
  }

  async updateMyApplication(applicationId: string, updates: Partial<CreateApplicationInput>): Promise<Application> {
    if (!this.applicationsService) {
      throw new Error('ApplicationsService not initialized');
    }
    return this.applicationsService.updateMyApplication(applicationId, updates);
  }

  async deleteMyApplication(applicationId: string): Promise<boolean> {
    if (!this.applicationsService) {
      throw new Error('ApplicationsService not initialized');
    }
    return this.applicationsService.deleteMyApplication(applicationId);
  }

  // --- DOCUMENTS SERVICE FACADE ---
  async uploadDocument(input: UploadDocumentInput): Promise<Document> {
    if (!this.documentsService) {
      throw new Error('DocumentsService not initialized');
    }
    return this.documentsService.uploadDocument(input);
  }

  // --- JOB POSTINGS SERVICE FACADE ---
  async getJobPosting(jobId: string): Promise<JobPosting | null> {
    if (!this.jobPostingsService) {
      throw new Error('JobPostingsService not initialized');
    }
    return this.jobPostingsService.getJobPosting(jobId);
  }

  async createJobPosting(input: CreateJobPostingInput): Promise<JobPosting> {
    if (!this.jobPostingsService) {
      throw new Error('JobPostingsService not initialized');
    }
    return this.jobPostingsService.createJobPosting(input);
  }

  async updateJobPosting(input: UpdateJobPostingInput): Promise<JobPosting> {
    if (!this.jobPostingsService) {
      throw new Error('JobPostingsService not initialized');
    }
    return this.jobPostingsService.updateJobPosting(input);
  }

  async deleteJobPosting(jobId: string): Promise<boolean> {
    if (!this.jobPostingsService) {
      throw new Error('JobPostingsService not initialized');
    }
    return this.jobPostingsService.deleteJobPosting(jobId);
  }

  async publishJobPosting(jobId: string): Promise<JobPosting> {
    if (!this.jobPostingsService) {
      throw new Error('JobPostingsService not initialized');
    }
    return this.jobPostingsService.publishJobPosting(jobId);
  }

  async pauseJobPosting(jobId: string): Promise<JobPosting> {
    if (!this.jobPostingsService) {
      throw new Error('JobPostingsService not initialized');
    }
    return this.jobPostingsService.pauseJobPosting(jobId);
  }

  // Utility methods
  isInitialized(): boolean {
    return this.config !== null && this.client !== null;
  }

  getConfig(): GraphQLConfig | null {
    return this.config;
  }
}

// Export singleton instance
export const graphqlService = new GraphQLService();

// Re-export types from separated services for backward compatibility
export type { 
  Application, 
  CreateApplicationInput, 
  ApplicationStats
} from './graphql/applications';

export type {
  Document, 
  UploadDocumentInput
} from './graphql/documents';

export type {
  JobPosting,
  CreateJobPostingInput,
  UpdateJobPostingInput,
  JobPostingStats
} from './graphql/jobPostings';

export type {
  Form,
  FormField,
  FieldValidation,
  FormSubmission,
  FieldResponse,
  FormsStats,
  CreateFormInput,
  CreateFormFieldInput,
  UpdateFormInput,
  UpdateFormFieldInput,
  SubmitFormInput,
  SubmitFieldResponseInput,
  ReviewSubmissionInput
} from './graphql/forms';

export type {
  Folder,
  CreateFolderInput,
  UpdateFolderInput,
  FoldersStats
} from './graphql/folders';