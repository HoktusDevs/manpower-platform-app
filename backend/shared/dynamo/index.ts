// Export all DynamoDB shared utilities
export { BaseDynamoService } from './BaseDynamoService';
export type { 
  DynamoConfig, 
  TableConfig, 
  QueryOptions, 
  ScanOptions 
} from './BaseDynamoService';

export { TableRegistry } from './TableRegistry';
export { COMMON_TABLE_CONFIGS, initializeTableRegistry } from './TableRegistry';

export { CrossServiceQuery } from './CrossServiceQuery';
export type { 
  CrossServiceQueryOptions, 
  JoinResult 
} from './CrossServiceQuery';

// Re-export AWS SDK types for convenience
export type { 
  AttributeValue,
  PutItemCommandInput,
  GetItemCommandInput,
  UpdateItemCommandInput,
  DeleteItemCommandInput,
  ScanCommandInput,
  QueryCommandInput
} from '@aws-sdk/client-dynamodb';
