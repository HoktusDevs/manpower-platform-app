/**
 * Job Postings GraphQL Service
 * Handles all job posting-related GraphQL operations
 * 
 * IMPORTANT: This service maintains exact same interface as original graphqlService
 * to ensure zero breaking changes during refactoring
 */

import { cognitoAuthService } from '../../cognitoAuthService';
import { publicGraphqlService } from '../../publicGraphqlService';
import type { JobPosting, CreateJobPostingInput, UpdateJobPostingInput, JobPostingStats } from './types';

// GraphQL Operations - Extracted from original graphqlService.ts
const GET_ACTIVE_JOB_POSTINGS = `
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

const GET_JOB_POSTING = `
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

const GET_ALL_JOB_POSTINGS = `
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
      totalApplications
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

const UPDATE_JOB_POSTING = `
  mutation UpdateJobPosting($input: UpdateJobPostingInput!) {
    updateJobPosting(input: $input) {
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

const PAUSE_JOB_POSTING = `
  mutation PauseJobPosting($jobId: String!) {
    pauseJobPosting(jobId: $jobId) {
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

export class JobPostingsService {
  private executeQuery: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;
  private executeMutation: <T>(mutation: string, variables?: Record<string, unknown>) => Promise<T>;

  constructor(
    executeQuery: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
    executeMutation: <T>(mutation: string, variables?: Record<string, unknown>) => Promise<T>
  ) {
    this.executeQuery = executeQuery;
    this.executeMutation = executeMutation;
  }

  /**
   * PUBLIC: Get active job postings
   * Uses public API if available, falls back to authenticated query
   */
  async getActiveJobPostings(limit?: number, nextToken?: string): Promise<JobPosting[]> {
    // Try public API first (no authentication required)
    if (publicGraphqlService.isInitialized()) {
      const publicResult = await publicGraphqlService.getActiveJobPostings(limit, nextToken);
      if (publicResult.length > 0 || limit === 0) {
        return publicResult;
      }
    }

    // Fallback to authenticated query if public API fails or not configured
    try {
      const result = await this.executeQuery<{ getActiveJobPostings: JobPosting[] | null }>(
        GET_ACTIVE_JOB_POSTINGS,
        { limit, nextToken }
      );
      return result.getActiveJobPostings || [];
    } catch {
      return [];
    }
  }

  /**
   * PUBLIC: Get specific job posting
   * Uses public API if available, falls back to authenticated query
   */
  async getJobPosting(jobId: string): Promise<JobPosting | null> {
    // Try public API first (no authentication required)
    if (publicGraphqlService.isInitialized()) {
      const publicResult = await publicGraphqlService.getJobPosting(jobId);
      if (publicResult) {
        return publicResult;
      }
    }

    // Fallback to authenticated query if public API fails or not configured
    try {
      const result = await this.executeQuery<{ getJobPosting: JobPosting | null }>(
        GET_JOB_POSTING,
        { jobId }
      );
      return result.getJobPosting;
    } catch {
      return null;
    }
  }

  /**
   * ADMIN ONLY: Get all job postings
   * Exact same implementation as original graphqlService
   */
  async getAllJobPostings(status?: JobPosting['status'], limit?: number, nextToken?: string): Promise<JobPosting[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
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
   * Exact same implementation as original graphqlService
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
   * Exact same implementation as original graphqlService
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

    // Automatic folder creation disabled to prevent duplicates
    // This should be handled by the backend if needed

    return jobPosting;
  }

  /**
   * ADMIN ONLY: Update job posting
   * Exact same implementation as original graphqlService
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
   * Exact same implementation as original graphqlService
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
   * Exact same implementation as original graphqlService
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
   * Exact same implementation as original graphqlService
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
}