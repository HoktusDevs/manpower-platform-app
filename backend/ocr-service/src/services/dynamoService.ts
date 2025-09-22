import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { OCRDocumentModel } from '../models/OCRDocument';

export class DynamoService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({
      region: process.env.REGION || 'us-east-1'
    });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = `ocr-documents-${process.env.STAGE || 'dev'}`;
  }

  async saveDocument(document: OCRDocumentModel): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: document.toDynamoDB()
    });

    await this.client.send(command);
  }

  async getDocument(id: string): Promise<OCRDocumentModel | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { id }
    });

    const result = await this.client.send(command);
    
    if (!result.Item) {
      return null;
    }

    return OCRDocumentModel.fromDynamoDB(result.Item);
  }

  async updateDocumentStatus(id: string, status: string, error?: string): Promise<void> {
    const updateExpression = error 
      ? 'SET #status = :status, updatedAt = :updatedAt, #error = :error'
      : 'SET #status = :status, updatedAt = :updatedAt';
    
    const expressionAttributeNames: Record<string, string> = error
      ? { '#status': 'status', '#error': 'error' }
      : { '#status': 'status' };

    const expressionAttributeValues = error
      ? {
          ':status': status,
          ':updatedAt': new Date().toISOString(),
          ':error': error
        }
      : {
          ':status': status,
          ':updatedAt': new Date().toISOString()
        };

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    });

    await this.client.send(command);
  }

  async updateDocumentWithResult(id: string, ocrResult: any): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, ocrResult = :ocrResult',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'completed',
        ':updatedAt': new Date().toISOString(),
        ':ocrResult': JSON.stringify(ocrResult)
      }
    });

    await this.client.send(command);
  }

  async getDocumentsByStatus(status: string): Promise<OCRDocumentModel[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'status-createdAt-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status
      }
    });

    const result = await this.client.send(command);
    
    if (!result.Items) {
      return [];
    }

    return result.Items.map(item => OCRDocumentModel.fromDynamoDB(item));
  }

  async getDocumentByPlatformId(platformDocumentId: string): Promise<OCRDocumentModel | null> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'platformDocumentId = :platformDocumentId',
        ExpressionAttributeValues: {
          ':platformDocumentId': platformDocumentId
        }
      });

      const result = await this.client.send(command);
      const items = result.Items || [];
      
      if (items.length === 0) {
        return null;
      }

      return OCRDocumentModel.fromDynamoDB(items[0]);
    } catch (error) {
      console.error('Error getting document by platform ID:', error);
      throw error;
    }
  }
}
