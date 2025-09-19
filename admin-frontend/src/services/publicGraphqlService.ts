import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import type { JobPosting } from './graphql/jobPostings';

// Public GraphQL queries that use API_KEY authentication
const GET_ACTIVE_JOB_POSTINGS_PUBLIC = `
  query GetActiveJobPostings($limit: Int, $nextToken: String) {
    getActiveJobPostings(limit: $limit, nextToken: $nextToken) {
      jobId
      title
      description
      requirements
      location
      employmentType
      status
      companyName
      companyId
      salary
      benefits
      experienceLevel
      createdAt
      updatedAt
      expiresAt
      applicationCount
      folderId
    }
  }
`;

const GET_JOB_POSTING_PUBLIC = `
  query GetJobPosting($jobId: String!) {
    getJobPosting(jobId: $jobId) {
      jobId
      title
      description
      requirements
      location
      employmentType
      status
      companyName
      companyId
      salary
      benefits
      experienceLevel
      createdAt
      updatedAt
      expiresAt
      applicationCount
      folderId
    }
  }
`;

const GET_ALL_JOB_POSTINGS_PUBLIC = `
  query GetAllJobPostings($status: JobStatus, $limit: Int, $nextToken: String) {
    getAllJobPostings(status: $status, limit: $limit, nextToken: $nextToken) {
      jobId
      title
      description
      requirements
      location
      employmentType
      status
      companyName
      companyId
      salary
      benefits
      experienceLevel
      createdAt
      updatedAt
      expiresAt
      applicationCount
      folderId
    }
  }
`;

interface PublicGraphQLConfig {
  graphqlEndpoint: string;
  region: string;
  apiKey: string;
}

class PublicGraphQLService {
  private client: { graphql: (options: { query: string; variables?: Record<string, unknown>; authMode?: string }) => Promise<{ data?: unknown; errors?: unknown[] }> } | null = null;
  private config: PublicGraphQLConfig | null = null;

  /**
   * Initialize public GraphQL service with API Key authentication
   */
  async initialize(config: PublicGraphQLConfig): Promise<void> {
    this.config = config;

    // Configure Amplify for API Key authentication
    const amplifyConfig = {
      API: {
        GraphQL: {
          endpoint: config.graphqlEndpoint,
          region: config.region,
          defaultAuthMode: 'apiKey' as const,
          apiKey: config.apiKey
        }
      }
    };

    Amplify.configure(amplifyConfig);
    this.client = generateClient() as typeof this.client;
  }

  /**
   * Execute public GraphQL query with API Key authentication
   */
  private async executePublicQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    if (!this.client) {
      throw new Error('Public GraphQL service not initialized');
    }

    const result = await this.client.graphql({
      query,
      variables,
      authMode: 'apiKey'
    });

    // Handle GraphQL errors
    if (result.errors && result.errors.length > 0) {
      const errorMessage = result.errors.map((err: unknown) => {
        return typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: string }).message)
          : String(err);
      }).join(', ');
      throw new Error(`Public GraphQL Error: ${errorMessage}`);
    }

    return (result as { data: T }).data;
  }

  /**
   * PUBLIC: Get active job postings without authentication
   */
  async getActiveJobPostings(limit?: number, nextToken?: string): Promise<JobPosting[]> {
    try {
      const result = await this.executePublicQuery<{ getActiveJobPostings: JobPosting[] | null }>(
        GET_ACTIVE_JOB_POSTINGS_PUBLIC,
        { limit, nextToken }
      );
      return result.getActiveJobPostings || [];
    } catch (error) {
      console.warn('Failed to fetch active job postings publicly:', error);
      return [];
    }
  }

  /**
   * PUBLIC: Get specific job posting without authentication
   */
  async getJobPosting(jobId: string): Promise<JobPosting | null> {
    try {
      const result = await this.executePublicQuery<{ getJobPosting: JobPosting | null }>(
        GET_JOB_POSTING_PUBLIC,
        { jobId }
      );
      return result.getJobPosting;
    } catch (error) {
      console.warn(`Failed to fetch job posting ${jobId} publicly:`, error);
      return null;
    }
  }

  /**
   * PUBLIC: Get all job postings without authentication (including drafts)
   */
  async getAllJobPostings(status?: string, limit?: number, nextToken?: string): Promise<JobPosting[]> {
    try {
      const result = await this.executePublicQuery<{ getAllJobPostings: JobPosting[] | null }>(
        GET_ALL_JOB_POSTINGS_PUBLIC,
        { status, limit, nextToken }
      );
      return result.getAllJobPostings || [];
    } catch (error) {
      console.warn('Failed to fetch all job postings publicly:', error);
      return [];
    }
  }

  // Utility methods
  isInitialized(): boolean {
    return this.config !== null && this.client !== null;
  }

  getConfig(): PublicGraphQLConfig | null {
    return this.config;
  }
}

// Export singleton instance for public access
export const publicGraphqlService = new PublicGraphQLService();