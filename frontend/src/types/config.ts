// Configuration Types - Precise typing for all configuration objects

export interface MigrationConfigUpdate {
  rolloutPercentage?: number;
  features?: Partial<MigrationFeatures>;
  abTestConfig?: Partial<ABTestConfig>;
  performanceThresholds?: Partial<PerformanceThresholds>;
}

export interface MigrationFeatures {
  applications: 'legacy' | 'aws_native' | 'ab_test';
  analytics: 'legacy' | 'aws_native' | 'ab_test';
  documents: 'legacy' | 'aws_native' | 'ab_test';
  auth: 'legacy' | 'aws_native' | 'ab_test';
}

export interface ABTestConfig {
  applications: ABTestSettings;
  analytics: ABTestSettings;
  documents: ABTestSettings;
  auth: ABTestSettings;
}

export interface ABTestSettings {
  enabled: boolean;
  percentage: number;
  criteria: ABTestCriteria;
}

export interface ABTestCriteria {
  userBased: boolean;
  sessionBased: boolean;
  locationBased: boolean;
  deviceBased: boolean;
}

export interface PerformanceThresholds {
  latencyThreshold: number;
  errorRateThreshold: number;
  successRateThreshold: number;
}

export interface HealthCheckResponse {
  success: boolean;
  data: HealthCheckData;
}

export interface HealthCheckData {
  timestamp: number;
  version: string;
  environment: 'development' | 'production' | 'staging';
  services: ServiceStatus;
  database: DatabaseStatus;
  auth: AuthStatus;
}

export interface ServiceStatus {
  api: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  storage: 'healthy' | 'degraded' | 'down';
  cache: 'healthy' | 'degraded' | 'down';
}

export interface DatabaseStatus {
  connected: boolean;
  latency: number;
  pool: {
    active: number;
    idle: number;
    total: number;
  };
}

export interface AuthStatus {
  cognito: 'healthy' | 'degraded' | 'down';
  sessions: number;
  tokensIssued: number;
}

export interface JWTPayload {
  sub: string;
  username: string;
  email: string;
  exp: number;
  iat: number;
  iss: string;
  aud: string;
  token_use: 'access' | 'id';
  'cognito:groups'?: string[];
  'custom:role'?: 'admin' | 'postulante';
}

export interface SessionData {
  sessionId: string;
  userId: string;
  role: 'admin' | 'postulante';
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
}