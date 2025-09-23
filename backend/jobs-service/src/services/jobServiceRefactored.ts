import { BaseDynamoService, TableConfig } from '../../../shared/dynamo/BaseDynamoService';
import { TableRegistry, CrossServiceQuery, initializeTableRegistry } from '../../../shared/dynamo';
import { Job, JobModel } from '../models/Job';
import { CreateJobInput, UpdateJobInput, JobQuery } from '../types';
import { DocumentTypesServiceClient } from './documentTypesServiceClient';

export class JobServiceRefactored extends BaseDynamoService {
  private documentTypesClient: DocumentTypesServiceClient;

  constructor() {
    const tableConfig: TableConfig = {
      tableName: process.env.JOBS_TABLE || `manpower-jobs-${process.env.STAGE || 'dev'}`,
      keySchema: [
        { AttributeName: 'jobId', KeyType: 'HASH' },
        { AttributeName: 'createdBy', KeyType: 'RANGE' }
      ],
      attributeDefinitions: [
        { AttributeName: 'jobId', AttributeType: 'S' },
        { AttributeName: 'createdBy', AttributeType: 'S' },
        { AttributeName: 'status', AttributeType: 'S' },
        { AttributeName: 'createdAt', AttributeType: 'S' },
        { AttributeName: 'companyName', AttributeType: 'S' }
      ],
      billingMode: 'PAY_PER_REQUEST',
      globalSecondaryIndexes: [
        {
          IndexName: 'StatusIndex',
          KeySchema: [
            { AttributeName: 'status', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' }
        },
        {
          IndexName: 'CompanyIndex',
          KeySchema: [
            { AttributeName: 'companyName', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' }
        }
      ]
    };

    super(tableConfig);
    this.documentTypesClient = new DocumentTypesServiceClient();
  }

  async createJob(input: CreateJobInput, createdBy: string): Promise<Job> {
    const jobModel = new JobModel({
      ...input,
      jobId: this.generateJobId(),
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    });

    // Handle document types integration
    if (input.requiredDocuments && input.requiredDocuments.length > 0) {
      try {
        // Check existing document types
        const existingTypes = await this.documentTypesClient.checkExistingDocumentTypes(input.requiredDocuments);
        
        // Create only new document types
        if (existingTypes.new.length > 0) {
          await this.documentTypesClient.createFromJobDocuments(
            existingTypes.new,
            createdBy
          );
        }

        // TODO: Increment usage count for existing types
        // This would be implemented in the document-types-service
      } catch (error) {
        console.warn('Failed to process document types:', error);
        // Continue with job creation even if document types fail
      }
    }

    const job = await this.putItem(jobModel.toJSON());
    return job;
  }

  async getJob(jobId: string, createdBy: string): Promise<Job | null> {
    return this.getItem({ jobId, createdBy });
  }

  async updateJob(jobId: string, createdBy: string, input: UpdateJobInput): Promise<Job | null> {
    const updates: any = { ...input };
    
    // Handle document types for updates
    if (input.requiredDocuments) {
      try {
        const existingTypes = await this.documentTypesClient.checkExistingDocumentTypes(input.requiredDocuments);
        
        if (existingTypes.new.length > 0) {
          await this.documentTypesClient.createFromJobDocuments(
            existingTypes.new,
            createdBy
          );
        }
      } catch (error) {
        console.warn('Failed to process document types for update:', error);
      }
    }

    return this.updateItem({ jobId, createdBy }, updates);
  }

  async deleteJob(jobId: string, createdBy: string): Promise<void> {
    await this.deleteItem({ jobId, createdBy });
  }

  async getJobsByStatus(status: string, limit?: number): Promise<Job[]> {
    const result = await this.query('status = :status', {
      expressionAttributeValues: { ':status': status },
      limit
    });
    return result.items;
  }

  async getJobsByCompany(companyName: string, limit?: number): Promise<Job[]> {
    const result = await this.query('companyName = :companyName', {
      expressionAttributeValues: { ':companyName': companyName },
      limit
    });
    return result.items;
  }

  async getPublishedJobs(limit?: number, nextToken?: string): Promise<{ jobs: Job[], nextToken?: string }> {
    const result = await this.query('status = :status', {
      expressionAttributeValues: { ':status': 'PUBLISHED' },
      limit,
      nextToken
    });

    return {
      jobs: result.items,
      nextToken: result.nextToken
    };
  }

  async queryJobs(query: JobQuery): Promise<{ jobs: Job[], nextToken?: string }> {
    const filters: any = { isActive: true };
    
    if (query.status) filters.status = query.status;
    if (query.folderId) filters.folderId = query.folderId;
    if (query.companyName) filters.companyName = `*${query.companyName}*`;

    const { filterExpression, expressionAttributeNames, expressionAttributeValues } = this.buildFilterExpression(filters);
    
    const result = await this.scan({
      filterExpression,
      expressionAttributeNames,
      expressionAttributeValues,
      limit: query.limit,
      nextToken: query.nextToken
    });

    return {
      jobs: result.items,
      nextToken: result.nextToken
    };
  }

  // Cross-service operations
  async getJobsWithApplications(jobIds: string[]): Promise<{ jobs: Job[], applications: any[] }> {
    const registry = TableRegistry.getInstance();
    const crossServiceQuery = new CrossServiceQuery(registry);
    
    // Register this service
    crossServiceQuery.registerService('jobs-service', this);

    const result = await crossServiceQuery.queryRelatedTables(
      'jobs-service',
      'jobs',
      { jobId: { $in: jobIds } },
      [
        {
          serviceName: 'applications-service',
          tableName: 'applications',
          query: { jobId: { $in: jobIds } }
        }
      ]
    );

    return {
      jobs: result.primary as Job[],
      applications: result.related.find(r => r.serviceName === 'applications-service')?.data || []
    };
  }

  async getJobsWithDocumentTypes(jobIds: string[]): Promise<{ jobs: Job[], documentTypes: any[] }> {
    const registry = TableRegistry.getInstance();
    const crossServiceQuery = new CrossServiceQuery(registry);
    
    crossServiceQuery.registerService('jobs-service', this);

    const result = await crossServiceQuery.queryRelatedTables(
      'jobs-service',
      'jobs',
      { jobId: { $in: jobIds } },
      [
        {
          serviceName: 'document-types-service',
          tableName: 'document-types',
          query: { isActive: true }
        }
      ]
    );

    return {
      jobs: result.primary as Job[],
      documentTypes: result.related.find(r => r.serviceName === 'document-types-service')?.data || []
    };
  }

  // Analytics methods
  async getJobAnalytics(dateRange: { start: string; end: string }): Promise<any> {
    const registry = TableRegistry.getInstance();
    const crossServiceQuery = new CrossServiceQuery(registry);
    
    crossServiceQuery.registerService('jobs-service', this);

    const analytics = await crossServiceQuery.getAnalyticsData(dateRange, [
      {
        serviceName: 'jobs-service',
        tableName: 'jobs',
        dateField: 'createdAt'
      },
      {
        serviceName: 'applications-service',
        tableName: 'applications',
        dateField: 'createdAt'
      }
    ]);

    return analytics;
  }

  // Global search across all job-related data
  async globalJobSearch(searchTerm: string): Promise<any> {
    const registry = TableRegistry.getInstance();
    const crossServiceQuery = new CrossServiceQuery(registry);
    
    crossServiceQuery.registerService('jobs-service', this);

    const results = await crossServiceQuery.globalSearch(searchTerm, [
      {
        serviceName: 'jobs-service',
        tableName: 'jobs',
        searchFields: ['title', 'description', 'companyName', 'location']
      },
      {
        serviceName: 'applications-service',
        tableName: 'applications',
        searchFields: ['applicantName', 'coverLetter']
      }
    ]);

    return results;
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Factory function to create service with shared infrastructure
export function createJobService(): JobServiceRefactored {
  // Initialize shared infrastructure
  const registry = initializeTableRegistry();
  const crossServiceQuery = new CrossServiceQuery(registry);
  
  // Create service instance
  const jobService = new JobServiceRefactored();
  
  // Register with cross-service query
  crossServiceQuery.registerService('jobs-service', jobService);
  
  return jobService;
}
