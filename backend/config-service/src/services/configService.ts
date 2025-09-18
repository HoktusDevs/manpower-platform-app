import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { FrontendConfig } from '../types';

export class ConfigService {
  private cloudFormation: CloudFormationClient;
  private stage: string;
  private region: string;

  constructor() {
    this.stage = process.env.STAGE || 'dev';
    this.region = process.env.REGION || 'us-east-1';
    this.cloudFormation = new CloudFormationClient({ region: this.region });
  }

  async getFrontendConfig(): Promise<FrontendConfig> {
    try {
      const apiGatewayUrl = await this.getApiGatewayUrl();

      const config: FrontendConfig = {
        apiGatewayUrl,
        cognitoUserPoolId: 'us-east-1_kQKPPUqRO',
        cognitoClientId: await this.getCognitoClientId(),
        cognitoRegion: this.region,
        environment: this.stage,
        stage: this.stage,
        version: '1.0.0',
        features: {
          fileUpload: true,
          bulkOperations: true,
          publicFiles: true,
        },
        endpoints: {
          auth: `${apiGatewayUrl}/auth`,
          files: `${apiGatewayUrl}/files`,
          folders: `${apiGatewayUrl}/folders`,
          jobs: `${apiGatewayUrl}/jobs`,
          health: `${apiGatewayUrl}/health`,
          services: `${apiGatewayUrl}/services`,
        },
        s3Config: {
          maxFileSize: 52428800, // 50MB
          allowedFileTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/zip',
            'application/x-rar-compressed',
            'application/x-7z-compressed'
          ],
          uploadExpiration: 900, // 15 minutes
        },
      };

      return config;
    } catch (error) {
      console.error('Error generating frontend config:', error);
      throw new Error('Failed to generate frontend configuration');
    }
  }

  private async getApiGatewayUrl(): Promise<string> {
    try {
      const stackName = `api-gateway-service-${this.stage}`;
      const command = new DescribeStacksCommand({ StackName: stackName });
      const response = await this.cloudFormation.send(command);

      if (response.Stacks && response.Stacks.length > 0) {
        const stack = response.Stacks[0];
        const outputs = stack.Outputs || [];

        const apiUrlOutput = outputs.find(output =>
          output.OutputKey === 'MainApiGatewayUrl'
        );

        if (apiUrlOutput?.OutputValue) {
          return apiUrlOutput.OutputValue.replace(/\/$/, '');
        }
      }

      throw new Error('API Gateway URL not found');
    } catch (error) {
      console.error('Error getting API Gateway URL:', error);
      // Fallback URL pattern if CloudFormation lookup fails
      return `https://api-gateway-${this.stage}.execute-api.${this.region}.amazonaws.com/${this.stage}`;
    }
  }

  private async getCognitoClientId(): Promise<string> {
    try {
      // This should be retrieved from CloudFormation or Parameter Store
      // For now, we'll use a placeholder that should be configured per environment
      const stackName = `cognito-auth-stack-${this.stage}`;
      const command = new DescribeStacksCommand({ StackName: stackName });
      const response = await this.cloudFormation.send(command);

      if (response.Stacks && response.Stacks.length > 0) {
        const stack = response.Stacks[0];
        const outputs = stack.Outputs || [];

        const clientIdOutput = outputs.find(output =>
          output.OutputKey?.includes('ClientId') || output.OutputKey?.includes('AppClientId')
        );

        if (clientIdOutput?.OutputValue) {
          return clientIdOutput.OutputValue;
        }
      }

      // Fallback - this should be replaced with actual Cognito Client ID
      return 'YOUR_COGNITO_CLIENT_ID';
    } catch (error) {
      console.error('Error getting Cognito Client ID:', error);
      return 'YOUR_COGNITO_CLIENT_ID';
    }
  }

  generateJavaScriptConfig(config: FrontendConfig): string {
    return `
// Auto-generated configuration - DO NOT EDIT MANUALLY
window.APP_CONFIG = ${JSON.stringify(config, null, 2)};

// Helper functions for easier access
window.getApiUrl = function(endpoint) {
  return window.APP_CONFIG.endpoints[endpoint] || window.APP_CONFIG.apiGatewayUrl + '/' + endpoint;
};

window.getCognitoConfig = function() {
  return {
    userPoolId: window.APP_CONFIG.cognitoUserPoolId,
    clientId: window.APP_CONFIG.cognitoClientId,
    region: window.APP_CONFIG.cognitoRegion
  };
};

window.getS3Config = function() {
  return window.APP_CONFIG.s3Config;
};

// Configuration loaded at: ${new Date().toISOString()}
console.log('Frontend configuration loaded:', window.APP_CONFIG);
    `.trim();
  }
}