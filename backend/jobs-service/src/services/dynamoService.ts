import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { Job, JobModel } from '../models/Job';
import { JobQuery } from '../types';

export class DynamoService {
  private client: DynamoDBDocumentClient;
  private rawClient: DynamoDBClient;
  private tableName: string;
  private tableInitialized: boolean = false;

  constructor() {
    this.rawClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      ...(process.env.STAGE === 'local' && {
        endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
        credentials: {
          accessKeyId: 'dummy',
          secretAccessKey: 'dummy'
        }
      })
    });
    this.client = DynamoDBDocumentClient.from(this.rawClient);
    this.tableName = process.env.JOBS_TABLE || `manpower-jobs-${process.env.STAGE || 'dev'}`;
  }

  private async ensureTableExists(): Promise<void> {
    if (this.tableInitialized) return;

    try {
      console.log(`Table ${this.tableName} already exists, skipping creation`);
      this.tableInitialized = true;
    } catch (error: any) {
      console.error('Error checking table:', error);
      throw error;
    }
  }

  private async createTable(): Promise<void> {
    const command = new CreateTableCommand({
      TableName: this.tableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'jobId', AttributeType: 'S' },
        { AttributeName: 'createdBy', AttributeType: 'S' }
      ],
      KeySchema: [
        { AttributeName: 'jobId', KeyType: 'HASH' },
        { AttributeName: 'createdBy', KeyType: 'RANGE' }
      ]
    });

    await this.rawClient.send(command);
    console.log(`Table ${this.tableName} created successfully`);
  }

  async createJob(job: JobModel): Promise<Job> {
    await this.ensureTableExists();

    const command = new PutCommand({
      TableName: this.tableName,
      Item: job.toJSON(),
    });

    await this.client.send(command);
    return job.toJSON();
  }

  async getJob(jobId: string, createdBy: string): Promise<Job | null> {
    await this.ensureTableExists();

    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        jobId,
        createdBy,
      },
    });

    const result = await this.client.send(command);
    return result.Item as Job || null;
  }

  async updateJob(jobId: string, createdBy: string, updates: Partial<Job>): Promise<Job | null> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (value !== undefined && key !== 'jobId' && key !== 'createdBy') {
        const nameKey = `#attr${index}`;
        const valueKey = `:val${index}`;

        updateExpressions.push(`${nameKey} = ${valueKey}`);
        expressionAttributeNames[nameKey] = key;
        expressionAttributeValues[valueKey] = value;
      }
    });

    if (updateExpressions.length === 0) {
      return null;
    }

    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { jobId, createdBy },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await this.client.send(command);
    return result.Attributes as Job || null;
  }

  async deleteJob(jobId: string, createdBy: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        jobId,
        createdBy,
      },
    });

    await this.client.send(command);
  }

  async getJobsByStatus(status: string, limit?: number): Promise<Job[]> {
    await this.ensureTableExists();

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'status = :status AND isActive = :isActive',
      ExpressionAttributeValues: {
        ':status': status,
        ':isActive': true,
      },
      Limit: limit,
    });

    const result = await this.client.send(command);
    return result.Items as Job[] || [];
  }

  async getJobsByFolder(folderId: string, limit?: number): Promise<Job[]> {
    await this.ensureTableExists();

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'folderId = :folderId AND isActive = :isActive',
      ExpressionAttributeValues: {
        ':folderId': folderId,
        ':isActive': true,
      },
      Limit: limit,
    });

    const result = await this.client.send(command);
    return result.Items as Job[] || [];
  }

  async getPublishedJobs(limit?: number, nextToken?: string): Promise<{ jobs: Job[], nextToken?: string }> {
    await this.ensureTableExists();

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'status = :status AND isActive = :isActive',
      ExpressionAttributeValues: {
        ':status': 'PUBLISHED',
        ':isActive': true,
      },
      Limit: limit,
      ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined,
    });

    const result = await this.client.send(command);

    return {
      jobs: result.Items as Job[] || [],
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async queryJobs(query: JobQuery): Promise<{ jobs: Job[], nextToken?: string }> {
    await this.ensureTableExists();

    let filterExpression = 'isActive = :isActive';
    const expressionAttributeValues: any = {
      ':isActive': true,
    };

    if (query.status) {
      filterExpression += ' AND status = :status';
      expressionAttributeValues[':status'] = query.status;
    }

    if (query.folderId) {
      filterExpression += ' AND folderId = :folderId';
      expressionAttributeValues[':folderId'] = query.folderId;
    }

    if (query.companyName) {
      filterExpression += ' AND contains(companyName, :companyName)';
      expressionAttributeValues[':companyName'] = query.companyName;
    }

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: query.limit,
      ExclusiveStartKey: query.nextToken ? JSON.parse(Buffer.from(query.nextToken, 'base64').toString()) : undefined,
    });

    const result = await this.client.send(command);

    return {
      jobs: result.Items as Job[] || [],
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    };
  }
}
