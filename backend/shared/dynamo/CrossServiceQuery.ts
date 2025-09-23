import { BaseDynamoService, TableConfig } from './BaseDynamoService';
import { TableRegistry } from './TableRegistry';

export interface CrossServiceQueryOptions {
  includeInactive?: boolean;
  limit?: number;
  nextToken?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface JoinResult<T = any> {
  primary: T;
  related: Array<{ serviceName: string; tableName: string; data: any[] }>;
  metadata: {
    totalResults: number;
    nextToken?: string;
    queryTime: number;
  };
}

export class CrossServiceQuery {
  private registry: TableRegistry;
  private services: Map<string, BaseDynamoService> = new Map();

  constructor(registry: TableRegistry) {
    this.registry = registry;
  }

  registerService(serviceName: string, service: BaseDynamoService): void {
    this.services.set(serviceName, service);
  }

  // Get service instance or create a new one
  private async getService(serviceName: string, tableName: string): Promise<BaseDynamoService | null> {
    if (this.services.has(serviceName)) {
      return this.services.get(serviceName)!;
    }

    // Try to create a service instance for cross-service queries
    const tableConfig = this.registry.getTableConfig(serviceName, tableName);
    if (!tableConfig) {
      console.warn(`Cannot create service for ${serviceName}:${tableName} - table config not found`);
      return null;
    }

    // Create a generic service instance
    const service = new (class extends BaseDynamoService {
      constructor() {
        super(tableConfig);
      }
    })();

    this.services.set(serviceName, service);
    return service;
  }

  // Query multiple related tables
  async queryRelatedTables<T>(
    primaryService: string,
    primaryTable: string,
    primaryQuery: any,
    relatedTables: Array<{ serviceName: string; tableName: string; query: any }>,
    options: CrossServiceQueryOptions = {}
  ): Promise<JoinResult<T>> {
    const startTime = Date.now();
    const results: JoinResult<T> = {
      primary: null as any,
      related: [],
      metadata: {
        totalResults: 0,
        queryTime: 0
      }
    };

    try {
      // Query primary table
      const primaryServiceInstance = await this.getService(primaryService, primaryTable);
      if (!primaryServiceInstance) {
        throw new Error(`Primary service ${primaryService} not available`);
      }

      const primaryResult = await primaryServiceInstance.scan({
        ...primaryQuery,
        limit: options.limit,
        nextToken: options.nextToken
      });

      results.primary = primaryResult.items as T;
      results.metadata.nextToken = primaryResult.nextToken;

      // Query related tables
      for (const relatedTable of relatedTables) {
        const relatedService = await this.getService(relatedTable.serviceName, relatedTable.tableName);
        if (!relatedService) {
          console.warn(`Related service ${relatedTable.serviceName} not available`);
          continue;
        }

        const relatedResult = await relatedService.scan({
          ...relatedTable.query,
          limit: options.limit
        });

        results.related.push({
          serviceName: relatedTable.serviceName,
          tableName: relatedTable.tableName,
          data: relatedResult.items
        });
      }

      results.metadata.totalResults = results.primary.length;
      results.metadata.queryTime = Date.now() - startTime;

      return results;
    } catch (error) {
      console.error('Cross-service query failed:', error);
      throw error;
    }
  }

  // Get jobs with their applications and document types
  async getJobsWithDetails(
    jobFilters: any = {},
    options: CrossServiceQueryOptions = {}
  ): Promise<JoinResult> {
    return this.queryRelatedTables(
      'jobs-service',
      'jobs',
      jobFilters,
      [
        {
          serviceName: 'applications-service',
          tableName: 'applications',
          query: { isActive: true }
        },
        {
          serviceName: 'document-types-service',
          tableName: 'document-types',
          query: { isActive: true }
        }
      ],
      options
    );
  }

  // Get applications with job and applicant details
  async getApplicationsWithDetails(
    applicationFilters: any = {},
    options: CrossServiceQueryOptions = {}
  ): Promise<JoinResult> {
    return this.queryRelatedTables(
      'applications-service',
      'applications',
      applicationFilters,
      [
        {
          serviceName: 'jobs-service',
          tableName: 'jobs',
          query: { isActive: true }
        }
      ],
      options
    );
  }

  // Get document types with usage statistics
  async getDocumentTypesWithStats(
    documentTypeFilters: any = {},
    options: CrossServiceQueryOptions = {}
  ): Promise<JoinResult> {
    return this.queryRelatedTables(
      'document-types-service',
      'document-types',
      documentTypeFilters,
      [
        {
          serviceName: 'jobs-service',
          tableName: 'jobs',
          query: { isActive: true, requiredDocuments: { $exists: true } }
        }
      ],
      options
    );
  }

  // Search across multiple services
  async globalSearch(
    searchTerm: string,
    services: Array<{ serviceName: string; tableName: string; searchFields: string[] }>,
    options: CrossServiceQueryOptions = {}
  ): Promise<{ [serviceName: string]: { [tableName: string]: any[] } }> {
    const results: { [serviceName: string]: { [tableName: string]: any[] } } = {};

    for (const service of services) {
      const serviceInstance = await this.getService(service.serviceName, service.tableName);
      if (!serviceInstance) {
        continue;
      }

      // Build search filter
      const searchFilters: any = {};
      service.searchFields.forEach(field => {
        searchFilters[field] = `*${searchTerm}*`;
      });

      const searchResult = await serviceInstance.scan({
        ...searchFilters,
        limit: options.limit
      });

      if (!results[service.serviceName]) {
        results[service.serviceName] = {};
      }
      results[service.serviceName][service.tableName] = searchResult.items;
    }

    return results;
  }

  // Get analytics data across services
  async getAnalyticsData(
    dateRange: { start: string; end: string },
    services: Array<{ serviceName: string; tableName: string; dateField: string }>
  ): Promise<{ [serviceName: string]: { [tableName: string]: any[] } }> {
    const results: { [serviceName: string]: { [tableName: string]: any[] } } = {};

    for (const service of services) {
      const serviceInstance = await this.getService(service.serviceName, service.tableName);
      if (!serviceInstance) {
        continue;
      }

      const dateFilter = {
        [service.dateField]: {
          $gte: dateRange.start,
          $lte: dateRange.end
        }
      };

      const analyticsResult = await serviceInstance.scan({
        ...dateFilter,
        limit: 1000 // Large limit for analytics
      });

      if (!results[service.serviceName]) {
        results[service.serviceName] = {};
      }
      results[service.serviceName][service.tableName] = analyticsResult.items;
    }

    return results;
  }

  // Batch operations across services
  async batchUpdateAcrossServices(
    operations: Array<{
      serviceName: string;
      tableName: string;
      operations: Array<{ type: 'put' | 'delete'; item?: any; key?: any }>;
    }>
  ): Promise<{ [serviceName: string]: { success: boolean; error?: string } }> {
    const results: { [serviceName: string]: { success: boolean; error?: string } } = {};

    for (const operation of operations) {
      try {
        const serviceInstance = await this.getService(operation.serviceName, operation.tableName);
        if (!serviceInstance) {
          results[operation.serviceName] = { success: false, error: 'Service not available' };
          continue;
        }

        await serviceInstance.batchWrite(operation.operations);
        results[operation.serviceName] = { success: true };
      } catch (error) {
        results[operation.serviceName] = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }

    return results;
  }
}
