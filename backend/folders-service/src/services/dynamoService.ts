import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { Folder, FolderModel } from '../models/Folder';
import { FolderQuery } from '../types';

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
    this.tableName = process.env.FOLDERS_TABLE || `manpower-folders-${process.env.STAGE || 'dev'}`;
  }

  private async ensureTableExists(): Promise<void> {
    if (this.tableInitialized) return;

    try {
      console.log(`Creating table ${this.tableName} if it doesn't exist...`);
      await this.createTable();
      console.log(`Table ${this.tableName} created or already exists`);
      this.tableInitialized = true;
    } catch (error: any) {
      if (error.name === 'ResourceInUseException') {
        console.log(`Table ${this.tableName} already exists`);
        this.tableInitialized = true;
      } else {
        console.error('Error creating table:', error);
        throw error;
      }
    }
  }

  private async createTable(): Promise<void> {
    const command = new CreateTableCommand({
      TableName: this.tableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'folderId', AttributeType: 'S' },
        { AttributeName: 'userId', AttributeType: 'S' }
      ],
      KeySchema: [
        { AttributeName: 'folderId', KeyType: 'HASH' },
        { AttributeName: 'userId', KeyType: 'RANGE' }
      ]
      // Temporarily removing GSIs for local development
    });

    await this.rawClient.send(command);
    console.log(`Table ${this.tableName} created successfully`);
  }

  async createFolder(folder: FolderModel): Promise<Folder> {
    await this.ensureTableExists();

    const command = new PutCommand({
      TableName: this.tableName,
      Item: folder.toJSON(),
    });

    await this.client.send(command);
    return folder.toJSON();
  }

  async getFolder(folderId: string, userId: string): Promise<Folder | null> {
    await this.ensureTableExists();

    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        folderId,
        userId,
      },
    });

    const result = await this.client.send(command);
    return result.Item as Folder || null;
  }

  async updateFolder(folderId: string, userId: string, updates: Partial<Folder>): Promise<Folder | null> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (value !== undefined && key !== 'folderId' && key !== 'userId') {
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
      Key: { folderId, userId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await this.client.send(command);
    return result.Attributes as Folder || null;
  }

  async deleteFolder(folderId: string, userId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        folderId,
        userId,
      },
    });

    await this.client.send(command);
  }

  async getFoldersByUser(userId: string, limit?: number, nextToken?: string): Promise<{ folders: Folder[], nextToken?: string }> {
    await this.ensureTableExists();

    // For local development without GSIs, we'll use scan
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'userId = :userId AND isActive = :isActive',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':isActive': true,
      },
      Limit: limit,
      ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined,
    });

    const result = await this.client.send(command);

    return {
      folders: result.Items as Folder[] || [],
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async getFoldersByParent(parentId: string, userId: string, limit?: number): Promise<Folder[]> {
    // For local development without GSIs, we'll use scan
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'parentId = :parentId AND userId = :userId AND isActive = :isActive',
      ExpressionAttributeValues: {
        ':parentId': parentId,
        ':userId': userId,
        ':isActive': true,
      },
      Limit: limit,
    });

    const result = await this.client.send(command);
    return result.Items as Folder[] || [];
  }

  async getRootFolders(userId: string): Promise<Folder[]> {
    await this.ensureTableExists();

    // For local development without GSIs, we'll use scan
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'userId = :userId AND attribute_not_exists(parentId) AND isActive = :isActive',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':isActive': true,
      },
    });

    const result = await this.client.send(command);
    return result.Items as Folder[] || [];
  }

  async queryFolders(query: FolderQuery): Promise<{ folders: Folder[], nextToken?: string }> {
    // For local development without GSIs, we'll use scan
    let filterExpression = 'userId = :userId AND isActive = :isActive';
    const expressionAttributeValues: any = {
      ':userId': query.userId,
      ':isActive': true,
    };

    if (query.parentId) {
      filterExpression += ' AND parentId = :parentId';
      expressionAttributeValues[':parentId'] = query.parentId;
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
      folders: result.Items as Folder[] || [],
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async batchDeleteFolders(folderIds: string[], userId: string): Promise<string[]> {
    const deletedFolders: string[] = [];

    for (const folderId of folderIds) {
      try {
        await this.deleteFolder(folderId, userId);
        deletedFolders.push(folderId);
      } catch (error) {
        console.error(`Failed to delete folder ${folderId}:`, error);
      }
    }

    return deletedFolders;
  }
}