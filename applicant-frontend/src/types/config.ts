export interface CognitoConfig {
  userPoolId: string;
  userPoolClientId: string;
  region: string;
  identityPoolId?: string;
}

export interface AWSConfig {
  region: string;
  cognito: CognitoConfig;
}

export interface AppConfig {
  apiBaseUrl: string;
  aws: AWSConfig;
  environment: 'development' | 'staging' | 'production';
  s3: {
    bucket: string;
    region: string;
  };
  websocket?: {
    url: string;
    retryAttempts: number;
    retryDelay: number;
  };
}

export interface EnvironmentConfig {
  VITE_API_BASE_URL: string;
  VITE_AWS_REGION: string;
  VITE_COGNITO_USER_POOL_ID: string;
  VITE_COGNITO_USER_POOL_CLIENT_ID: string;
  VITE_COGNITO_IDENTITY_POOL_ID?: string;
  VITE_S3_BUCKET: string;
  VITE_S3_REGION: string;
  VITE_WEBSOCKET_URL?: string;
  VITE_ENVIRONMENT: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
  email_verified?: boolean;
  exp: number;
  iat: number;
  iss: string;
  aud: string;
  [key: string]: unknown;
}