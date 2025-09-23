import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb';
import { DocumentType, DocumentTypeModel } from '../models/DocumentType';
import { SearchDocumentTypesInput } from '../types';

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
    this.tableName = process.env.DOCUMENT_TYPES_TABLE || `document-types-service-${process.env.STAGE || 'dev'}`;
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

  async createDocumentType(documentType: DocumentTypeModel): Promise<DocumentType> {
    await this.ensureTableExists();

    const command = new PutCommand({
      TableName: this.tableName,
      Item: documentType.toJSON(),
    });

    await this.client.send(command);
    return documentType.toJSON();
  }

  async getDocumentType(typeId: string): Promise<DocumentType | null> {
    await this.ensureTableExists();

    const command = new GetCommand({
      TableName: this.tableName,
      Key: { typeId },
    });

    const result = await this.client.send(command);
    return result.Item as DocumentType || null;
  }

  async getAllDocumentTypes(): Promise<DocumentType[]> {
    await this.ensureTableExists();

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'isActive = :isActive',
      ExpressionAttributeValues: {
        ':isActive': true
      }
    });

    const result = await this.client.send(command);
    return (result.Items as DocumentType[]) || [];
  }

  async searchDocumentTypes(searchInput: SearchDocumentTypesInput): Promise<DocumentType[]> {
    await this.ensureTableExists();

    let filterExpressions: string[] = ['isActive = :isActive'];
    const expressionAttributeValues: { [key: string]: any } = {
      ':isActive': true
    };

    // Search by name
    if (searchInput.query) {
      filterExpressions.push('contains(#name, :query)');
      expressionAttributeValues[':query'] = searchInput.query;
    }

    // Filter by category
    if (searchInput.category) {
      filterExpressions.push('#category = :category');
      expressionAttributeValues[':category'] = searchInput.category;
    }

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: filterExpressions.join(' AND '),
      ExpressionAttributeNames: {
        '#name': 'name',
        '#category': 'category'
      },
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: searchInput.limit || 50
    });

    const result = await this.client.send(command);
    let documentTypes = (result.Items as DocumentType[]) || [];

    // Sort results
    if (searchInput.sortBy) {
      documentTypes = documentTypes.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (searchInput.sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'usageCount':
            aValue = a.usageCount;
            bValue = b.usageCount;
            break;
          case 'lastUsedAt':
            aValue = new Date(a.lastUsedAt || a.createdAt).getTime();
            bValue = new Date(b.lastUsedAt || b.createdAt).getTime();
            break;
          default:
            return 0;
        }

        if (searchInput.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    }

    return documentTypes;
  }

  async updateDocumentType(typeId: string, updates: Partial<DocumentType>): Promise<DocumentType | null> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (value !== undefined && key !== 'typeId') {
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
      Key: { typeId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await this.client.send(command);
    return result.Attributes as DocumentType || null;
  }

  async incrementUsageCount(typeId: string): Promise<DocumentType | null> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { typeId },
      UpdateExpression: 'SET usageCount = usageCount + :inc, lastUsedAt = :now, updatedAt = :now',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW',
    });

    const result = await this.client.send(command);
    return result.Attributes as DocumentType || null;
  }

  async deleteDocumentType(typeId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { typeId },
    });

    await this.client.send(command);
  }

  async findDocumentTypeByName(name: string): Promise<DocumentType | null> {
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#name = :name AND isActive = :isActive',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': name,
        ':isActive': true
      }
    });

    const result = await this.client.send(command);
    const items = (result.Items as DocumentType[]) || [];
    return items.length > 0 ? items[0] : null;
  }
}
