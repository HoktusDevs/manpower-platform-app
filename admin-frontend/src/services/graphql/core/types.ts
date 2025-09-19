/**
 * Core GraphQL Types
 * Shared types across all GraphQL services
 */

export interface GraphQLConfig {
  graphqlEndpoint: string;
  region: string;
  authenticationType: 'AMAZON_COGNITO_USER_POOLS' | 'AWS_IAM';
  userPoolId?: string;
  userPoolClientId?: string;
  identityPoolId?: string;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: Array<string | number>;
    extensions?: Record<string, unknown>;
  }>;
}

export interface GraphQLExecuteOptions {
  query: string;
  variables?: Record<string, unknown>;
  authMode?: string;
}