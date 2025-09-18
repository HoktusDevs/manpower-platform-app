import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { ServiceInfo, ServiceRegistry, HealthCheckResponse } from '../types';

export class DiscoveryService {
  private cloudFormation: CloudFormationClient;
  private stage: string;
  private region: string;

  constructor() {
    this.stage = process.env.STAGE || 'dev';
    this.region = process.env.REGION || 'us-east-1';
    this.cloudFormation = new CloudFormationClient({ region: this.region });
  }

  async discoverServices(): Promise<ServiceRegistry> {
    const services: ServiceRegistry = {};

    const serviceNames = ['auth-service', 'files-service', 'folders-service', 'jobs-service'];

    for (const serviceName of serviceNames) {
      try {
        const stackName = `${serviceName}-${this.stage}`;
        const command = new DescribeStacksCommand({ StackName: stackName });
        const response = await this.cloudFormation.send(command);

        if (response.Stacks && response.Stacks.length > 0) {
          const stack = response.Stacks[0];
          const outputs = stack.Outputs || [];

          const serviceUrlOutput = outputs.find(output =>
            output.OutputKey?.includes('ServiceEndpoint') ||
            output.OutputKey?.includes('RestApiUrl') ||
            output.OutputKey?.includes('Url')
          );

          if (serviceUrlOutput?.OutputValue) {
            const baseUrl = serviceUrlOutput.OutputValue.replace(/\/$/, '');
            const healthStatus = await this.checkServiceHealth(baseUrl);

            services[serviceName] = {
              name: serviceName,
              baseUrl,
              version: '1.0.0',
              status: healthStatus.status,
              endpoints: this.getServiceEndpoints(serviceName),
              lastChecked: new Date().toISOString(),
            };
          }
        }
      } catch (error) {
        console.error(`Failed to discover service ${serviceName}:`, error);
        services[serviceName] = {
          name: serviceName,
          baseUrl: '',
          version: '1.0.0',
          status: 'unknown',
          endpoints: [],
          lastChecked: new Date().toISOString(),
        };
      }
    }

    return services;
  }

  async checkServiceHealth(baseUrl: string): Promise<HealthCheckResponse> {
    try {
      const healthEndpoint = `${baseUrl}/health`;
      const response = await fetch(healthEndpoint, {
        method: 'GET',
        timeout: 5000,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          service: data.service || 'unknown',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: data.version,
          uptime: data.uptime,
          dependencies: data.dependencies,
        };
      } else {
        return {
          service: 'unknown',
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      return {
        service: 'unknown',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    }
  }

  private getServiceEndpoints(serviceName: string): string[] {
    const endpointMap: { [key: string]: string[] } = {
      'auth-service': [
        '/auth/register/admin',
        '/auth/register/postulante',
        '/auth/login',
        '/auth/refresh',
        '/auth/logout',
        '/auth/verify',
        '/auth/forgot-password',
        '/auth/reset-password'
      ],
      'files-service': [
        '/files',
        '/files/{fileId}',
        '/files/folder/{folderId}',
        '/files/upload-url',
        '/files/confirm-upload',
        '/files/bulk-upload-urls',
        '/files/{fileId}/download',
        '/files/bulk-delete',
        '/public/files/{fileId}'
      ],
      'folders-service': [
        '/folders',
        '/folders/{folderId}',
        '/folders/{folderId}/children',
        '/folders/root',
        '/folders/bulk-delete'
      ],
      'jobs-service': [
        '/jobs',
        '/jobs/{jobId}',
        '/jobs/folder/{folderId}',
        '/jobs/search',
        '/jobs/bulk-delete'
      ]
    };

    return endpointMap[serviceName] || [];
  }

  async getServiceByName(serviceName: string): Promise<ServiceInfo | null> {
    const services = await this.discoverServices();
    return services[serviceName] || null;
  }

  async getHealthyServices(): Promise<ServiceRegistry> {
    const services = await this.discoverServices();
    const healthyServices: ServiceRegistry = {};

    for (const [name, service] of Object.entries(services)) {
      if (service.status === 'healthy') {
        healthyServices[name] = service;
      }
    }

    return healthyServices;
  }

  async refreshServiceRegistry(): Promise<ServiceRegistry> {
    console.log('Refreshing service registry...');
    return await this.discoverServices();
  }
}