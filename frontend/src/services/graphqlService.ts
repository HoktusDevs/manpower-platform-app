import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import { cognitoAuthService } from './cognitoAuthService';
// Import separated services
import { DocumentsService } from './graphql/documents';
import { ApplicationsService } from './graphql/applications';
import { JobPostingsService } from './graphql/jobPostings';
import { FormsService } from './graphql/forms';
import { FoldersService } from './graphql/folders';

// GraphQL Client Configuration
interface GraphQLConfig {
  graphqlEndpoint: string;
  region: string;
  authenticationType: 'AMAZON_COGNITO_USER_POOLS' | 'AWS_IAM';
  userPoolId?: string;
  userPoolClientId?: string;
  identityPoolId?: string;
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
    
    // Configure Amplify properly for AppSync with Cognito User Pools
    const amplifyConfig = {
      API: {
        GraphQL: {
          endpoint: config.graphqlEndpoint,
          region: config.region,
          defaultAuthMode: 'userPool' as const
        }
      },
      Auth: {
        Cognito: {
          userPoolId: config.userPoolId || import.meta.env.VITE_USER_POOL_ID,
          userPoolClientId: config.userPoolClientId || import.meta.env.VITE_USER_POOL_CLIENT_ID
        }
      }
    };
    
    Amplify.configure(amplifyConfig);
    this.client = generateClient() as typeof this.client;
    
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

    // Check authentication and token
    const currentUser = cognitoAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('NoSignedUser: No current user');
    }

    const idToken = cognitoAuthService.getIdToken();
    if (!idToken) {
      cognitoAuthService.logout();
      localStorage.clear();
      window.location.href = '/login?reason=no_token';
      throw new Error('No authentication token');
    }

    // Validate token has role claim
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      if (!payload['custom:role']) {
        cognitoAuthService.logout();
        localStorage.clear();
        window.location.href = '/login?reason=missing_role';
        throw new Error('Token missing role claim');
      }
    } catch {
      cognitoAuthService.logout();
      localStorage.clear();
      window.location.href = '/login?reason=invalid_token';
      throw new Error('Invalid token format');
    }

    const result = await this.client.graphql({
      query,
      variables,
      authMode: 'userPool'
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
        cognitoAuthService.logout();
        localStorage.clear();
        window.location.href = '/login?reason=auth_expired';
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
  async updateApplicationStatus(userId: string, applicationId: string, status: string): Promise<any> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const result = await this.executeMutation<{ updateApplicationStatus: any }>(
      UPDATE_APPLICATION_STATUS,
      { applicationId, userId, status }
    );
    return result.updateApplicationStatus;
  }

  // Subscription methods
  async subscribeToMyApplicationUpdates(userId: string): Promise<unknown> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante' || user.userId !== userId) {
      throw new Error('Can only subscribe to own application updates');
    }

    return this.subscribe(ON_MY_APPLICATION_UPDATED, { userId });
  }

  async subscribeToApplicationCreated(): Promise<unknown> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    return this.subscribe(ON_APPLICATION_CREATED);
  }

  // ========== FACADE METHODS FOR UI COMPONENTS ==========
  // These methods delegate to specialized services for backward compatibility

  /**
   * ADMIN ONLY: Get all applications
   */
  async getAllApplications(status?: any, limit?: number, nextToken?: string): Promise<any[]> {
    if (!this.applicationsService) {
      throw new Error('ApplicationsService not initialized');
    }
    return this.applicationsService.getAllApplications(status, limit, nextToken);
  }

  /**
   * ADMIN ONLY: Get application statistics
   */
  async getApplicationStats(): Promise<any> {
    if (!this.applicationsService) {
      throw new Error('ApplicationsService not initialized');
    }
    return this.applicationsService.getApplicationStats();
  }

  /**
   * PUBLIC: Get active job postings
   */
  async getActiveJobPostings(limit?: number, nextToken?: string): Promise<any[]> {
    if (!this.jobPostingsService) {
      throw new Error('JobPostingsService not initialized');
    }
    return this.jobPostingsService.getActiveJobPostings(limit, nextToken);
  }

  /**
   * ADMIN ONLY: Get all job postings
   */
  async getAllJobPostings(status?: any, limit?: number, nextToken?: string): Promise<any[]> {
    if (!this.jobPostingsService) {
      throw new Error('JobPostingsService not initialized');
    }
    return this.jobPostingsService.getAllJobPostings(status, limit, nextToken);
  }

  /**
   * ADMIN ONLY: Get job posting statistics
   */
  async getJobPostingStats(): Promise<any> {
    if (!this.jobPostingsService) {
      throw new Error('JobPostingsService not initialized');
    }
    return this.jobPostingsService.getJobPostingStats();
  }

  /**
   * PUBLIC: Get active forms
   */
  async getActiveForms(jobId?: string, limit?: number): Promise<any[]> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.getActiveForms(jobId, limit);
  }

  /**
   * ADMIN ONLY: Get all forms
   */
  async getAllForms(status?: string, jobId?: string, limit?: number): Promise<any[]> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.getAllForms(status, jobId, limit);
  }

  /**
   * ADMIN ONLY: Get forms statistics
   */
  async getFormsStats(): Promise<any> {
    if (!this.formsService) {
      throw new Error('FormsService not initialized');
    }
    return this.formsService.getFormsStats();
  }

  /**
   * Get all folders
   */
  async getAllFolders(parentId?: string, limit?: number): Promise<any[]> {
    if (!this.foldersService) {
      throw new Error('FoldersService not initialized');
    }
    return this.foldersService.getAllFolders(parentId, limit);
  }

  /**
   * ADMIN ONLY: Get folders statistics
   */
  async getFoldersStats(): Promise<any> {
    if (!this.foldersService) {
      throw new Error('FoldersService not initialized');
    }
    return this.foldersService.getFoldersStats();
  }

  /**
   * POSTULANTE: Get my applications
   */
  async getMyApplications(): Promise<any[]> {
    if (!this.applicationsService) {
      throw new Error('ApplicationsService not initialized');
    }
    return this.applicationsService.getMyApplications();
  }

  /**
   * POSTULANTE: Get my documents
   */
  async getMyDocuments(): Promise<any[]> {
    if (!this.documentsService) {
      throw new Error('DocumentsService not initialized');
    }
    return this.documentsService.getMyDocuments();
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