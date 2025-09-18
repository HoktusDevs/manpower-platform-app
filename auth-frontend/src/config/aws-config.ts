export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env['VITE_USER_POOL_ID'] || 'us-east-1_example',
      userPoolClientId: import.meta.env['VITE_USER_POOL_CLIENT_ID'] || 'example-client-id',
      identityPoolId: import.meta.env['VITE_IDENTITY_POOL_ID'] || 'us-east-1:example-identity-pool',
      region: import.meta.env['VITE_AWS_REGION'] || 'us-east-1',
      signUpVerificationMethod: 'code' as const,
      loginWith: {
        email: true,
        phone: false,
        username: false,
      },
    },
  },
  API: {
    GraphQL: {
      endpoint: import.meta.env['VITE_GRAPHQL_ENDPOINT'] || 'https://example.appsync-api.us-east-1.amazonaws.com/graphql',
      region: import.meta.env['VITE_AWS_REGION'] || 'us-east-1',
      defaultAuthMode: 'userPool' as const,
    },
  },
  Storage: {
    S3: {
      bucket: import.meta.env['VITE_S3_BUCKET'] || 'example-bucket',
      region: import.meta.env['VITE_AWS_REGION'] || 'us-east-1',
    },
  },
};