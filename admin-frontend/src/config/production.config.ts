/**
 * Production Configuration for Admin Frontend
 * This configuration is used when deployed to S3/CloudFront
 */

export const PRODUCTION_CONFIG = {
  // API Endpoints - Production URLs
  api: {
    baseUrl: 'https://api.manpower-platform.com',
    endpoints: {
      auth: 'https://7pptifb3zk.execute-api.us-east-1.amazonaws.com/dev',
      applications: 'https://8lmunkvdd5.execute-api.us-east-1.amazonaws.com/dev',
      jobs: 'https://pa3itplx4f.execute-api.us-east-1.amazonaws.com/dev',
      folders: 'https://83upriwf35.execute-api.us-east-1.amazonaws.com/dev',
      files: 'https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev',
      ocr: 'https://xtspcl5cj6.execute-api.us-east-1.amazonaws.com/dev',
      whatsapp: 'https://whatsapp-service-url.execute-api.us-east-1.amazonaws.com/dev',
      config: 'https://config-service-url.execute-api.us-east-1.amazonaws.com/dev'
    }
  },

  // AWS Configuration
  aws: {
    region: 'us-east-1',
    cognito: {
      userPoolId: 'us-east-1_kQKPPUqRO',
      userPoolClientId: '37t0pkhu9kdrf01lqqoj0e911f',
      identityPoolId: 'us-east-1:4edccb12-4f72-44ab-9da8-087f9cb5cda2'
    },
    graphql: {
      endpoint: 'https://2izcmxcbajbxjhmqqhhi4b5rgu.appsync-api.us-east-1.amazonaws.com/graphql',
      region: 'us-east-1'
    }
  },

  // Frontend URLs for redirects
  frontend: {
    auth: 'https://auth.manpower-platform.com',
    applicant: 'https://applicant.manpower-platform.com',
    admin: 'https://admin.manpower-platform.com'
  },

  // Environment
  environment: 'production',
  
  // Feature flags
  features: {
    analytics: true,
    errorReporting: true,
    performanceMonitoring: true
  }
};

// Export default configuration
export default PRODUCTION_CONFIG;
