import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import { cognitoAuthService } from './cognitoAuthService';

// GraphQL Client Configuration
interface GraphQLConfig {
  graphqlEndpoint: string;
  region: string;
  authenticationType: 'AMAZON_COGNITO_USER_POOLS' | 'AWS_IAM';
  userPoolId?: string;
  userPoolClientId?: string;
  identityPoolId?: string;
}

// Using direct ReturnType of generateClient to avoid type conflicts

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
  folderId?: string; // Link to company folder in directory system
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
  folderId?: string; // Link to company folder in directory system
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
  folderId?: string; // Link to company folder in directory system
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

// DYNAMIC FORMS INTERFACES
interface Form {
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

interface FormField {
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

interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minValue?: number;
  maxValue?: number;
  customMessage?: string;
}

interface FormSubmission {
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

interface FieldResponse {
  fieldId: string;
  value: string;
  fieldType: FormField['type'];
}

interface CreateFormInput {
  title: string;
  description?: string;
  jobId?: string;
  fields: CreateFormFieldInput[];
  expiresAt?: string;
  isRequired: boolean;
  maxSubmissions?: number;
}

interface CreateFormFieldInput {
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

interface UpdateFormInput {
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

interface UpdateFormFieldInput {
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

interface SubmitFormInput {
  formId: string;
  responses: SubmitFieldResponseInput[];
}

interface SubmitFieldResponseInput {
  fieldId: string;
  value: string;
}

interface ReviewSubmissionInput {
  submissionId: string;
  status: FormSubmission['status'];
  reviewNotes?: string;
  score?: number;
}

// FOLDERS INTERFACES
interface Folder {
  userId: string;
  folderId: string;
  name: string;
  type: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  childrenCount?: number;
}

interface CreateFolderInput {
  name: string;
  type: string;
  parentId?: string;
}

interface UpdateFolderInput {
  folderId: string;
  name?: string;
  type?: string;
}

interface FoldersStats {
  totalFolders: number;
  rootFolders: number;
  averageDepth?: number;
  mostUsedTypes: Array<{
    type: string;
    count: number;
  }>;
}

interface FormsStats {
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
      folderId
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

// ========== DYNAMIC FORMS GRAPHQL OPERATIONS ==========

// Dynamic Forms GraphQL Queries
const GET_ACTIVE_FORMS = `
  query GetActiveForms($jobId: String, $limit: Int) {
    getActiveForms(jobId: $jobId, limit: $limit) {
      formId
      title
      description
      jobId
      status
      fields {
        fieldId
        type
        label
        placeholder
        required
        options
        validation {
          minLength
          maxLength
          pattern
          minValue
          maxValue
          customMessage
        }
        order
        description
        defaultValue
      }
      createdAt
      updatedAt
      expiresAt
      isRequired
      maxSubmissions
      currentSubmissions
    }
  }
`;

const GET_FORM = `
  query GetForm($formId: String!) {
    getForm(formId: $formId) {
      formId
      title
      description
      jobId
      status
      fields {
        fieldId
        type
        label
        placeholder
        required
        options
        validation {
          minLength
          maxLength
          pattern
          minValue
          maxValue
          customMessage
        }
        order
        description
        defaultValue
      }
      createdAt
      updatedAt
      expiresAt
      isRequired
      maxSubmissions
      currentSubmissions
    }
  }
`;

const GET_ALL_FORMS = `
  query GetAllForms($status: FormStatus, $jobId: String, $limit: Int) {
    getAllForms(status: $status, jobId: $jobId, limit: $limit) {
      formId
      title
      description
      jobId
      status
      fields {
        fieldId
        type
        label
        placeholder
        required
        options
        validation {
          minLength
          maxLength
          pattern
          minValue
          maxValue
          customMessage
        }
        order
        description
        defaultValue
      }
      createdAt
      updatedAt
      expiresAt
      isRequired
      maxSubmissions
      currentSubmissions
    }
  }
`;

const GET_FORM_SUBMISSIONS = `
  query GetFormSubmissions($formId: String!, $status: SubmissionStatus, $limit: Int) {
    getFormSubmissions(formId: $formId, status: $status, limit: $limit) {
      submissionId
      formId
      applicantId
      responses {
        fieldId
        value
        fieldType
      }
      submittedAt
      status
      reviewedBy
      reviewedAt
      reviewNotes
      score
    }
  }
`;

const GET_MY_FORM_SUBMISSIONS = `
  query GetMyFormSubmissions($formId: String) {
    getMyFormSubmissions(formId: $formId) {
      submissionId
      formId
      applicantId
      responses {
        fieldId
        value
        fieldType
      }
      submittedAt
      status
      reviewedBy
      reviewedAt
      reviewNotes
      score
    }
  }
`;

const GET_FORMS_STATS = `
  query GetFormsStats {
    getFormsStats {
      totalForms
      activeForms
      totalSubmissions
      averageCompletionRate
      topPerformingForms {
        formId
        title
        submissionCount
        completionRate
        averageScore
      }
    }
  }
`;

// Dynamic Forms GraphQL Mutations
const CREATE_FORM = `
  mutation CreateForm($input: CreateFormInput!) {
    createForm(input: $input) {
      formId
      title
      description
      jobId
      status
      fields {
        fieldId
        type
        label
        placeholder
        required
        options
        validation {
          minLength
          maxLength
          pattern
          minValue
          maxValue
          customMessage
        }
        order
        description
        defaultValue
      }
      createdAt
      updatedAt
      expiresAt
      isRequired
      maxSubmissions
      currentSubmissions
    }
  }
`;

const UPDATE_FORM = `
  mutation UpdateForm($input: UpdateFormInput!) {
    updateForm(input: $input) {
      formId
      title
      description
      jobId
      status
      fields {
        fieldId
        type
        label
        placeholder
        required
        options
        validation {
          minLength
          maxLength
          pattern
          minValue
          maxValue
          customMessage
        }
        order
        description
        defaultValue
      }
      createdAt
      updatedAt
      expiresAt
      isRequired
      maxSubmissions
      currentSubmissions
    }
  }
`;

const DELETE_FORM = `
  mutation DeleteForm($formId: String!) {
    deleteForm(formId: $formId)
  }
`;

const PUBLISH_FORM = `
  mutation PublishForm($formId: String!) {
    publishForm(formId: $formId) {
      formId
      status
      title
      description
    }
  }
`;

const PAUSE_FORM = `
  mutation PauseForm($formId: String!) {
    pauseForm(formId: $formId) {
      formId
      status
      title
      description
    }
  }
`;

const SUBMIT_FORM = `
  mutation SubmitForm($input: SubmitFormInput!) {
    submitForm(input: $input) {
      submissionId
      formId
      applicantId
      responses {
        fieldId
        value
        fieldType
      }
      submittedAt
      status
    }
  }
`;

const REVIEW_SUBMISSION = `
  mutation ReviewSubmission($input: ReviewSubmissionInput!) {
    reviewSubmission(input: $input) {
      submissionId
      formId
      applicantId
      status
      reviewedBy
      reviewedAt
      reviewNotes
      score
    }
  }
`;

// ========== FOLDERS GRAPHQL OPERATIONS ==========

// Folders GraphQL Queries
const GET_ALL_FOLDERS = `
  query GetAllFolders($parentId: String, $limit: Int) {
    getAllFolders(parentId: $parentId, limit: $limit) {
      userId
      folderId
      name
      type
      parentId
      createdAt
      updatedAt
      childrenCount
    }
  }
`;

const GET_FOLDER = `
  query GetFolder($folderId: String!) {
    getFolder(folderId: $folderId) {
      userId
      folderId
      name
      type
      parentId
      createdAt
      updatedAt
      childrenCount
    }
  }
`;

const GET_FOLDER_CHILDREN = `
  query GetFolderChildren($parentId: String!) {
    getFolderChildren(parentId: $parentId) {
      userId
      folderId
      name
      type
      parentId
      createdAt
      updatedAt
      childrenCount
    }
  }
`;

const GET_FOLDER_PATH = `
  query GetFolderPath($folderId: String!) {
    getFolderPath(folderId: $folderId) {
      userId
      folderId
      name
      type
      parentId
      createdAt
      updatedAt
    }
  }
`;

const GET_FOLDERS_STATS = `
  query GetFoldersStats {
    getFoldersStats {
      totalFolders
      rootFolders
      averageDepth
      mostUsedTypes {
        type
        count
      }
    }
  }
`;

// Folders GraphQL Mutations
const CREATE_FOLDER = `
  mutation CreateFolder($input: CreateFolderInput!) {
    createFolder(input: $input) {
      userId
      folderId
      name
      type
      parentId
      createdAt
      updatedAt
      childrenCount
    }
  }
`;

const UPDATE_FOLDER = `
  mutation UpdateFolder($input: UpdateFolderInput!) {
    updateFolder(input: $input) {
      userId
      folderId
      name
      type
      parentId
      createdAt
      updatedAt
      childrenCount
    }
  }
`;

const DELETE_FOLDER = `
  mutation DeleteFolder($folderId: String!) {
    deleteFolder(folderId: $folderId)
  }
`;

const DELETE_FOLDERS = `
  mutation DeleteFolders($folderIds: [String!]!) {
    deleteFolders(folderIds: $folderIds)
  }
`;

class GraphQLService {
  // Using a more flexible type to avoid complex Amplify type issues
  private client: { graphql: (options: { query: string; variables?: Record<string, unknown>; authMode?: string }) => Promise<{ data?: unknown; errors?: unknown[] }> } | null = null;
  private config: GraphQLConfig | null = null;

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
    
    console.log('🔧 Configuring Amplify with:', {
      endpoint: config.graphqlEndpoint,
      region: config.region,
      userPoolId: amplifyConfig.Auth.Cognito.userPoolId
    });
    
    Amplify.configure(amplifyConfig);
    this.client = generateClient() as typeof this.client;
    
    console.log('✅ GraphQL service initialized successfully');
  }


  /**
   * Execute GraphQL query with enhanced error handling
   */
  private async executeQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    if (!this.client) {
      throw new Error('GraphQL service not initialized');
    }

    // Check if user is authenticated and get token
    const currentUser = cognitoAuthService.getCurrentUser();
    
    if (!currentUser) {
      throw new Error('NoSignedUser: No current user');
    }

    // Check for token and role claim directly
    const idToken = cognitoAuthService.getIdToken();
    if (!idToken) {
      console.error('🚨 No ID token found - forcing logout');
      cognitoAuthService.logout();
      localStorage.clear();
      window.location.href = '/login?reason=no_token';
      throw new Error('No authentication token');
    }

    // Check if token has custom:role claim
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      if (!payload['custom:role']) {
        console.error('🚨 Token missing custom:role claim - forcing logout');
        cognitoAuthService.logout();
        localStorage.clear();
        window.location.href = '/login?reason=missing_role';
        throw new Error('Token missing role claim');
      }
    } catch {
      console.error('🚨 Invalid token format - forcing logout');
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

    // Check for GraphQL errors - but suppress null return warnings
    if (result.errors && result.errors.length > 0) {
      const nonNullErrors = result.errors.filter((err: unknown) => {
        if (typeof err === 'object' && err !== null && 'message' in err) {
          const message = String((err as { message: string }).message);
          // Suppress "Cannot return null for non-nullable type" warnings
          return !message.includes('Cannot return null for non-nullable type');
        }
        return true;
      });
      
      // Check for authorization errors that might indicate missing role claim
      const authErrors = nonNullErrors.filter((err: unknown) => {
        if (typeof err === 'object' && err !== null && 'message' in err) {
          const message = String((err as { message: string }).message);
          return message.includes('Not Authorized to access') && message.includes('on type');
        }
        return false;
      });
      
      // If authorization error, force logout to get fresh tokens
      if (authErrors.length > 0) {
        console.error('🚨 AUTHORIZATION ERROR - Token missing role claim. Forcing logout...');
        cognitoAuthService.logout();
        localStorage.clear();
        window.location.href = '/login?reason=auth_expired';
        throw new Error('Authorization failed - please log in again');
      }
      
      // Only throw if there are actual errors (not just null return warnings)
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
    if (!this.client) {
      throw new Error('GraphQL service not initialized');
    }

    // Check if user is authenticated and get token
    const currentUser = cognitoAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Check for token and role claim directly
    const idToken = cognitoAuthService.getIdToken();
    if (!idToken) {
      console.error('🚨 No ID token found - forcing logout');
      cognitoAuthService.logout();
      localStorage.clear();
      window.location.href = '/login?reason=no_token';
      throw new Error('No authentication token');
    }

    // Check if token has custom:role claim
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      if (!payload['custom:role']) {
        console.error('🚨 Token missing custom:role claim - forcing logout');
        cognitoAuthService.logout();
        localStorage.clear();
        window.location.href = '/login?reason=missing_role';
        throw new Error('Token missing role claim');
      }
    } catch {
      console.error('🚨 Invalid token format - forcing logout');
      cognitoAuthService.logout();
      localStorage.clear();
      window.location.href = '/login?reason=invalid_token';
      throw new Error('Invalid token format');
    }

    const result = await this.client.graphql({
      query: mutation,
      variables,
      authMode: 'userPool'
    });

    // Check for GraphQL errors - including authorization errors
    if (result.errors && result.errors.length > 0) {
      const nonNullErrors = result.errors.filter((err: unknown) => {
        if (typeof err === 'object' && err !== null && 'message' in err) {
          const message = String((err as { message: string }).message);
          // Suppress "Cannot return null for non-nullable type" warnings
          return !message.includes('Cannot return null for non-nullable type');
        }
        return true;
      });
      
      // Check for authorization errors that might indicate missing role claim
      const authErrors = nonNullErrors.filter((err: unknown) => {
        if (typeof err === 'object' && err !== null && 'message' in err) {
          const message = String((err as { message: string }).message);
          return message.includes('Not Authorized to access') && message.includes('on type');
        }
        return false;
      });
      
      // If authorization error, force logout to get fresh tokens
      if (authErrors.length > 0) {
        console.error('🚨 AUTHORIZATION ERROR - Token missing role claim. Forcing logout...');
        cognitoAuthService.logout();
        localStorage.clear();
        window.location.href = '/login?reason=auth_expired';
        throw new Error('Authorization failed - please log in again');
      }
      
      // Only throw if there are actual errors (not just null return warnings)
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

  // ========== POSTULANTE METHODS ==========

  /**
   * POSTULANTE: Get my applications
   */
  async getMyApplications(): Promise<Application[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante') {
      throw new Error('Only postulantes can access their applications');
    }

    try {
      const result = await this.executeQuery<{ getMyApplications: Application[] | null }>(GET_MY_APPLICATIONS);
      return result.getMyApplications || [];
    } catch (error) {
      // Re-throw authentication errors to trigger auto-logout
      if (error instanceof Error && 
          (error.message.includes('No valid authentication token') || 
           error.message.includes('Authorization failed'))) {
        throw error;
      }
      console.warn('GraphQL getMyApplications returned null, using empty array:', error);
      return [];
    }
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
      throw new Error('Admin access required');
    }

    // Silently handle the case where GraphQL returns null
    try {
      const result = await this.client!.graphql({
        query: GET_ALL_APPLICATIONS,
        variables: { status, limit, nextToken },
        authMode: 'userPool'
      });

      // Directly access data without throwing errors for null returns
      const data = (result as { data?: { getAllApplications?: Application[] | null } }).data;
      return data?.getAllApplications || [];
    } catch {
      // Silently return empty array for any GraphQL errors
      console.debug('GraphQL getAllApplications failed, using empty array');
      return [];
    }
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
    try {
      const result = await this.executeQuery<{ getActiveJobPostings: JobPosting[] | null }>(
        GET_ACTIVE_JOB_POSTINGS,
        { limit, nextToken }
      );
      return result.getActiveJobPostings || [];
    } catch (error) {
      // Re-throw authentication errors to trigger auto-logout
      if (error instanceof Error && 
          (error.message.includes('No valid authentication token') || 
           error.message.includes('Authorization failed'))) {
        throw error;
      }
      console.warn('GraphQL getActiveJobPostings returned null, using empty array:', error);
      return [];
    }
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
      throw new Error('Admin access required');
    }

    // Silently handle the case where GraphQL returns null
    try {
      const result = await this.client!.graphql({
        query: GET_ALL_JOB_POSTINGS,
        variables: { status, limit, nextToken },
        authMode: 'userPool'
      });

      // Directly access data without throwing errors for null returns
      const data = (result as { data?: { getAllJobPostings?: JobPosting[] | null } }).data;
      const jobPostings = data?.getAllJobPostings || [];
      
      // Run migration on first load (one-time sync)
      if (jobPostings.length > 0) {
        this.migrateExistingJobPostings(jobPostings);
      }
      
      return jobPostings;
    } catch {
      // Silently return empty array for any GraphQL errors
      console.debug('GraphQL getAllJobPostings failed, using empty array');
      return [];
    }
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
      throw new Error('Admin access required');
    }

    // Create the job posting first
    const result = await this.executeMutation<{ createJobPosting: JobPosting }>(
      CREATE_JOB_POSTING,
      { input }
    );

    const jobPosting = result.createJobPosting;

    // If a folderId is specified (company folder), automatically create a "Cargo" folder
    if (input.folderId) {
      try {
        await this.createFolder({
          name: input.title, // Use job title as folder name
          type: 'Cargo', // Set type as "Cargo"
          parentId: input.folderId // Create under the specified company folder
        });
        console.log(`✅ Created "Cargo" folder for job: ${input.title} under company folder: ${input.folderId}`);
      } catch (error) {
        // Log error but don't fail the job creation if folder creation fails
        console.warn(`⚠️ Failed to create "Cargo" folder for job: ${input.title}`, error);
      }
    }

    return jobPosting;
  }

  /**
   * ADMIN ONLY: Update job posting
   */
  async updateJobPosting(input: UpdateJobPostingInput): Promise<JobPosting> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
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
      throw new Error('Admin access required');
    }

    const result = await this.executeMutation<{ pauseJobPosting: JobPosting }>(
      PAUSE_JOB_POSTING,
      { jobId }
    );
    return result.pauseJobPosting;
  }

  // ========== DYNAMIC FORMS METHODS ==========

  /**
   * PUBLIC: Get active forms
   */
  async getActiveForms(jobId?: string, limit?: number): Promise<Form[]> {
    const result = await this.executeQuery<{ getActiveForms: Form[] }>(
      GET_ACTIVE_FORMS,
      { jobId, limit }
    );
    return result.getActiveForms;
  }

  /**
   * PUBLIC: Get specific form
   */
  async getForm(formId: string): Promise<Form | null> {
    const result = await this.executeQuery<{ getForm: Form | null }>(
      GET_FORM,
      { formId }
    );
    return result.getForm;
  }

  /**
   * ADMIN ONLY: Get all forms
   */
  async getAllForms(status?: string, jobId?: string, limit?: number): Promise<Form[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access all forms');
    }

    try {
      const result = await this.executeQuery<{ getAllForms: Form[] | null }>(
        GET_ALL_FORMS,
        { status, jobId, limit }
      );
      return result.getAllForms || [];
    } catch (error) {
      // Re-throw authentication errors to trigger auto-logout
      if (error instanceof Error && 
          (error.message.includes('No valid authentication token') || 
           error.message.includes('Authorization failed'))) {
        throw error;
      }
      console.warn('GraphQL getAllForms returned null, using empty array:', error);
      return [];
    }
  }

  /**
   * ADMIN ONLY: Get form submissions
   */
  async getFormSubmissions(formId: string, status?: string, limit?: number): Promise<FormSubmission[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access form submissions');
    }

    const result = await this.executeQuery<{ getFormSubmissions: FormSubmission[] }>(
      GET_FORM_SUBMISSIONS,
      { formId, status, limit }
    );
    return result.getFormSubmissions;
  }

  /**
   * POSTULANTE: Get my form submissions
   */
  async getMyFormSubmissions(formId?: string): Promise<FormSubmission[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante') {
      throw new Error('Only postulantes can access their form submissions');
    }

    const result = await this.executeQuery<{ getMyFormSubmissions: FormSubmission[] }>(
      GET_MY_FORM_SUBMISSIONS,
      { formId }
    );
    return result.getMyFormSubmissions;
  }

  /**
   * ADMIN ONLY: Get forms statistics
   */
  async getFormsStats(): Promise<FormsStats> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access forms statistics');
    }

    const result = await this.executeQuery<{ getFormsStats: FormsStats }>(GET_FORMS_STATS);
    return result.getFormsStats;
  }

  /**
   * ADMIN ONLY: Create form
   */
  async createForm(input: CreateFormInput): Promise<Form> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can create forms');
    }

    console.log('🔍 createForm input data:', JSON.stringify(input, null, 2));

    const result = await this.executeMutation<{ createForm: Form }>(
      CREATE_FORM,
      { input }
    );
    return result.createForm;
  }

  /**
   * ADMIN ONLY: Update form
   */
  async updateForm(input: UpdateFormInput): Promise<Form> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can update forms');
    }

    const result = await this.executeMutation<{ updateForm: Form }>(
      UPDATE_FORM,
      { input }
    );
    return result.updateForm;
  }

  /**
   * ADMIN ONLY: Delete form
   */
  async deleteForm(formId: string): Promise<boolean> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can delete forms');
    }

    const result = await this.executeMutation<{ deleteForm: boolean }>(
      DELETE_FORM,
      { formId }
    );
    return result.deleteForm;
  }

  /**
   * ADMIN ONLY: Publish form
   */
  async publishForm(formId: string): Promise<Form> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can publish forms');
    }

    const result = await this.executeMutation<{ publishForm: Form }>(
      PUBLISH_FORM,
      { formId }
    );
    return result.publishForm;
  }

  /**
   * ADMIN ONLY: Pause form
   */
  async pauseForm(formId: string): Promise<Form> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can pause forms');
    }

    const result = await this.executeMutation<{ pauseForm: Form }>(
      PAUSE_FORM,
      { formId }
    );
    return result.pauseForm;
  }

  /**
   * POSTULANTE: Submit form response
   */
  async submitForm(input: SubmitFormInput): Promise<FormSubmission> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante') {
      throw new Error('Only postulantes can submit forms');
    }

    const result = await this.executeMutation<{ submitForm: FormSubmission }>(
      SUBMIT_FORM,
      { input }
    );
    return result.submitForm;
  }

  /**
   * ADMIN ONLY: Review form submission
   */
  async reviewSubmission(input: ReviewSubmissionInput): Promise<FormSubmission> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can review form submissions');
    }

    const result = await this.executeMutation<{ reviewSubmission: FormSubmission }>(
      REVIEW_SUBMISSION,
      { input }
    );
    return result.reviewSubmission;
  }

  // ========== FOLDERS METHODS ==========

  /**
   * ADMIN ONLY: Get all folders
   */
  async getAllFolders(parentId?: string, limit?: number): Promise<Folder[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access folders');
    }

    try {
      const result = await this.executeQuery<{ getAllFolders: Folder[] | null }>(
        GET_ALL_FOLDERS,
        { parentId, limit }
      );
      return result.getAllFolders || [];
    } catch (error) {
      // Re-throw authentication errors to trigger auto-logout
      if (error instanceof Error && 
          (error.message.includes('No valid authentication token') || 
           error.message.includes('Authorization failed'))) {
        throw error;
      }
      console.warn('GraphQL getAllFolders returned null, using empty array:', error);
      return [];
    }
  }

  /**
   * ADMIN ONLY: Get specific folder
   */
  async getFolder(folderId: string): Promise<Folder | null> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access folders');
    }

    const result = await this.executeQuery<{ getFolder: Folder | null }>(
      GET_FOLDER,
      { folderId }
    );
    return result.getFolder;
  }

  /**
   * ADMIN ONLY: Get folder children (subfolders)
   */
  async getFolderChildren(parentId: string): Promise<Folder[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access folders');
    }

    try {
      const result = await this.executeQuery<{ getFolderChildren: Folder[] | null }>(
        GET_FOLDER_CHILDREN,
        { parentId }
      );
      return result.getFolderChildren || [];
    } catch (error) {
      // Re-throw authentication errors to trigger auto-logout
      if (error instanceof Error && 
          (error.message.includes('No valid authentication token') || 
           error.message.includes('Authorization failed'))) {
        throw error;
      }
      console.warn('GraphQL getFolderChildren returned null, using empty array:', error);
      return [];
    }
  }

  /**
   * ADMIN ONLY: Get folder hierarchy path (breadcrumbs)
   */
  async getFolderPath(folderId: string): Promise<Folder[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access folders');
    }

    try {
      const result = await this.executeQuery<{ getFolderPath: Folder[] | null }>(
        GET_FOLDER_PATH,
        { folderId }
      );
      return result.getFolderPath || [];
    } catch (error) {
      // Re-throw authentication errors to trigger auto-logout
      if (error instanceof Error && 
          (error.message.includes('No valid authentication token') || 
           error.message.includes('Authorization failed'))) {
        throw error;
      }
      console.warn('GraphQL getFolderPath returned null, using empty array:', error);
      return [];
    }
  }

  /**
   * ADMIN ONLY: Get folders statistics
   */
  async getFoldersStats(): Promise<FoldersStats> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can access folder statistics');
    }

    const result = await this.executeQuery<{ getFoldersStats: FoldersStats }>(GET_FOLDERS_STATS);
    return result.getFoldersStats;
  }

  /**
   * ADMIN ONLY: Create folder
   */
  async createFolder(input: CreateFolderInput): Promise<Folder> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can create folders');
    }

    const result = await this.executeMutation<{ createFolder: Folder }>(
      CREATE_FOLDER,
      { input }
    );
    return result.createFolder;
  }

  /**
   * ADMIN ONLY: Update folder
   */
  async updateFolder(input: UpdateFolderInput): Promise<Folder> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can update folders');
    }

    const result = await this.executeMutation<{ updateFolder: Folder }>(
      UPDATE_FOLDER,
      { input }
    );
    return result.updateFolder;
  }

  /**
   * ADMIN ONLY: Delete folder
   */
  async deleteFolder(folderId: string): Promise<boolean> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can delete folders');
    }

    const result = await this.executeMutation<{ deleteFolder: boolean }>(
      DELETE_FOLDER,
      { folderId }
    );
    return result.deleteFolder;
  }

  /**
   * ADMIN ONLY: Delete multiple folders
   */
  async deleteFolders(folderIds: string[]): Promise<boolean> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Only admins can delete folders');
    }

    if (!folderIds || folderIds.length === 0) {
      throw new Error('At least one folder ID is required');
    }

    try {
      // Use individual deleteFolder calls since AppSync doesn't support BatchDeleteItem
      for (const folderId of folderIds) {
        await this.deleteFolder(folderId);
      }
      return true;
    } catch (error) {
      console.error('GraphQL deleteFolders error:', { folderIds, error });
      throw error;
    }
  }

  // ========== SUBSCRIPTIONS ==========

  /**
   * POSTULANTE: Subscribe to my application updates
   */
  async subscribeToMyApplicationUpdates(userId: string): Promise<unknown> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante' || user.userId !== userId) {
      throw new Error('Can only subscribe to own application updates');
    }

    return this.subscribe(ON_MY_APPLICATION_UPDATED, { userId });
  }

  /**
   * ADMIN ONLY: Subscribe to all application creation events
   */
  async subscribeToApplicationCreated(): Promise<unknown> {
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

  /**
   * MIGRATION: Create missing "Cargo" folders for existing job postings
   * This runs automatically once when job postings are loaded
   */
  private async migrateExistingJobPostings(jobPostings: JobPosting[]): Promise<void> {
    // Check if migration was already run
    const migrationKey = 'job_folders_migration_completed';
    if (localStorage.getItem(migrationKey)) {
      console.log('🔄 Migration already completed, skipping...');
      return; // Migration already completed
    }

    console.log('🔄 Starting job postings folder migration...');
    console.log(`📊 Found ${jobPostings.length} job postings to analyze`);
    
    let createdCount = 0;
    let errorCount = 0;
    let jobsWithFolderId = 0;
    let jobsMatched = 0;

    // Get all folders to match by company name
    let allFolders: Folder[] = [];
    try {
      allFolders = await this.getAllFolders();
      console.log(`📁 Loaded ${allFolders.length} folders for matching`);
    } catch (error) {
      console.warn('⚠️ Could not load folders for matching:', error);
    }

    for (const job of jobPostings) {
      console.log(`🔍 Analyzing job: ${job.title}, folderId: ${job.folderId || 'NONE'}, company: ${job.companyName}`);
      
      let targetFolderId = job.folderId;
      
      // If no folderId, try to find company folder by name
      if (!targetFolderId && job.companyName && allFolders.length > 0) {
        // Look for a folder with matching company name (case insensitive)
        const companyFolder = allFolders.find(folder => 
          folder.name.toLowerCase().includes(job.companyName.toLowerCase()) ||
          job.companyName.toLowerCase().includes(folder.name.toLowerCase())
        );
        
        if (companyFolder) {
          targetFolderId = companyFolder.folderId;
          jobsMatched++;
          console.log(`🎯 Matched ${job.companyName} with folder: ${companyFolder.name} (${targetFolderId})`);
        } else {
          console.log(`❌ No folder found for company: ${job.companyName}`);
        }
      }
      
      if (targetFolderId) {
        jobsWithFolderId++;
        try {
          // Try to create the "Cargo" folder for this job
          await this.createFolder({
            name: job.title,
            type: 'Cargo',
            parentId: targetFolderId
          });
          createdCount++;
          console.log(`✅ Created "Cargo" folder: ${job.title} under ${targetFolderId}`);
        } catch (error) {
          // Folder might already exist or other error - continue with next
          errorCount++;
          console.log(`⚠️ Skipped folder for ${job.title}:`, error);
        }
      } else {
        console.log(`⚠️ Job ${job.title} has no matching folder - skipping`);
      }
    }

    console.log(`📈 Summary: ${jobsWithFolderId} jobs processed (${jobsMatched} matched by name), out of ${jobPostings.length} total`);
    
    // Mark migration as completed
    localStorage.setItem(migrationKey, 'true');
    console.log(`🎉 Migration completed: ${createdCount} folders created, ${errorCount} skipped`);
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
  JobPostingStats,
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
  ReviewSubmissionInput,
  Folder,
  CreateFolderInput,
  UpdateFolderInput,
  FoldersStats
};