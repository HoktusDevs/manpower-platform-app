import { TableConfig } from './BaseDynamoService';

export interface ServiceTableConfig {
  serviceName: string;
  tables: { [tableName: string]: TableConfig };
}

export class TableRegistry {
  private static instance: TableRegistry;
  private services: Map<string, ServiceTableConfig> = new Map();

  private constructor() {}

  static getInstance(): TableRegistry {
    if (!TableRegistry.instance) {
      TableRegistry.instance = new TableRegistry();
    }
    return TableRegistry.instance;
  }

  registerService(serviceConfig: ServiceTableConfig): void {
    this.services.set(serviceConfig.serviceName, serviceConfig);
  }

  getTableConfig(serviceName: string, tableName: string): TableConfig | null {
    const service = this.services.get(serviceName);
    if (!service) {
      console.warn(`Service ${serviceName} not found in registry`);
      return null;
    }

    const tableConfig = service.tables[tableName];
    if (!tableConfig) {
      console.warn(`Table ${tableName} not found in service ${serviceName}`);
      return null;
    }

    return tableConfig;
  }

  getAllTables(): { [serviceName: string]: { [tableName: string]: TableConfig } } {
    const result: { [serviceName: string]: { [tableName: string]: TableConfig } } = {};
    
    this.services.forEach((serviceConfig, serviceName) => {
      result[serviceName] = serviceConfig.tables;
    });

    return result;
  }

  getServiceTables(serviceName: string): { [tableName: string]: TableConfig } | null {
    const service = this.services.get(serviceName);
    return service ? service.tables : null;
  }

  // Cross-service table discovery
  findTablesByPattern(pattern: string): Array<{ serviceName: string; tableName: string; config: TableConfig }> {
    const results: Array<{ serviceName: string; tableName: string; config: TableConfig }> = [];
    const regex = new RegExp(pattern, 'i');

    this.services.forEach((serviceConfig, serviceName) => {
      Object.entries(serviceConfig.tables).forEach(([tableName, config]) => {
        if (regex.test(tableName) || regex.test(serviceName)) {
          results.push({ serviceName, tableName, config });
        }
      });
    });

    return results;
  }

  // Get all tables that might contain related data
  getRelatedTables(primaryService: string, primaryTable: string): Array<{ serviceName: string; tableName: string; config: TableConfig }> {
    const results: Array<{ serviceName: string; tableName: string; config: TableConfig }> = [];
    
    // Common patterns for related tables
    const relatedPatterns = [
      'job', 'jobs', 'application', 'applications', 'user', 'users',
      'document', 'documents', 'folder', 'folders', 'file', 'files'
    ];

    this.services.forEach((serviceConfig, serviceName) => {
      Object.entries(serviceConfig.tables).forEach(([tableName, config]) => {
        // Skip the same table
        if (serviceName === primaryService && tableName === primaryTable) {
          return;
        }

        // Check if table name contains related patterns
        const isRelated = relatedPatterns.some(pattern => 
          tableName.toLowerCase().includes(pattern) || 
          serviceName.toLowerCase().includes(pattern)
        );

        if (isRelated) {
          results.push({ serviceName, tableName, config });
        }
      });
    });

    return results;
  }
}

// Predefined table configurations for common services
export const COMMON_TABLE_CONFIGS = {
  JOBS: {
    tableName: 'manpower-jobs',
    keySchema: [
      { AttributeName: 'jobId', KeyType: 'HASH' },
      { AttributeName: 'createdBy', KeyType: 'RANGE' }
    ],
    attributeDefinitions: [
      { AttributeName: 'jobId', AttributeType: 'S' },
      { AttributeName: 'createdBy', AttributeType: 'S' }
    ],
    billingMode: 'PAY_PER_REQUEST' as const,
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
  },
  
  APPLICATIONS: {
    tableName: 'manpower-applications',
    keySchema: [
      { AttributeName: 'applicationId', KeyType: 'HASH' },
      { AttributeName: 'jobId', KeyType: 'RANGE' }
    ],
    attributeDefinitions: [
      { AttributeName: 'applicationId', AttributeType: 'S' },
      { AttributeName: 'jobId', AttributeType: 'S' },
      { AttributeName: 'applicantId', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' }
    ],
    billingMode: 'PAY_PER_REQUEST' as const,
    globalSecondaryIndexes: [
      {
        IndexName: 'ApplicantIndex',
        KeySchema: [
          { AttributeName: 'applicantId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'StatusIndex',
        KeySchema: [
          { AttributeName: 'status', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },

  DOCUMENT_TYPES: {
    tableName: 'document-types',
    keySchema: [
      { AttributeName: 'typeId', KeyType: 'HASH' }
    ],
    attributeDefinitions: [
      { AttributeName: 'typeId', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' },
      { AttributeName: 'usageCount', AttributeType: 'N' }
    ],
    billingMode: 'PAY_PER_REQUEST' as const,
    globalSecondaryIndexes: [
      {
        IndexName: 'CategoryIndex',
        KeySchema: [
          { AttributeName: 'category', KeyType: 'HASH' },
          { AttributeName: 'usageCount', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  },

  FOLDERS: {
    tableName: 'manpower-folders',
    keySchema: [
      { AttributeName: 'folderId', KeyType: 'HASH' },
      { AttributeName: 'createdBy', KeyType: 'RANGE' }
    ],
    attributeDefinitions: [
      { AttributeName: 'folderId', AttributeType: 'S' },
      { AttributeName: 'createdBy', AttributeType: 'S' },
      { AttributeName: 'parentFolderId', AttributeType: 'S' }
    ],
    billingMode: 'PAY_PER_REQUEST' as const,
    globalSecondaryIndexes: [
      {
        IndexName: 'ParentFolderIndex',
        KeySchema: [
          { AttributeName: 'parentFolderId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  }
};

// Initialize registry with common configurations
export function initializeTableRegistry(): TableRegistry {
  const registry = TableRegistry.getInstance();

  // Register jobs-service tables
  registry.registerService({
    serviceName: 'jobs-service',
    tables: {
      'jobs': COMMON_TABLE_CONFIGS.JOBS
    }
  });

  // Register applications-service tables
  registry.registerService({
    serviceName: 'applications-service',
    tables: {
      'applications': COMMON_TABLE_CONFIGS.APPLICATIONS
    }
  });

  // Register document-types-service tables
  registry.registerService({
    serviceName: 'document-types-service',
    tables: {
      'document-types': COMMON_TABLE_CONFIGS.DOCUMENT_TYPES
    }
  });

  // Register folders-service tables
  registry.registerService({
    serviceName: 'folders-service',
    tables: {
      'folders': COMMON_TABLE_CONFIGS.FOLDERS
    }
  });

  return registry;
}
