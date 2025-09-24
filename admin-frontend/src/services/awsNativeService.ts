// AWS-Native Service - Direct DynamoDB Access
// No API Gateway or GraphQL needed - Pure AWS SDK usage

// GraphQL via AppSync removed - using direct DynamoDB access only
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand /*, DeleteCommand*/ } from "@aws-sdk/lib-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { cognitoAuthService } from '../services/cognitoAuthService';
import type { DynamoDBExpressionAttributeValues } from '../types/aws';

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
  // GraphQL client removed - using DynamoDB directly

  /**
   * Initialize AWS-Native service with configuration
   */
  initialize(config: AWSNativeConfig): void {
    this.config = config;
    
    // Check if user is authenticated before initializing
    const token = this.getCognitoAccessToken();
    if (!token) {
      return;
    }
    
    // Initialize DynamoDB Direct Access
    const dynamoBaseClient = new DynamoDBClient({
      region: config.region,
      credentials: fromCognitoIdentityPool({
        clientConfig: { region: config.region },
        identityPoolId: config.identityPoolId,
        logins: {
          [`cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`]: token
        },
      }),
    });

    this.dynamoClient = DynamoDBDocumentClient.from(dynamoBaseClient);
  }

  /**
   * SECURITY: Get Cognito access token for DynamoDB access
   */
  private getCognitoAccessToken(): string | null {
    const accessToken = localStorage.getItem('cognito_access_token');
    const idToken = localStorage.getItem('cognito_id_token');
    
    return accessToken || idToken || null;
  }

  /**
   * POSTULANTE: Get my applications (Direct DynamoDB Query)
   */
  async getMyApplications(): Promise<Application[]> {
    if (!this.dynamoClient || !this.config) {
      throw new Error('AWS-Native service not initialized');
    }

    const user = cognitoAuthService.getCurrentUser();
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

    const user = cognitoAuthService.getCurrentUser();
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
        ConditionExpression: 'attribute_not_exists(applicationId)'
      }));

      return application;
    } catch (error) {
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

    const user = cognitoAuthService.getCurrentUser();
    if (!user || user.role !== 'postulante') {
      throw new Error('Unauthorized: Only postulantes can update their own applications');
    }

    try {
      // Build update expression
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: DynamoDBExpressionAttributeValues = {};

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}` as keyof DynamoDBExpressionAttributeValues] = value;
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

    const user = cognitoAuthService.getCurrentUser();
    if (!user || user.role !== 'admin') {
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

    const user = cognitoAuthService.getCurrentUser();
    if (!user || user.role !== 'admin') {
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

      return result.Attributes as Application;
    } catch (error) {
      throw new Error('Failed to update application status');
    }
  }

  /**
   * Check if service is initialized
   */
  /**
   * Reinitialize service after authentication
   */
  reinitialize(): void {
    if (!this.config) {
      return;
    }
    
    this.initialize(this.config);
  }

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