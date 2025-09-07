import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import { cognitoAuthService } from './cognitoAuthService';

// GraphQL Client Configuration
interface GraphQLConfig {
  graphqlEndpoint: string;
  region: string;
  authenticationType: 'AMAZON_COGNITO_USER_POOLS' | 'AWS_IAM';
}

interface Application {
  userId: string;
  applicationId: string;
  companyName: string;
  position: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW' | 'INTERVIEW_SCHEDULED' | 'HIRED';
  description?: string;
  salary?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  companyId?: string;
}

interface Document {
  userId: string;
  documentId: string;
  fileName: string;
  documentType: 'RESUME' | 'COVER_LETTER' | 'PORTFOLIO' | 'CERTIFICATE' | 'ID_DOCUMENT' | 'OTHER';
  s3Key: string;
  uploadedAt: string;
  fileSize?: number;
  mimeType?: string;
}

interface CreateApplicationInput {
  companyName: string;
  position: string;
  description?: string;
  salary?: string;
  location?: string;
  companyId?: string;
}

interface UploadDocumentInput {
  fileName: string;
  documentType: Document['documentType'];
  fileSize?: number;
  mimeType?: string;
}

interface ApplicationStats {
  totalApplications: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  inReviewCount: number;
  averageProcessingTime?: number;
  topCompanies: Array<{
    companyId: string;
    companyName: string;
    applicationCount: number;
    approvedCount: number;
    rejectedCount: number;
  }>;
}

interface JobPosting {
  jobId: string;
  title: string;
  description: string;
  requirements: string;
  salary?: string;
  location: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'FREELANCE' | 'INTERNSHIP' | 'TEMPORARY';
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'EXPIRED' | 'CLOSED';
  companyName: string;
  companyId?: string;
  benefits?: string;
  experienceLevel: 'ENTRY_LEVEL' | 'MID_LEVEL' | 'SENIOR_LEVEL' | 'EXECUTIVE' | 'INTERNSHIP';
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  applicationCount?: number;
}

interface CreateJobPostingInput {
  title: string;
  description: string;
  requirements: string;
  salary?: string;
  location: string;
  employmentType: JobPosting['employmentType'];
  companyName: string;
  companyId?: string;
  benefits?: string;
  experienceLevel: JobPosting['experienceLevel'];
  expiresAt?: string;
}

interface UpdateJobPostingInput {
  jobId: string;
  title?: string;
  description?: string;
  requirements?: string;
  salary?: string;
  location?: string;
  employmentType?: JobPosting['employmentType'];
  companyName?: string;
  companyId?: string;
  benefits?: string;
  experienceLevel?: JobPosting['experienceLevel'];
  status?: JobPosting['status'];
  expiresAt?: string;
}

interface JobPostingStats {
  totalJobPostings: number;
  publishedCount: number;
  draftCount: number;
  pausedCount: number;
  expiredCount: number;
  closedCount: number;
  averageApplicationsPerJob?: number;
  topEmploymentTypes: Array<{
    employmentType: JobPosting['employmentType'];
    count: number;
    applicationCount: number;
  }>;
  topExperienceLevels: Array<{
    experienceLevel: JobPosting['experienceLevel'];
    count: number;
    applicationCount: number;
  }>;
}

// GraphQL Queries and Mutations
const GET_MY_APPLICATIONS = `
  query GetMyApplications {
    getMyApplications {
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

const GET_ALL_APPLICATIONS = `
  query GetAllApplications($status: ApplicationStatus, $limit: Int, $nextToken: String) {
    getAllApplications(status: $status, limit: $limit, nextToken: $nextToken) {
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

const GET_MY_DOCUMENTS = `
  query GetMyDocuments {
    getMyDocuments {
      userId
      documentId
      fileName
      documentType
      s3Key
      uploadedAt
      fileSize
      mimeType
    }
  }
`;

const GET_APPLICATION_STATS = `
  query GetApplicationStats {
    getApplicationStats {
      totalApplications
      pendingCount
      approvedCount
      rejectedCount
      inReviewCount
      averageProcessingTime
      topCompanies {
        companyId
        companyName
        applicationCount
        approvedCount
        rejectedCount
      }
    }
  }
`;

const CREATE_APPLICATION = `
  mutation CreateApplication($input: CreateApplicationInput!) {
    createApplication(input: $input) {
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

const UPDATE_MY_APPLICATION = `
  mutation UpdateMyApplication($input: UpdateApplicationInput!) {
    updateMyApplication(input: $input) {
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

const DELETE_MY_APPLICATION = `
  mutation DeleteMyApplication($applicationId: String!) {
    deleteMyApplication(applicationId: $applicationId)
  }
`;

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

const UPLOAD_DOCUMENT = `
  mutation UploadDocument($input: UploadDocumentInput!) {
    uploadDocument(input: $input) {
      userId
      documentId
      fileName
      documentType
      s3Key
      uploadedAt
      fileSize
      mimeType
    }
  }
`;

// Subscriptions
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

// JOB POSTINGS QUERIES AND MUTATIONS
const GET_ACTIVE_JOB_POSTINGS = `
  query GetActiveJobPostings($limit: Int, $nextToken: String) {
    getActiveJobPostings(limit: $limit, nextToken: $nextToken) {
      jobId
      title
      description
      requirements
      salary
      location
      employmentType
      status
      companyName
      companyId
      benefits
      experienceLevel
      createdAt
      updatedAt
      expiresAt
      applicationCount
    }
  }
`;

const GET_JOB_POSTING = `
  query GetJobPosting($jobId: String!) {
    getJobPosting(jobId: $jobId) {
      jobId
      title
      description
      requirements
      salary
      location
      employmentType
      status
      companyName
      companyId
      benefits
      experienceLevel
      createdAt
      updatedAt
      expiresAt
      applicationCount
    }
  }
`;

const GET_ALL_JOB_POSTINGS = `
  query GetAllJobPostings($status: JobStatus, $limit: Int, $nextToken: String) {
    getAllJobPostings(status: $status, limit: $limit, nextToken: $nextToken) {
      jobId
      title
      description
      requirements
      salary
      location
      employmentType
      status
      companyName
      companyId
      benefits
      experienceLevel
      createdAt
      updatedAt
      expiresAt
      applicationCount
    }
  }
`;

const GET_JOB_POSTING_STATS = `
  query GetJobPostingStats {
    getJobPostingStats {
      totalJobPostings
      publishedCount
      draftCount
      pausedCount
      expiredCount
      closedCount
      averageApplicationsPerJob
      topEmploymentTypes {
        employmentType
        count
        applicationCount
      }
      topExperienceLevels {
        experienceLevel
        count
        applicationCount
      }
    }
  }
`;

const CREATE_JOB_POSTING = `
  mutation CreateJobPosting($input: CreateJobPostingInput!) {
    createJobPosting(input: $input) {
      jobId
      title
      description
      requirements
      salary
      location
      employmentType
      status
      companyName
      companyId
      benefits
      experienceLevel
      createdAt
      updatedAt
      expiresAt
      applicationCount
    }
  }
`;

const UPDATE_JOB_POSTING = `
  mutation UpdateJobPosting($input: UpdateJobPostingInput!) {
    updateJobPosting(input: $input) {
      jobId
      title
      description
      requirements
      salary
      location
      employmentType
      status
      companyName
      companyId
      benefits
      experienceLevel
      createdAt
      updatedAt
      expiresAt
      applicationCount
    }
  }
`;

const DELETE_JOB_POSTING = `
  mutation DeleteJobPosting($jobId: String!) {
    deleteJobPosting(jobId: $jobId)
  }
`;

const PUBLISH_JOB_POSTING = `
  mutation PublishJobPosting($jobId: String!) {
    publishJobPosting(jobId: $jobId) {
      jobId
      title
      description
      requirements
      salary
      location
      employmentType
      status
      companyName
      companyId
      benefits
      experienceLevel
      createdAt
      updatedAt
      expiresAt
      applicationCount
    }
  }
`;

const PAUSE_JOB_POSTING = `
  mutation PauseJobPosting($jobId: String!) {
    pauseJobPosting(jobId: $jobId) {
      jobId
      title
      description
      requirements
      salary
      location
      employmentType
      status
      companyName
      companyId
      benefits
      experienceLevel
      createdAt
      updatedAt
      expiresAt
      applicationCount
    }
  }
`;

class GraphQLService {
  private client: any = null;
  private config: GraphQLConfig | null = null;

  /**
   * Initialize GraphQL service with AppSync configuration
   */
  initialize(config: GraphQLConfig): void {
    this.config = config;

    // Configure Amplify for GraphQL
    Amplify.configure({
      API: {
        GraphQL: {
          endpoint: config.graphqlEndpoint,
          region: config.region,
          defaultAuthMode: 'userPool'
        }
      }
    });

    // Generate GraphQL client
    this.client = generateClient();
    
    console.log('🚀 GraphQL Service initialized with AppSync');
  }

  /**
   * SECURITY: Check if user is authenticated and get auth token
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const user = cognitoAuthService.getCurrentUser();
    const idToken = localStorage.getItem('cognito_id_token');
    
    if (!user || !idToken) {
      throw new Error('User not authenticated');
    }

    return {
      Authorization: `Bearer ${idToken}`
    };
  }

  /**
   * Execute GraphQL query
   */
  private async executeQuery<T>(query: string, variables?: any): Promise<T> {
    if (!this.client) {
      throw new Error('GraphQL service not initialized');
    }

    try {
      const result = await this.client.graphql({
        query,
        variables,
        authMode: 'userPool'
      });

      return result.data;
    } catch (error) {
      console.error('GraphQL Query Error:', error);
      throw error;
    }
  }

  /**
   * Execute GraphQL mutation
   */
  private async executeMutation<T>(mutation: string, variables?: any): Promise<T> {
    if (!this.client) {
      throw new Error('GraphQL service not initialized');
    }

    try {
      const result = await this.client.graphql({
        query: mutation,
        variables,
        authMode: 'userPool'
      });

      return result.data;
    } catch (error) {
      console.error('GraphQL Mutation Error:', error);
      throw error;
    }
  }

  /**
   * Subscribe to GraphQL subscription
   */
  private async subscribe<T>(subscription: string, variables?: any): Promise<any> {
    if (!this.client) {
      throw new Error('GraphQL service not initialized');
    }

    try {
      const sub = this.client.graphql({
        query: subscription,
        variables,
        authMode: 'userPool'
      });

      return sub;
    } catch (error) {
      console.error('GraphQL Subscription Error:', error);
      throw error;
    }
  }

  // ========== POSTULANTE METHODS ==========

  /**
   * POSTULANTE: Get my applications
   */
  async getMyApplications(): Promise<Application[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante') {
      throw new Error('Only postulantes can access their applications');
    }

    const result = await this.executeQuery<{ getMyApplications: Application[] }>(GET_MY_APPLICATIONS);
    return result.getMyApplications;
  }

  /**
   * POSTULANTE: Create new application
   */
  async createApplication(input: CreateApplicationInput): Promise<Application> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante') {
      throw new Error('Only postulantes can create applications');
    }

    const result = await this.executeMutation<{ createApplication: Application }>(
      CREATE_APPLICATION,
      { input }
    );
    return result.createApplication;
  }

  /**
   * POSTULANTE: Update my application
   */
  async updateMyApplication(applicationId: string, updates: Partial<CreateApplicationInput>): Promise<Application> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante') {
      throw new Error('Only postulantes can update their applications');
    }

    const result = await this.executeMutation<{ updateMyApplication: Application }>(
      UPDATE_MY_APPLICATION,
      { 
        input: {
          applicationId,
          ...updates
        }
      }
    );
    return result.updateMyApplication;
  }

  /**
   * POSTULANTE: Delete my application
   */
  async deleteMyApplication(applicationId: string): Promise<boolean> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante') {
      throw new Error('Only postulantes can delete their applications');
    }

    const result = await this.executeMutation<{ deleteMyApplication: boolean }>(
      DELETE_MY_APPLICATION,
      { applicationId }
    );
    return result.deleteMyApplication;
  }

  /**
   * POSTULANTE: Get my documents
   */
  async getMyDocuments(): Promise<Document[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante') {
      throw new Error('Only postulantes can access their documents');
    }

    const result = await this.executeQuery<{ getMyDocuments: Document[] }>(GET_MY_DOCUMENTS);
    return result.getMyDocuments;
  }

  /**
   * POSTULANTE: Upload document
   */
  async uploadDocument(input: UploadDocumentInput): Promise<Document> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante') {
      throw new Error('Only postulantes can upload documents');
    }

    const result = await this.executeMutation<{ uploadDocument: Document }>(
      UPLOAD_DOCUMENT,
      { input }
    );
    return result.uploadDocument;
  }

  // ========== ADMIN METHODS ==========

  /**
   * ADMIN ONLY: Get all applications
   */
  async getAllApplications(status?: Application['status'], limit?: number, nextToken?: string): Promise<Application[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      console.error('🚨 SECURITY: Non-admin attempted to access all applications');
      throw new Error('Admin access required');
    }

    const result = await this.executeQuery<{ getAllApplications: Application[] }>(
      GET_ALL_APPLICATIONS,
      { status, limit, nextToken }
    );
    return result.getAllApplications;
  }

  /**
   * ADMIN ONLY: Update application status
   */
  async updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: Application['status']
  ): Promise<Application> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      console.error('🚨 SECURITY: Non-admin attempted to update application status');
      throw new Error('Admin access required');
    }

    const result = await this.executeMutation<{ updateApplicationStatus: Application }>(
      UPDATE_APPLICATION_STATUS,
      { applicationId, userId, status }
    );
    return result.updateApplicationStatus;
  }

  /**
   * ADMIN ONLY: Get application statistics
   */
  async getApplicationStats(): Promise<ApplicationStats> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const result = await this.executeQuery<{ getApplicationStats: ApplicationStats }>(GET_APPLICATION_STATS);
    return result.getApplicationStats;
  }

  // ========== JOB POSTINGS METHODS ==========

  /**
   * PUBLIC: Get active job postings (published, not expired)
   */
  async getActiveJobPostings(limit?: number, nextToken?: string): Promise<JobPosting[]> {
    const result = await this.executeQuery<{ getActiveJobPostings: JobPosting[] }>(
      GET_ACTIVE_JOB_POSTINGS,
      { limit, nextToken }
    );
    return result.getActiveJobPostings;
  }

  /**
   * PUBLIC: Get specific job posting
   */
  async getJobPosting(jobId: string): Promise<JobPosting> {
    const result = await this.executeQuery<{ getJobPosting: JobPosting }>(
      GET_JOB_POSTING,
      { jobId }
    );
    return result.getJobPosting;
  }

  /**
   * ADMIN ONLY: Get all job postings
   */
  async getAllJobPostings(status?: JobPosting['status'], limit?: number, nextToken?: string): Promise<JobPosting[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      console.error('🚨 SECURITY: Non-admin attempted to access all job postings');
      throw new Error('Admin access required');
    }

    const result = await this.executeQuery<{ getAllJobPostings: JobPosting[] }>(
      GET_ALL_JOB_POSTINGS,
      { status, limit, nextToken }
    );
    return result.getAllJobPostings;
  }

  /**
   * ADMIN ONLY: Get job posting statistics
   */
  async getJobPostingStats(): Promise<JobPostingStats> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const result = await this.executeQuery<{ getJobPostingStats: JobPostingStats }>(GET_JOB_POSTING_STATS);
    return result.getJobPostingStats;
  }

  /**
   * ADMIN ONLY: Create job posting
   */
  async createJobPosting(input: CreateJobPostingInput): Promise<JobPosting> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      console.error('🚨 SECURITY: Non-admin attempted to create job posting');
      throw new Error('Admin access required');
    }

    const result = await this.executeMutation<{ createJobPosting: JobPosting }>(
      CREATE_JOB_POSTING,
      { input }
    );
    return result.createJobPosting;
  }

  /**
   * ADMIN ONLY: Update job posting
   */
  async updateJobPosting(input: UpdateJobPostingInput): Promise<JobPosting> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      console.error('🚨 SECURITY: Non-admin attempted to update job posting');
      throw new Error('Admin access required');
    }

    const result = await this.executeMutation<{ updateJobPosting: JobPosting }>(
      UPDATE_JOB_POSTING,
      { input }
    );
    return result.updateJobPosting;
  }

  /**
   * ADMIN ONLY: Delete job posting
   */
  async deleteJobPosting(jobId: string): Promise<boolean> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      console.error('🚨 SECURITY: Non-admin attempted to delete job posting');
      throw new Error('Admin access required');
    }

    const result = await this.executeMutation<{ deleteJobPosting: boolean }>(
      DELETE_JOB_POSTING,
      { jobId }
    );
    return result.deleteJobPosting;
  }

  /**
   * ADMIN ONLY: Publish job posting
   */
  async publishJobPosting(jobId: string): Promise<JobPosting> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      console.error('🚨 SECURITY: Non-admin attempted to publish job posting');
      throw new Error('Admin access required');
    }

    const result = await this.executeMutation<{ publishJobPosting: JobPosting }>(
      PUBLISH_JOB_POSTING,
      { jobId }
    );
    return result.publishJobPosting;
  }

  /**
   * ADMIN ONLY: Pause job posting
   */
  async pauseJobPosting(jobId: string): Promise<JobPosting> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      console.error('🚨 SECURITY: Non-admin attempted to pause job posting');
      throw new Error('Admin access required');
    }

    const result = await this.executeMutation<{ pauseJobPosting: JobPosting }>(
      PAUSE_JOB_POSTING,
      { jobId }
    );
    return result.pauseJobPosting;
  }

  // ========== SUBSCRIPTIONS ==========

  /**
   * POSTULANTE: Subscribe to my application updates
   */
  async subscribeToMyApplicationUpdates(userId: string): Promise<any> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante' || user.userId !== userId) {
      throw new Error('Can only subscribe to own application updates');
    }

    return this.subscribe(ON_MY_APPLICATION_UPDATED, { userId });
  }

  /**
   * ADMIN ONLY: Subscribe to all application creation events
   */
  async subscribeToApplicationCreated(): Promise<any> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    return this.subscribe(ON_APPLICATION_CREATED);
  }

  /**
   * Check if GraphQL service is initialized
   */
  isInitialized(): boolean {
    return this.config !== null && this.client !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): GraphQLConfig | null {
    return this.config;
  }
}

// Export singleton instance
export const graphqlService = new GraphQLService();
export type { 
  Application, 
  Document, 
  CreateApplicationInput, 
  UploadDocumentInput, 
  ApplicationStats,
  JobPosting,
  CreateJobPostingInput,
  UpdateJobPostingInput,
  JobPostingStats
};