// AWS-Native Service - Direct DynamoDB + AppSync GraphQL Access
// No API Gateway needed - Direct AWS SDK usage

import { generateClient } from 'aws-amplify/api';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand /*, DeleteCommand*/ } from "@aws-sdk/lib-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { authService } from './authService';
import type { User } from '../types/auth';

interface AWSNativeConfig {
  userPoolId: string;
  userPoolClientId: string;
  identityPoolId: string;
  region: string;
  graphqlUrl: string;
  graphqlApiId: string;
  applicationsTable: string;
  documentsTable: string;
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

interface CreateApplicationInput {
  companyName: string;
  position: string;
  description?: string;
  salary?: string;
  location?: string;
  companyId?: string;
}

class AWSNativeService {
  private config: AWSNativeConfig | null = null;
  private dynamoClient: DynamoDBDocumentClient | null = null;
  private graphqlClient: unknown = null;

  /**
   * Initialize AWS-Native service with configuration
   */
  initialize(config: AWSNativeConfig): void {
    this.config = config;
    
    // Initialize DynamoDB Direct Access
    const dynamoBaseClient = new DynamoDBClient({
      region: config.region,
      credentials: fromCognitoIdentityPool({
        clientConfig: { region: config.region },
        identityPoolId: config.identityPoolId,
        logins: {
          [`cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`]: this.getCognitoAccessToken()
        },
      }),
    });

    this.dynamoClient = DynamoDBDocumentClient.from(dynamoBaseClient);

    // Initialize AppSync GraphQL Client
    this.graphqlClient = generateClient();

    console.log('🚀 AWS-Native Service initialized - Direct DynamoDB + GraphQL access');
  }

  /**
   * SECURITY: Get Cognito access token for DynamoDB access
   */
  private getCognitoAccessToken(): string {
    const token = localStorage.getItem('cognito_access_token');
    if (!token) {
      throw new Error('No Cognito access token found');
    }
    return token;
  }

  /**
   * POSTULANTE: Get my applications (Direct DynamoDB Query)
   */
  async getMyApplications(): Promise<Application[]> {
    if (!this.dynamoClient || !this.config) {
      throw new Error('AWS-Native service not initialized');
    }

    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.config.applicationsTable,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': user.userId
        },
        ScanIndexForward: false // Latest first
      }));

      return result.Items as Application[] || [];
    } catch (error) {
      console.error('❌ Error fetching applications:', error);
      throw new Error('Failed to fetch applications');
    }
  }

  /**
   * POSTULANTE: Create new application (Direct DynamoDB Put)
   */
  async createApplication(input: CreateApplicationInput): Promise<Application> {
    if (!this.dynamoClient || !this.config) {
      throw new Error('AWS-Native service not initialized');
    }

    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // SECURITY: Only postulante can create applications for themselves
    if (user.role !== 'postulante') {
      throw new Error('Only postulantes can create applications');
    }

    const applicationId = `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const application: Application = {
      userId: user.userId,
      applicationId,
      companyName: input.companyName,
      position: input.position,
      status: 'PENDING',
      description: input.description,
      salary: input.salary,
      location: input.location,
      companyId: input.companyId,
      createdAt: now,
      updatedAt: now
    };

    try {
      await this.dynamoClient.send(new PutCommand({
        TableName: this.config.applicationsTable,
        Item: application,
        // SECURITY: Prevent overwriting existing applications
        ConditionExpression: 'attribute_not_exists(applicationId)'
      }));

      console.log('✅ Application created successfully:', applicationId);
      return application;
    } catch (error) {
      console.error('❌ Error creating application:', error);
      throw new Error('Failed to create application');
    }
  }

  /**
   * POSTULANTE: Update my application (Direct DynamoDB Update)
   */
  async updateMyApplication(applicationId: string, updates: Partial<CreateApplicationInput>): Promise<Application> {
    if (!this.dynamoClient || !this.config) {
      throw new Error('AWS-Native service not initialized');
    }

    const user = authService.getCurrentUser();
    if (!user || user.role !== 'postulante') {
      throw new Error('Unauthorized: Only postulantes can update their own applications');
    }

    try {
      // Build update expression
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, unknown> = {};

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
        }
      });

      // Always update the updatedAt timestamp
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const result = await this.dynamoClient.send(new UpdateCommand({
        TableName: this.config.applicationsTable,
        Key: {
          userId: user.userId,
          applicationId: applicationId
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: {
          ...expressionAttributeValues,
          ':currentUserId': user.userId
        },
        // SECURITY: Only allow updates to own applications
        ConditionExpression: 'userId = :currentUserId',
        ReturnValues: 'ALL_NEW'
      }));

      return result.Attributes as Application;
    } catch (error) {
      console.error('❌ Error updating application:', error);
      throw new Error('Failed to update application');
    }
  }

  /**
   * ADMIN ONLY: Get all applications (Direct DynamoDB Scan)
   */
  async getAllApplications(): Promise<Application[]> {
    if (!this.dynamoClient || !this.config) {
      throw new Error('AWS-Native service not initialized');
    }

    const user = authService.getCurrentUser();
    if (!user || user.role !== 'admin') {
      console.error('🚨 SECURITY: Non-admin attempted to access all applications');
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.config.applicationsTable,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': 'PENDING'
        },
        ScanIndexForward: false
      }));

      return result.Items as Application[] || [];
    } catch (error) {
      console.error('❌ Error fetching all applications:', error);
      throw new Error('Failed to fetch applications');
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
    if (!this.dynamoClient || !this.config) {
      throw new Error('AWS-Native service not initialized');
    }

    const user = authService.getCurrentUser();
    if (!user || user.role !== 'admin') {
      console.error('🚨 SECURITY: Non-admin attempted to update application status');
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      const result = await this.dynamoClient.send(new UpdateCommand({
        TableName: this.config.applicationsTable,
        Key: {
          userId: userId,
          applicationId: applicationId
        },
        UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      }));

      console.log(`✅ Application status updated: ${applicationId} -> ${status}`);
      return result.Attributes as Application;
    } catch (error) {
      console.error('❌ Error updating application status:', error);
      throw new Error('Failed to update application status');
    }
  }

  /**
   * SECURITY: Validate user has access to perform operation
   */
  private validateUserAccess(requiredRole?: 'admin' | 'postulante'): User {
    const user = authService.getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (requiredRole && user.role !== requiredRole) {
      console.error(`🚨 SECURITY: User ${user.email} (${user.role}) attempted ${requiredRole} operation`);
      throw new Error(`Unauthorized: ${requiredRole} access required`);
    }

    return user;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.config !== null && this.dynamoClient !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): AWSNativeConfig | null {
    return this.config;
  }
}

// Export singleton instance
export const awsNativeService = new AWSNativeService();