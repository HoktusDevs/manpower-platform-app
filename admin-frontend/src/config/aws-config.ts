/**
 * AWS Configuration
 * Contains all AWS service configurations including Cognito, AppSync GraphQL API, and region settings
 */

export const AWS_CONFIG = {
  // AWS Region
  region: 'us-east-1',

  // Cognito Configuration - from CDK deployment outputs
  cognito: {
    userPoolId: 'us-east-1_kQKPPUqRO',
    userPoolClientId: '37t0pkhu9kdrf01lqqoj0e911f',
    identityPoolId: 'us-east-1:4edccb12-4f72-44ab-9da8-087f9cb5cda2',
    domain: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_kQKPPUqRO'
  },

  // AppSync GraphQL API Configuration - from CDK deployment outputs
  graphql: {
    endpoint: 'https://2izcmxcbajbxjhmqqhhi4b5rgu.appsync-api.us-east-1.amazonaws.com/graphql',
    region: 'us-east-1',
    authenticationType: 'AMAZON_COGNITO_USER_POOLS'
  }
} as const;

// Environment-specific overrides
export const getAWSConfig = () => {
  const environment = import.meta.env.MODE || 'development';

  switch (environment) {
    case 'production':
      return {
        ...AWS_CONFIG,
        cognito: {
          ...AWS_CONFIG.cognito,
          // Production Cognito would be different if deployed separately
        }
      };
    case 'development':
    default:
      return AWS_CONFIG;
  }
};

// Amplify configuration format
export const AMPLIFY_CONFIG = {
  Auth: {
    Cognito: {
      userPoolId: AWS_CONFIG.cognito.userPoolId,
      userPoolClientId: AWS_CONFIG.cognito.userPoolClientId,
      identityPoolId: AWS_CONFIG.cognito.identityPoolId,
      loginWith: {
        email: true,
        username: false,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true,
        },
        given_name: {
          required: false,
        },
        family_name: {
          required: false,
        },
        phone_number: {
          required: false,
        },
        address: {
          required: false,
        },
        birthdate: {
          required: false,
        },
        // Custom attributes
        'custom:role': {
          required: true,
        },
        'custom:rut': {
          required: false,
        },
        'custom:education_level': {
          required: false,
        },
        'custom:work_experience': {
          required: false,
        },
        'custom:skills': {
          required: false,
        },
      },
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
    },
  },
  API: {
    GraphQL: {
      endpoint: AWS_CONFIG.graphql.endpoint,
      region: AWS_CONFIG.region,
      defaultAuthMode: 'userPool',
    },
  },
};