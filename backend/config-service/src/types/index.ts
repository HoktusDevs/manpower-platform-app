export interface FrontendConfig {
  apiGatewayUrl: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
  cognitoRegion: string;
  environment: string;
  stage: string;
  version: string;
  features: {
    fileUpload: boolean;
    bulkOperations: boolean;
    publicFiles: boolean;
  };
  endpoints: {
    auth: string;
    files: string;
    folders: string;
    jobs: string;
    health: string;
    services: string;
  };
  s3Config: {
    maxFileSize: number;
    allowedFileTypes: string[];
    uploadExpiration: number;
  };
}

export interface ConfigResponse {
  success: boolean;
  message: string;
  config?: FrontendConfig;
  timestamp: string;
}