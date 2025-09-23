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
      Item: {
        ...application,
        userId: application.userId, // Asegurar que userId esté presente
        applicationId: application.applicationId
      },
      ConditionExpression: 'attribute_not_exists(applicationId)'
    });

    await this.client.send(command);
    return application.toApplication();
  }

  async getApplication(applicationId: string): Promise<Application | null> {
    await this.ensureTableExists();

    // Extraer userId del applicationId (formato: jobId_userId)
    const userId = applicationId.split('_').slice(1).join('_');
    
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { 
        userId: userId,
        applicationId: applicationId 
      }
    });

    const result = await this.client.send(command);
    return result.Item as Application || null;
  }

  async getApplicationsByUser(userId: string, limit?: number, nextToken?: string): Promise<{ applications: Application[], nextToken?: string }> {
    await this.ensureTableExists();

    // Usar la clave primaria userId directamente
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

  async deleteApplication(applicationId: string, userId?: string): Promise<boolean> {
    await this.ensureTableExists();

    try {
      console.log(`🗑️ Deleting application: ${applicationId}, userId: ${userId}`);
      
      // Si no tenemos userId, necesitamos buscarlo primero
      if (!userId) {
        const application = await this.getApplication(applicationId);
        if (!application) {
          console.log(`❌ Application ${applicationId} not found`);
          return false;
        }
        userId = application.userId;
      }
      
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { 
          userId: userId,
          applicationId: applicationId 
        },
        ReturnValues: 'ALL_OLD'
      });

      const result = await this.client.send(command);
      console.log(`✅ Delete result:`, result);
      
      return !!result.Attributes;
    } catch (error) {
      console.error(`❌ Error deleting application ${applicationId}:`, error);
      return false;
    }
  }

  async getApplicationsByJob(jobId: string, limit?: number, nextToken?: string): Promise<{ applications: Application[], nextToken?: string }> {
    await this.ensureTableExists();

    // Usar begins_with para buscar todas las aplicaciones que empiecen con jobId_
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'begins_with(applicationId, :jobId)',
      ExpressionAttributeValues: {
        ':jobId': `${jobId}_`
      },
      Limit: limit,
      ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined
    });

    const result = await this.client.send(command);

    return {
      applications: result.Items as Application[] || [],
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined
    };
  }

  async getJobData(jobId: string): Promise<any | null> {
    try {
      const jobsTableName = process.env.JOBS_TABLE || `manpower-jobs-${process.env.STAGE || 'dev'}`;
      
      // Usar Scan para buscar por jobId ya que la tabla tiene clave compuesta (jobId, createdBy)
      const command = new ScanCommand({
        TableName: jobsTableName,
        FilterExpression: 'jobId = :jobId',
        ExpressionAttributeValues: {
          ':jobId': jobId
        }
      });

      const result = await this.client.send(command);
      return result.Items && result.Items.length > 0 ? result.Items[0] : null;
    } catch (error) {
      console.error('Error getting job data:', error);
      return null;
    }
  }

  async getJobFolderId(regionFolderId: string, jobTitle: string, companyName: string, location: string): Promise<string | null> {
    try {
      const foldersTableName = process.env.FOLDERS_TABLE || `manpower-folders-${process.env.STAGE || 'dev'}`;
      
      // Buscar la carpeta del cargo específico
      const command = new ScanCommand({
        TableName: foldersTableName,
        FilterExpression: 'parentId = :parentId AND #type = :type AND contains(#name, :jobTitle)',
        ExpressionAttributeNames: {
          '#type': 'type',
          '#name': 'name'
        },
        ExpressionAttributeValues: {
          ':parentId': regionFolderId,
          ':type': 'Cargo',
          ':jobTitle': jobTitle
        }
      });

      const result = await this.client.send(command);
      if (result.Items && result.Items.length > 0) {
        return result.Items[0].folderId;
      }
      return null;
    } catch (error) {
      console.error('Error getting job folder ID:', error);
      return null;
    }
  }


  async getAllApplications(limit?: number, nextToken?: string): Promise<{ applications: Application[], nextToken?: string }> {
    await this.ensureTableExists();

    const command = new ScanCommand({
      TableName: this.tableName,
      Limit: limit,
      ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined
    });

    const result = await this.client.send(command);

    return {
      applications: result.Items as Application[] || [],
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : undefined,
    };
  }
}
