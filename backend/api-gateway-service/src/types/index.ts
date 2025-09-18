export interface ServiceInfo {
  name: string;
  baseUrl: string;
  version: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  endpoints: string[];
  lastChecked: string;
}

export interface ServiceRegistry {
  [serviceName: string]: ServiceInfo;
}

export interface HealthCheckResponse {
  service: string;
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version?: string;
  uptime?: number;
  dependencies?: {
    [key: string]: 'healthy' | 'unhealthy';
  };
}

export interface DiscoveryResponse {
  success: boolean;
  message: string;
  services: ServiceRegistry;
  timestamp: string;
  totalServices: number;
  healthyServices: number;
}