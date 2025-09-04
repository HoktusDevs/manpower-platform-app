#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AuthServiceStack } from '../lib/auth-service-stack';
import { CognitoAuthStack } from '../lib/cognito-auth-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { DataStack } from '../lib/data-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
};

const environment = (process.env.ENVIRONMENT as 'dev' | 'prod') || 'dev';
const useCognito = process.env.USE_COGNITO === 'true';

console.log(`🚀 Deploying Manpower Platform - ${environment} environment`);
console.log(`🔐 Auth System: ${useCognito ? 'Cognito' : 'Custom Auth Service'}`);

// Choose auth system based on environment variable
if (useCognito) {
  // New Cognito-based auth
  const cognitoStack = new CognitoAuthStack(app, 'ManpowerCognitoAuth', { 
    env,
    environment
  });

  // AWS-Native Data Layer (NEW - Coexists with legacy)
  const dataStack = new DataStack(app, 'ManpowerDataStack', {
    env,
    environment,
    userPool: cognitoStack.userPool,
    identityPool: cognitoStack.identityPool
  });

  // Frontend stack with Cognito (no API Gateway needed for auth)
  const frontendStack = new FrontendStack(app, 'ManpowerPlatformFrontend', {
    env
    // No apiGateway - Cognito handles auth directly
  });

  // Export Cognito config for frontend (separate from data layer)
  new cdk.CfnOutput(cognitoStack, 'CognitoConfig', {
    value: JSON.stringify({
      userPoolId: cognitoStack.userPool.userPoolId,
      userPoolClientId: cognitoStack.userPoolClient.userPoolClientId,
      identityPoolId: cognitoStack.identityPool.ref,
      region: env.region
    }),
    description: 'Cognito configuration for frontend',
    exportName: `ManpowerCognitoConfig-${environment}`
  });

  // Export Data Layer config separately (no circular dependency)
  new cdk.CfnOutput(dataStack, 'DataLayerConfig', {
    value: JSON.stringify({
      graphqlUrl: dataStack.graphqlUrl,
      graphqlApiId: dataStack.graphqlApi.apiId,
      applicationsTable: dataStack.applicationsTable.tableName,
      documentsTable: dataStack.documentsTable.tableName,
      region: env.region
    }),
    description: 'AWS-Native Data Layer configuration',
    exportName: `ManpowerDataConfig-${environment}`
  });

  // Output deployment commands for S3/CloudFront
  new cdk.CfnOutput(frontendStack, 'DeploymentInstructions', {
    value: `Build: cd frontend && npm run build\nDeploy: aws s3 sync dist/ s3://${frontendStack.websiteBucket.bucketName} --delete\nInvalidate: aws cloudfront create-invalidation --distribution-id ${frontendStack.distribution.distributionId} --paths "/*"`,
    description: 'Commands to deploy frontend to S3/CloudFront',
    exportName: `ManpowerDeployCommands-${environment}`
  });

} else {
  // Current auth service (for backward compatibility)
  const authServiceStack = new AuthServiceStack(app, 'ManpowerAuthService', { 
    env,
    environment
  });

  // Frontend stack with current auth
  new FrontendStack(app, 'ManpowerPlatformFrontend', {
    env,
    apiGateway: authServiceStack.authApi
  });
}

// Add tags to all stacks
cdk.Tags.of(app).add('Project', 'ManpowerPlatform');
cdk.Tags.of(app).add('Architecture', 'Microservices');
cdk.Tags.of(app).add('Environment', environment);
cdk.Tags.of(app).add('AuthSystem', useCognito ? 'Cognito' : 'Custom');
cdk.Tags.of(app).add('ManagedBy', 'CDK');