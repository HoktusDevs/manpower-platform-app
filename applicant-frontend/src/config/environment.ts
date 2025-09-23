/**
 * Environment Configuration
 * Handles different environments (local, staging, production)
 */

export interface EnvironmentConfig {
  api: {
    files: string;
    ocr: string;
    applications: string;
    jobs: string;
  };
  websocket: {
    ocr: string;
  };
  s3: {
    bucket: string;
    region: string;
  };
}

const LOCAL_CONFIG: EnvironmentConfig = {
  api: {
    files: 'https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev',
    ocr: 'https://xtspcl5cj6.execute-api.us-east-1.amazonaws.com/dev',
    applications: 'https://8lmunkvdd5.execute-api.us-east-1.amazonaws.com/dev',
    jobs: 'https://pa3itplx4f.execute-api.us-east-1.amazonaws.com/dev',
  },
  websocket: {
    ocr: 'wss://axt7p628rd.execute-api.us-east-1.amazonaws.com/dev',
  },
  s3: {
    bucket: 'manpower-files-dev',
    region: 'us-east-1',
  },
};

const PRODUCTION_CONFIG: EnvironmentConfig = {
  api: {
    files: 'https://api.manpower-platform.com/files',
    ocr: 'https://api.manpower-platform.com/ocr',
    applications: 'https://api.manpower-platform.com/applications',
    jobs: 'https://api.manpower-platform.com/jobs',
  },
  websocket: {
    ocr: 'wss://websocket.manpower-platform.com/ocr',
  },
  s3: {
    bucket: 'manpower-files-prod',
    region: 'us-east-1',
  },
};

export const getEnvironmentConfig = (): EnvironmentConfig => {
  const isProduction = window.location.hostname.includes('manpower-platform.com');
  
  if (isProduction) {
    return PRODUCTION_CONFIG;
  }
  
  return LOCAL_CONFIG;
};

export const ENV_CONFIG = getEnvironmentConfig();
