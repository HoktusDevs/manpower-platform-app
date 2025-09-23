import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  BatchGetCommand,
  BatchWriteCommand
} from '@aws-sdk/lib-dynamodb';

export interface DynamoConfig {
  region?: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export interface TableConfig {
  tableName: string;
  keySchema: Array<{
    AttributeName: string;
    KeyType: 'HASH' | 'RANGE';
  }>;
  attributeDefinitions: Array<{
    AttributeName: string;
    AttributeType: 'S' | 'N' | 'B';
  }>;
  billingMode?: 'PAY_PER_REQUEST' | 'PROVISIONED';
  globalSecondaryIndexes?: Array<{
    IndexName: string;
    KeySchema: Array<{
      AttributeName: string;
      KeyType: 'HASH' | 'RANGE';
    }>;
    Projection: {
      ProjectionType: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
      NonKeyAttributes?: string[];
    };
  }>;
}

export interface QueryOptions {
  limit?: number;
  nextToken?: string;
  filterExpression?: string;
  expressionAttributeNames?: { [key: string]: string };
  expressionAttributeValues?: { [key: string]: any };
  indexName?: string;
  scanIndexForward?: boolean;
}

export interface ScanOptions extends QueryOptions {
  segment?: number;
  totalSegments?: number;
}

export abstract class BaseDynamoService {
  protected client: DynamoDBDocumentClient;
  protected rawClient: DynamoDBClient;
  protected tableName: string;
  protected tableInitialized: boolean = false;
  protected tableConfig: TableConfig;

  constructor(tableConfig: TableConfig, dynamoConfig?: DynamoConfig) {
    this.tableConfig = tableConfig;
    this.tableName = tableConfig.tableName;

    const config: any = {
      region: dynamoConfig?.region || process.env.AWS_REGION || 'us-east-1',
    };

    // Local development configuration
    if (process.env.STAGE === 'local' || process.env.NODE_ENV === 'development') {
      config.endpoint = dynamoConfig?.endpoint || process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
      config.credentials = dynamoConfig?.credentials || {
        accessKeyId: 'dummy',
        secretAccessKey: 'dummy'
      };
    }

    this.rawClient = new DynamoDBClient(config);
    this.client = DynamoDBDocumentClient.from(this.rawClient);
  }

  protected async ensureTableExists(): Promise<void> {
    if (this.tableInitialized) return;

    try {
      // In production, tables are managed by infrastructure
      if (process.env.STAGE !== 'local') {
        this.tableInitialized = true;
        return;
      }

      console.log(`Ensuring table ${this.tableName} exists...`);
      this.tableInitialized = true;
    } catch (error: any) {
      console.error('Error checking table:', error);
      throw error;
    }
  }

  protected async createTable(): Promise<void> {
    const command = new CreateTableCommand({
      TableName: this.tableName,
      BillingMode: this.tableConfig.billingMode || 'PAY_PER_REQUEST',
      KeySchema: this.tableConfig.keySchema,
      AttributeDefinitions: this.tableConfig.attributeDefinitions,
      GlobalSecondaryIndexes: this.tableConfig.globalSecondaryIndexes,
    });

    await this.rawClient.send(command);
    console.log(`Table ${this.tableName} created successfully`);
  }

  // Generic CRUD operations
  async putItem(item: any): Promise<any> {
    await this.ensureTableExists();

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await this.client.send(command);
    return item;
  }

  async getItem(key: { [key: string]: any }): Promise<any | null> {
    await this.ensureTableExists();

    const command = new GetCommand({
      TableName: this.tableName,
      Key: key,
    });

    const result = await this.client.send(command);
    return result.Item || null;
  }

  async updateItem(
    key: { [key: string]: any },
    updates: { [key: string]: any },
    options?: {
      returnValues?: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';
      conditionExpression?: string;
      expressionAttributeNames?: { [key: string]: string };
      expressionAttributeValues?: { [key: string]: any };
    }
  ): Promise<any | null> {
    await this.ensureTableExists();

    const updateExpressions: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    // Build update expressions
    Object.entries(updates).forEach(([keyName, value], index) => {
      if (value !== undefined) {
        const nameKey = `#attr${index}`;
        const valueKey = `:val${index}`;

        updateExpressions.push(`${nameKey} = ${valueKey}`);
        expressionAttributeNames[nameKey] = keyName;
        expressionAttributeValues[valueKey] = value;
      }
    });

    if (updateExpressions.length === 0) {
      return null;
    }

    // Add updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: key,
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: {
        ...expressionAttributeNames,
        ...options?.expressionAttributeNames,
      },
      ExpressionAttributeValues: {
        ...expressionAttributeValues,
        ...options?.expressionAttributeValues,
      },
      ConditionExpression: options?.conditionExpression,
      ReturnValues: options?.returnValues || 'ALL_NEW',
    });

    const result = await this.client.send(command);
    return result.Attributes || null;
  }

  async deleteItem(key: { [key: string]: any }): Promise<void> {
    await this.ensureTableExists();

    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: key,
    });

    await this.client.send(command);
  }

  // Query operations
  async query(
    keyConditionExpression: string,
    options?: QueryOptions
  ): Promise<{ items: any[], nextToken?: string }> {
    await this.ensureTableExists();

    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: keyConditionExpression,
      FilterExpression: options?.filterExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: options?.expressionAttributeValues,
      IndexName: options?.indexName,
      ScanIndexForward: options?.scanIndexForward,
      Limit: options?.limit,
      ExclusiveStartKey: options?.nextToken ? JSON.parse(Buffer.from(options.nextToken, 'base64').toString()) : undefined,
    });

    const result = await this.client.send(command);

    return {
      items: result.Items || [],
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async scan(options?: ScanOptions): Promise<{ items: any[], nextToken?: string }> {
    await this.ensureTableExists();

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: options?.filterExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: options?.expressionAttributeValues,
      IndexName: options?.indexName,
      Limit: options?.limit,
      Segment: options?.segment,
      TotalSegments: options?.totalSegments,
      ExclusiveStartKey: options?.nextToken ? JSON.parse(Buffer.from(options.nextToken, 'base64').toString()) : undefined,
    });

    const result = await this.client.send(command);

    return {
      items: result.Items || [],
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  // Batch operations
  async batchGet(keys: Array<{ [key: string]: any }>): Promise<any[]> {
    await this.ensureTableExists();

    const command = new BatchGetCommand({
      RequestItems: {
        [this.tableName]: {
          Keys: keys,
        },
      },
    });

    const result = await this.client.send(command);
    return result.Responses?.[this.tableName] || [];
  }

  async batchWrite(operations: Array<{
    type: 'put' | 'delete';
    item?: any;
    key?: { [key: string]: any };
  }>): Promise<void> {
    await this.ensureTableExists();

    const requestItems = operations.map(op => {
      if (op.type === 'put') {
        return { PutRequest: { Item: op.item } };
      } else {
        return { DeleteRequest: { Key: op.key } };
      }
    });

    const command = new BatchWriteCommand({
      RequestItems: {
        [this.tableName]: requestItems,
      },
    });

    await this.client.send(command);
  }

  // Utility methods
  protected buildFilterExpression(filters: { [key: string]: any }): {
    filterExpression: string;
    expressionAttributeNames: { [key: string]: string };
    expressionAttributeValues: { [key: string]: any };
  } {
    const filterExpressions: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    Object.entries(filters).forEach(([key, value], index) => {
      if (value !== undefined && value !== null) {
        const nameKey = `#filter${index}`;
        const valueKey = `:filter${index}`;

        if (typeof value === 'string' && value.includes('*')) {
          // Wildcard search
          const searchValue = value.replace(/\*/g, '');
          filterExpressions.push(`contains(${nameKey}, ${valueKey})`);
          expressionAttributeValues[valueKey] = searchValue;
        } else if (typeof value === 'string') {
          // Exact match
          filterExpressions.push(`${nameKey} = ${valueKey}`);
          expressionAttributeValues[valueKey] = value;
        } else if (Array.isArray(value)) {
          // IN operation
          filterExpressions.push(`${nameKey} IN (${valueKey})`);
          expressionAttributeValues[valueKey] = value;
        } else {
          // Other types
          filterExpressions.push(`${nameKey} = ${valueKey}`);
          expressionAttributeValues[valueKey] = value;
        }

        expressionAttributeNames[nameKey] = key;
      }
    });

    return {
      filterExpression: filterExpressions.join(' AND '),
      expressionAttributeNames,
      expressionAttributeValues,
    };
  }

  // Cross-service operations
  async crossServiceQuery<T>(
    serviceName: string,
    tableName: string,
    query: any
  ): Promise<T[]> {
    // This would be implemented to query other services' tables
    // For now, this is a placeholder for future cross-service functionality
    throw new Error(`Cross-service queries not yet implemented for ${serviceName}:${tableName}`);
  }
}
