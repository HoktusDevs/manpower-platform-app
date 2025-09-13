/**
 * Applications GraphQL Service
 * Handles all application-related GraphQL operations
 * 
 * IMPORTANT: This service maintains exact same interface as original graphqlService
 * to ensure zero breaking changes during refactoring
 */

import { cognitoAuthService } from '../../cognitoAuthService';
import type { Application, CreateApplicationInput, ApplicationStats } from './types';

// GraphQL Operations - Extracted from original graphqlService.ts
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

const GET_APPLICATION_STATS = `
  query GetApplicationStats {
    getApplicationStats {
      totalApplications
      pendingCount
      approvedCount
      rejectedCount
      inReviewCount
      interviewScheduledCount
      hiredCount
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
  mutation UpdateMyApplication($applicationId: String!, $updates: UpdateApplicationInput!) {
    updateMyApplication(applicationId: $applicationId, updates: $updates) {
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

export class ApplicationsService {
  private executeQuery: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;
  private executeMutation: <T>(mutation: string, variables?: Record<string, unknown>) => Promise<T>;
  private client: { graphql: (options: { query: string; variables?: Record<string, unknown>; authMode?: string }) => Promise<{ data?: unknown; errors?: unknown[] }> };

  constructor(
    executeQuery: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
    executeMutation: <T>(mutation: string, variables?: Record<string, unknown>) => Promise<T>,
    client: { graphql: (options: { query: string; variables?: Record<string, unknown>; authMode?: string }) => Promise<{ data?: unknown; errors?: unknown[] }> }
  ) {
    this.executeQuery = executeQuery;
    this.executeMutation = executeMutation;
    this.client = client;
  }

  /**
   * POSTULANTE: Get my applications
   * Exact same implementation as original graphqlService
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
      return [];
    }
  }

  /**
   * POSTULANTE: Create new application
   * Exact same implementation as original graphqlService
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
   * Exact same implementation as original graphqlService
   */
  async updateMyApplication(applicationId: string, updates: Partial<CreateApplicationInput>): Promise<Application> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'postulante') {
      throw new Error('Only postulantes can update their applications');
    }

    const result = await this.executeMutation<{ updateMyApplication: Application }>(
      UPDATE_MY_APPLICATION,
      { applicationId, updates }
    );
    return result.updateMyApplication;
  }

  /**
   * POSTULANTE: Delete my application
   * Exact same implementation as original graphqlService
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
   * ADMIN ONLY: Get all applications
   * Exact same implementation as original graphqlService
   */
  async getAllApplications(status?: Application['status'], limit?: number, nextToken?: string): Promise<Application[]> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    try {
      const result = await this.client.graphql({
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
   * ADMIN ONLY: Get application statistics
   * Exact same implementation as original graphqlService
   */
  async getApplicationStats(): Promise<ApplicationStats> {
    const user = cognitoAuthService.getCurrentUser();
    if (user?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const result = await this.executeQuery<{ getApplicationStats: ApplicationStats }>(GET_APPLICATION_STATS);
    return result.getApplicationStats;
  }

  /**
   * ADMIN ONLY: Update application status
   * Exact same implementation as original graphqlService
   */
  async updateApplicationStatus(applicationId: string, userId: string, status: Application['status']): Promise<Application> {
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
}