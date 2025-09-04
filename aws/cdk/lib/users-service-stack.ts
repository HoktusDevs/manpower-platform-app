import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface UsersServiceStackProps extends cdk.StackProps {
  environment?: 'dev' | 'prod';
  authApiUrl?: string;
}

export class UsersServiceStack extends cdk.Stack {
  public readonly usersFunction: lambda.Function;
  public readonly usersApi: apigateway.RestApi;
  public readonly userProfilesTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: UsersServiceStackProps = {}) {
    super(scope, id, props);

    const environment = props.environment || 'dev';

    // DynamoDB table for user profiles (separate from auth)
    this.userProfilesTable = new dynamodb.Table(this, 'UserProfilesTable', {
      tableName: `manpower-user-profiles-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // IAM role for Users Lambda function
    const usersLambdaRole = new iam.Role(this, 'UsersLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for Users Service Lambda function',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        UsersServicePolicy: new iam.PolicyDocument({
          statements: [
            // DynamoDB permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
              ],
              resources: [
                this.userProfilesTable.tableArn,
                `${this.userProfilesTable.tableArn}/index/*`
              ]
            })
          ]
        })
      }
    });

    // Users Service Lambda function (placeholder for now)
    this.usersFunction = new lambda.Function(this, 'UsersFunction', {
      functionName: `users-service-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      // Will be updated when we create the users-service
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Users Service - Event:', JSON.stringify(event, null, 2));
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify({
              success: true,
              message: 'Users Service is running',
              service: 'users-service',
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              path: event.path,
              method: event.httpMethod
            })
          };
        };
      `),
      role: usersLambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      reservedConcurrentExecutions: environment === 'prod' ? 50 : 5,
      
      environment: {
        NODE_ENV: environment,
        USER_PROFILES_TABLE: this.userProfilesTable.tableName,
        AUTH_API_URL: props.authApiUrl || '',
        AWS_REGION: this.region
      },

      logRetention: environment === 'prod' 
        ? logs.RetentionDays.ONE_MONTH 
        : logs.RetentionDays.ONE_WEEK
    });

    // API Gateway for Users Service
    this.usersApi = new apigateway.RestApi(this, 'UsersApi', {
      restApiName: `Users Service API - ${environment}`,
      description: `User management microservice API for Manpower Platform (${environment})`,
      
      defaultCorsPreflightOptions: {
        allowOrigins: environment === 'prod' 
          ? [process.env.FRONTEND_URL || 'https://app.manpower.com']
          : apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        allowCredentials: true
      },

      deployOptions: {
        stageName: environment,
        description: `${environment} stage for Users Service`,
        metricsEnabled: true,
        dataTraceEnabled: environment !== 'prod'
      }
    });

    // Lambda integration
    const usersIntegration = new apigateway.LambdaIntegration(this.usersFunction, {
      proxy: true
    });

    // API Gateway routes
    const usersResource = this.usersApi.root.addResource('users');
    
    // Users endpoints
    usersResource.addMethod('GET', usersIntegration);    // List users
    usersResource.addMethod('POST', usersIntegration);   // Create user profile
    usersResource.addMethod('OPTIONS', usersIntegration);

    const userByIdResource = usersResource.addResource('{userId}');
    userByIdResource.addMethod('GET', usersIntegration);    // Get user by ID
    userByIdResource.addMethod('PUT', usersIntegration);    // Update user
    userByIdResource.addMethod('DELETE', usersIntegration); // Delete user
    userByIdResource.addMethod('OPTIONS', usersIntegration);

    // Health check
    const healthResource = usersResource.addResource('health');
    healthResource.addMethod('GET', usersIntegration);

    // Root health check
    this.usersApi.root.addMethod('GET', usersIntegration);

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'UsersApiUrl', {
      value: this.usersApi.url,
      description: 'Users Service API Gateway URL',
      exportName: `UsersServiceApiUrl-${environment}`
    });

    new cdk.CfnOutput(this, 'UsersFunctionName', {
      value: this.usersFunction.functionName,
      description: 'Users Service Lambda Function Name',
      exportName: `UsersServiceFunctionName-${environment}`
    });

    new cdk.CfnOutput(this, 'UserProfilesTableName', {
      value: this.userProfilesTable.tableName,
      description: 'Users Service Profiles Table Name',
      exportName: `UsersServiceProfilesTable-${environment}`
    });
  }
}