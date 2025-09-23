import { BaseDynamoService, TableConfig } from '../BaseDynamoService';
import { TableRegistry, COMMON_TABLE_CONFIGS } from '../TableRegistry';
import { CrossServiceQuery } from '../CrossServiceQuery';

// Example of how to refactor JobsService to use the shared layer
export class JobsServiceRefactored extends BaseDynamoService {
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
  }

  // Job-specific methods using the base functionality
  async createJob(job: any): Promise<any> {
    return this.putItem(job);
  }

  async getJob(jobId: string, createdBy: string): Promise<any | null> {
    return this.getItem({ jobId, createdBy });
  }

  async updateJob(jobId: string, createdBy: string, updates: any): Promise<any | null> {
    return this.updateItem({ jobId, createdBy }, updates);
  }

  async deleteJob(jobId: string, createdBy: string): Promise<void> {
    return this.deleteItem({ jobId, createdBy });
  }

  async getJobsByStatus(status: string, limit?: number): Promise<any[]> {
    const result = await this.query('status = :status', {
      expressionAttributeValues: { ':status': status },
      limit
    });
    return result.items;
  }

  async getJobsByCompany(companyName: string, limit?: number): Promise<any[]> {
    const result = await this.query('companyName = :companyName', {
      expressionAttributeValues: { ':companyName': companyName },
      limit
    });
    return result.items;
  }

  async searchJobs(filters: any, options: { limit?: number; nextToken?: string } = {}): Promise<{ jobs: any[], nextToken?: string }> {
    const { filterExpression, expressionAttributeNames, expressionAttributeValues } = this.buildFilterExpression(filters);
    
    const result = await this.scan({
      filterExpression,
      expressionAttributeNames,
      expressionAttributeValues,
      limit: options.limit,
      nextToken: options.nextToken
    });

    return {
      jobs: result.items,
      nextToken: result.nextToken
    };
  }

  // Cross-service operations
  async getJobsWithApplications(jobIds: string[]): Promise<any[]> {
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

    return result.primary;
  }

  async getJobsWithDocumentTypes(jobIds: string[]): Promise<any[]> {
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

    return result.primary;
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
}

// Example of how to initialize the shared infrastructure
export function initializeSharedDynamoInfrastructure(): {
  registry: TableRegistry;
  crossServiceQuery: CrossServiceQuery;
} {
  // Initialize table registry
  const registry = initializeTableRegistry();
  
  // Initialize cross-service query
  const crossServiceQuery = new CrossServiceQuery(registry);
  
  return { registry, crossServiceQuery };
}

// Example usage in a service
export function createJobsService(): JobsServiceRefactored {
  // Initialize shared infrastructure
  const { registry, crossServiceQuery } = initializeSharedDynamoInfrastructure();
  
  // Create service instance
  const jobsService = new JobsServiceRefactored();
  
  // Register with cross-service query
  crossServiceQuery.registerService('jobs-service', jobsService);
  
  return jobsService;
}
