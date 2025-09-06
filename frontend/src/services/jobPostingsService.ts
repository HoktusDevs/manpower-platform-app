import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  ScanCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand 
} from '@aws-sdk/lib-dynamodb';
import type { ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { v4 as uuidv4 } from 'uuid';

// Job posting interface
export interface JobPosting {
  jobId: string;
  title: string;
  description: string;
  company: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'remote';
  salary?: {
    min?: number;
    max?: number;
    currency: string;
    period: 'hourly' | 'monthly' | 'yearly';
  };
  requirements: string[];
  benefits?: string[];
  status: 'draft' | 'active' | 'paused' | 'closed';
  applicationFormId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  metadata: {
    views: number;
    applications: number;
    lastActivity?: string;
    featured?: boolean;
    remote?: boolean;
  };
  tags?: string[];
}

// Job application status
export interface JobApplication {
  applicationId: string;
  jobId: string;
  applicantId: string;
  applicantEmail: string;
  applicantName: string;
  status: 'pending' | 'reviewing' | 'interviewed' | 'offered' | 'hired' | 'rejected';
  appliedAt: string;
  updatedAt: string;
  formSubmissionId?: string;
  notes?: string;
  rating?: number;
  interview?: {
    scheduledAt?: string;
    completedAt?: string;
    feedback?: string;
  };
}

class JobPostingsService {
  private client: DynamoDBDocumentClient | null = null;
  private region: string;
  private userPoolId: string;
  private identityPoolId: string;

  constructor() {
    this.region = import.meta.env.VITE_AWS_REGION || 'us-east-1';
    this.userPoolId = import.meta.env.VITE_USER_POOL_ID;
    this.identityPoolId = import.meta.env.VITE_IDENTITY_POOL_ID;
  }

  private async getClient(idToken?: string): Promise<DynamoDBDocumentClient> {
    if (this.client && !idToken) {
      return this.client;
    }

    let credentials;
    
    if (idToken) {
      credentials = fromCognitoIdentityPool({
        client: new CognitoIdentityClient({ region: this.region }),
        identityPoolId: this.identityPoolId,
        logins: {
          [`cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`]: idToken,
        },
      });
    } else {
      throw new Error('Authentication required');
    }

    const dynamoClient = new DynamoDBClient({
      region: this.region,
      credentials,
    });

    this.client = DynamoDBDocumentClient.from(dynamoClient);
    return this.client;
  }

  private getTableName(tableType: 'jobs' | 'applications'): string {
    const environment = import.meta.env.VITE_ENVIRONMENT || 'dev';
    
    switch (tableType) {
      case 'jobs':
        return `manpower-job-postings-${environment}`;
      case 'applications':
        return `manpower-applications-${environment}`;
      default:
        throw new Error(`Unknown table type: ${tableType}`);
    }
  }

  // ADMIN ONLY - Create a new job posting
  async createJobPosting(
    jobData: Omit<JobPosting, 'jobId' | 'createdAt' | 'updatedAt' | 'metadata'>,
    userId: string,
    idToken: string
  ): Promise<JobPosting> {
    const client = await this.getClient(idToken);
    const jobId = uuidv4();
    const now = new Date().toISOString();

    const jobPosting: JobPosting = {
      ...jobData,
      jobId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      metadata: {
        views: 0,
        applications: 0,
        featured: false,
        remote: jobData.type === 'remote',
      },
    };

    await client.send(
      new PutCommand({
        TableName: this.getTableName('jobs'),
        Item: jobPosting,
        ConditionExpression: 'attribute_not_exists(jobId)',
      })
    );

    return jobPosting;
  }

  // ADMIN ONLY - Update a job posting
  async updateJobPosting(
    jobId: string,
    updates: Partial<Omit<JobPosting, 'jobId' | 'createdAt' | 'createdBy'>>,
    idToken: string
  ): Promise<JobPosting> {
    const client = await this.getClient(idToken);

    const updateExpression: string[] = [];
    const expressionAttributeValues: Record<string, unknown> = {};
    const expressionAttributeNames: Record<string, string> = {};

    // Handle nested updates for metadata and salary
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'metadata' && typeof value === 'object') {
        Object.entries(value).forEach(([metaKey, metaValue]) => {
          updateExpression.push(`metadata.#${metaKey} = :${metaKey}`);
          expressionAttributeNames[`#${metaKey}`] = metaKey;
          expressionAttributeValues[`:${metaKey}`] = metaValue;
        });
      } else if (key === 'salary' && typeof value === 'object') {
        updateExpression.push(`#salary = :salary`);
        expressionAttributeNames['#salary'] = 'salary';
        expressionAttributeValues[':salary'] = value;
      } else if (value !== undefined) {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    updateExpression.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const result = await client.send(
      new UpdateCommand({
        TableName: this.getTableName('jobs'),
        Key: { jobId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return result.Attributes as JobPosting;
  }

  // Get a specific job posting
  async getJobPosting(jobId: string, idToken?: string): Promise<JobPosting | null> {
    const client = await this.getClient(idToken);

    const result = await client.send(
      new GetCommand({
        TableName: this.getTableName('jobs'),
        Key: { jobId },
      })
    );

    if (!result.Item) {
      return null;
    }

    const job = result.Item as JobPosting;

    // Increment view count (fire and forget)
    if (!idToken) { // Only count public views
      this.incrementViewCount(jobId).catch(console.error);
    }

    return job;
  }

  // List job postings with filters
  async listJobPostings(filters?: {
    status?: JobPosting['status'];
    type?: JobPosting['type'];
    location?: string;
    company?: string;
    featured?: boolean;
    tags?: string[];
  }, idToken?: string): Promise<JobPosting[]> {
    const client = await this.getClient(idToken);

    const scanParams: ScanCommandInput = {
      TableName: this.getTableName('jobs'),
    };

    const filterExpressions: string[] = [];
    const expressionAttributeValues: Record<string, unknown> = {};
    const expressionAttributeNames: Record<string, string> = {};

    // Public users can only see active jobs
    if (!idToken) {
      filterExpressions.push('#status = :activeStatus');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':activeStatus'] = 'active';
    } else if (filters?.status) {
      filterExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = filters.status;
    }

    if (filters?.type) {
      filterExpressions.push('#type = :type');
      expressionAttributeNames['#type'] = 'type';
      expressionAttributeValues[':type'] = filters.type;
    }

    if (filters?.location) {
      filterExpressions.push('contains(#location, :location)');
      expressionAttributeNames['#location'] = 'location';
      expressionAttributeValues[':location'] = filters.location;
    }

    if (filters?.company) {
      filterExpressions.push('contains(company, :company)');
      expressionAttributeValues[':company'] = filters.company;
    }

    if (filters?.featured) {
      filterExpressions.push('metadata.featured = :featured');
      expressionAttributeValues[':featured'] = filters.featured;
    }

    if (filters?.tags && filters.tags.length > 0) {
      const tagExpressions = filters.tags.map((_, index) => 
        `contains(tags, :tag${index})`
      );
      filterExpressions.push(`(${tagExpressions.join(' OR ')})`);
      filters.tags.forEach((tag, index) => {
        expressionAttributeValues[`:tag${index}`] = tag;
      });
    }

    if (filterExpressions.length > 0) {
      scanParams.FilterExpression = filterExpressions.join(' AND ');
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
      if (Object.keys(expressionAttributeNames).length > 0) {
        scanParams.ExpressionAttributeNames = expressionAttributeNames;
      }
    }

    const result = await client.send(new ScanCommand(scanParams));
    const jobs = (result.Items as JobPosting[]) || [];

    // Sort by creation date (newest first) and featured status
    return jobs.sort((a, b) => {
      if (a.metadata.featured && !b.metadata.featured) return -1;
      if (!a.metadata.featured && b.metadata.featured) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // ADMIN ONLY - Delete a job posting
  async deleteJobPosting(jobId: string, idToken: string): Promise<void> {
    const client = await this.getClient(idToken);

    await client.send(
      new DeleteCommand({
        TableName: this.getTableName('jobs'),
        Key: { jobId },
      })
    );
  }

  // Apply to a job posting
  async applyToJob(
    jobId: string,
    applicantId: string,
    applicantEmail: string,
    applicantName: string,
    formSubmissionId?: string,
    idToken?: string
  ): Promise<JobApplication> {
    const client = await this.getClient(idToken);

    const applicationId = uuidv4();
    const now = new Date().toISOString();

    const application: JobApplication = {
      applicationId,
      jobId,
      applicantId,
      applicantEmail,
      applicantName,
      status: 'pending',
      appliedAt: now,
      updatedAt: now,
      formSubmissionId,
    };

    // Create application
    await client.send(
      new PutCommand({
        TableName: this.getTableName('applications'),
        Item: application,
      })
    );

    // Update job application count
    await this.incrementApplicationCount(jobId, idToken);

    return application;
  }

  // Get applications for a job (admin) or user's applications
  async getApplications(filters?: {
    jobId?: string;
    applicantId?: string;
    status?: JobApplication['status'];
  }, idToken?: string): Promise<JobApplication[]> {
    const client = await this.getClient(idToken);

    if (filters?.jobId) {
      // Query applications by job ID (admin view)
      const result = await client.send(
        new QueryCommand({
          TableName: this.getTableName('applications'),
          IndexName: 'CompanyIndex', // Using existing GSI from data-stack
          KeyConditionExpression: 'companyId = :jobId', // Note: This uses existing schema
          ExpressionAttributeValues: {
            ':jobId': filters.jobId,
          },
        })
      );
      return (result.Items as JobApplication[]) || [];
    }

    if (filters?.applicantId) {
      // Query applications by applicant (user view)
      const result = await client.send(
        new QueryCommand({
          TableName: this.getTableName('applications'),
          KeyConditionExpression: 'userId = :applicantId',
          ExpressionAttributeValues: {
            ':applicantId': filters.applicantId,
          },
        })
      );
      return (result.Items as JobApplication[]) || [];
    }

    // Scan all applications (admin only)
    const scanParams: ScanCommandInput = {
      TableName: this.getTableName('applications'),
    };

    if (filters?.status) {
      scanParams.FilterExpression = '#status = :status';
      scanParams.ExpressionAttributeNames = { '#status': 'status' };
      scanParams.ExpressionAttributeValues = { ':status': filters.status };
    }

    const result = await client.send(new ScanCommand(scanParams));
    return (result.Items as JobApplication[]) || [];
  }

  // ADMIN ONLY - Update application status
  async updateApplicationStatus(
    applicationId: string,
    status: JobApplication['status'],
    notes?: string,
    rating?: number,
    idToken?: string
  ): Promise<JobApplication> {
    const client = await this.getClient(idToken);

    const result = await client.send(
      new UpdateCommand({
        TableName: this.getTableName('applications'),
        Key: { applicationId },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, notes = :notes, rating = :rating',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': new Date().toISOString(),
          ':notes': notes || '',
          ':rating': rating || null,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return result.Attributes as JobApplication;
  }

  // Private helper methods
  private async incrementViewCount(jobId: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.send(
        new UpdateCommand({
          TableName: this.getTableName('jobs'),
          Key: { jobId },
          UpdateExpression: 'SET metadata.#views = metadata.#views + :inc, metadata.lastActivity = :now',
          ExpressionAttributeNames: { '#views': 'views' },
          ExpressionAttributeValues: {
            ':inc': 1,
            ':now': new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error('Failed to increment view count:', error);
    }
  }

  private async incrementApplicationCount(jobId: string, idToken?: string): Promise<void> {
    try {
      const client = await this.getClient(idToken);
      await client.send(
        new UpdateCommand({
          TableName: this.getTableName('jobs'),
          Key: { jobId },
          UpdateExpression: 'SET metadata.applications = metadata.applications + :inc, metadata.lastActivity = :now',
          ExpressionAttributeValues: {
            ':inc': 1,
            ':now': new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error('Failed to increment application count:', error);
    }
  }

  // Search job postings by text
  async searchJobPostings(
    searchTerm: string, 
    filters?: {
      type?: JobPosting['type'];
      location?: string;
    },
    idToken?: string
  ): Promise<JobPosting[]> {
    const allJobs = await this.listJobPostings(
      { 
        status: 'active',
        ...filters 
      }, 
      idToken
    );

    const searchTermLower = searchTerm.toLowerCase();
    
    return allJobs.filter(job => {
      const searchableText = [
        job.title,
        job.description,
        job.company,
        job.location,
        ...job.requirements,
        ...(job.benefits || []),
        ...(job.tags || [])
      ].join(' ').toLowerCase();

      return searchableText.includes(searchTermLower);
    });
  }
}

export const jobPostingsService = new JobPostingsService();