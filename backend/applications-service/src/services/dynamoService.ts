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
import { Application, ApplicationModel } from '../models/Application';
import { ApplicationQuery } from '../types';

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
    this.tableName = process.env.APPLICATIONS_TABLE || `manpower-applications-${process.env.STAGE || 'dev'}`;
  }

  private async ensureTableExists(): Promise<void> {
    if (this.tableInitialized) return;

    try {
      // Verificar si la tabla ya existe
      const describeCommand = new GetCommand({
        TableName: this.tableName,
        Key: { applicationId: 'test' }
      });
      
      await this.client.send(describeCommand);
      this.tableInitialized = true;
      console.log('Table already exists, skipping creation');
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        // La tabla no existe, intentar crearla
        const command = new CreateTableCommand({
          TableName: this.tableName,
          AttributeDefinitions: [
            { AttributeName: 'applicationId', AttributeType: 'S' },
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'jobId', AttributeType: 'S' }
          ],
          KeySchema: [
            { AttributeName: 'applicationId', KeyType: 'HASH' }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: 'UserIndex',
              KeySchema: [
                { AttributeName: 'userId', KeyType: 'HASH' }
              ],
              Projection: { ProjectionType: 'ALL' },
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
              }
            },
            {
              IndexName: 'JobIndex',
              KeySchema: [
                { AttributeName: 'jobId', KeyType: 'HASH' }
              ],
              Projection: { ProjectionType: 'ALL' },
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
              }
            },
            {
              IndexName: 'JobUserIndex',
              KeySchema: [
                { AttributeName: 'jobId', KeyType: 'HASH' },
                { AttributeName: 'userId', KeyType: 'RANGE' }
              ],
              Projection: { ProjectionType: 'ALL' },
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
              }
            }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        });

        await this.rawClient.send(command);
        this.tableInitialized = true;
      } else {
        // La tabla existe o hay otro error
        this.tableInitialized = true;
        console.log('Table exists or error accessing table:', error.message);
      }
    }
  }

  async createApplication(application: ApplicationModel): Promise<Application> {
    await this.ensureTableExists();

    const command = new PutCommand({
      TableName: this.tableName,
      Item: application,
      ConditionExpression: 'attribute_not_exists(applicationId)'
    });

    await this.client.send(command);
    return application.toApplication();
  }

  async getApplication(applicationId: string): Promise<Application | null> {
    await this.ensureTableExists();

    const command = new GetCommand({
      TableName: this.tableName,
      Key: { applicationId }
    });

    const result = await this.client.send(command);
    return result.Item as Application || null;
  }

  async getApplicationsByUser(userId: string, limit?: number, nextToken?: string): Promise<{ applications: Application[], nextToken?: string }> {
    await this.ensureTableExists();

    // Usar la clave primaria userId para hacer query directo
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: limit,
      ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined,
      ScanIndexForward: false // Most recent first
    });

    const result = await this.client.send(command);

    return {
      applications: result.Items as Application[] || [],
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async checkApplicationExists(userId: string, jobId: string): Promise<Application | null> {
    await this.ensureTableExists();

    // Usar scan para buscar por jobId y userId ya que no tenemos el índice JobUserIndex
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'jobId = :jobId AND userId = :userId',
      ExpressionAttributeValues: {
        ':jobId': jobId,
        ':userId': userId
      }
    });

    const result = await this.client.send(command);
    return result.Items && result.Items.length > 0 ? result.Items[0] as Application : null;
  }

  async updateApplication(applicationId: string, updates: Partial<Application>): Promise<Application | null> {
    await this.ensureTableExists();

    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.keys(updates).forEach((key, index) => {
      if (key !== 'applicationId' && updates[key as keyof Application] !== undefined) {
        updateExpression.push(`#${key} = :val${index}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:val${index}`] = updates[key as keyof Application];
      }
    });

    if (updateExpression.length === 0) {
      return null;
    }

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { applicationId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const result = await this.client.send(command);
    return result.Attributes as Application || null;
  }

  async deleteApplication(applicationId: string): Promise<boolean> {
    await this.ensureTableExists();

    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { applicationId },
      ReturnValues: 'ALL_OLD'
    });

    const result = await this.client.send(command);
    return !!result.Attributes;
  }
}
