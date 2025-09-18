import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { File, FileModel } from '../models/File';
import { FileQuery } from '../types';

export class DynamoService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = process.env.DOCUMENTS_TABLE!;
  }

  async createFile(file: FileModel): Promise<File> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: file.toJSON(),
    });

    await this.client.send(command);
    return file.toJSON();
  }

  async getFile(fileId: string, userId: string): Promise<File | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        fileId,
        userId,
      },
    });

    const result = await this.client.send(command);
    return result.Item as File || null;
  }

  async updateFile(fileId: string, userId: string, updates: Partial<File>): Promise<File | null> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (value !== undefined && key !== 'fileId' && key !== 'userId') {
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
      Key: { fileId, userId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await this.client.send(command);
    return result.Attributes as File || null;
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        fileId,
        userId,
      },
    });

    await this.client.send(command);
  }

  async getFilesByUser(userId: string, limit?: number, nextToken?: string): Promise<{ files: File[], nextToken?: string }> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'UserIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':isActive': true,
      },
      FilterExpression: 'isActive = :isActive',
      Limit: limit,
      ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined,
      ScanIndexForward: false,
    });

    const result = await this.client.send(command);

    return {
      files: result.Items as File[] || [],
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async getFilesByFolder(folderId: string, userId: string, limit?: number): Promise<File[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'FolderIndex',
      KeyConditionExpression: 'folderId = :folderId',
      ExpressionAttributeValues: {
        ':folderId': folderId,
        ':userId': userId,
        ':isActive': true,
      },
      FilterExpression: 'userId = :userId AND isActive = :isActive',
      Limit: limit,
      ScanIndexForward: false,
    });

    const result = await this.client.send(command);
    return result.Items as File[] || [];
  }

  async getPublicFile(fileId: string): Promise<File | null> {
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'fileId = :fileId AND isPublic = :isPublic AND isActive = :isActive',
      ExpressionAttributeValues: {
        ':fileId': fileId,
        ':isPublic': true,
        ':isActive': true,
      },
    });

    const result = await this.client.send(command);
    return result.Items?.[0] as File || null;
  }

  async queryFiles(query: FileQuery): Promise<{ files: File[], nextToken?: string }> {
    let command;

    if (query.folderId) {
      command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'FolderIndex',
        KeyConditionExpression: 'folderId = :folderId',
        ExpressionAttributeValues: {
          ':folderId': query.folderId,
          ':userId': query.userId,
          ':isActive': true,
        },
        FilterExpression: 'userId = :userId AND isActive = :isActive',
        Limit: query.limit,
        ExclusiveStartKey: query.nextToken ? JSON.parse(Buffer.from(query.nextToken, 'base64').toString()) : undefined,
      });
    } else {
      command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': query.userId,
          ':isActive': true,
        },
        FilterExpression: 'isActive = :isActive',
        Limit: query.limit,
        ExclusiveStartKey: query.nextToken ? JSON.parse(Buffer.from(query.nextToken, 'base64').toString()) : undefined,
      });
    }

    const result = await this.client.send(command);

    return {
      files: result.Items as File[] || [],
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async batchDeleteFiles(fileIds: string[], userId: string): Promise<string[]> {
    const deletedFiles: string[] = [];

    for (const fileId of fileIds) {
      try {
        await this.deleteFile(fileId, userId);
        deletedFiles.push(fileId);
      } catch (error) {
        console.error(`Failed to delete file ${fileId}:`, error);
      }
    }

    return deletedFiles;
  }
}