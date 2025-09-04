import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface AuthServiceStackProps extends cdk.StackProps {
  environment?: 'dev' | 'prod';
}

export class AuthServiceStack extends cdk.Stack {
  public readonly authFunction: lambda.Function;
  public readonly authApi: apigateway.RestApi;
  public readonly usersTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: AuthServiceStackProps = {}) {
    super(scope, id, props);

    const environment = props.environment || 'dev';

    // DynamoDB table for users (dedicated to auth service)
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `manpower-auth-users-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      

      // Tags for cost allocation (removed - use cdk.Tags.of() instead)
    });

    // IAM role for Auth Lambda function
    const authLambdaRole = new iam.Role(this, 'AuthLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for Auth Service Lambda function',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        AuthServicePolicy: new iam.PolicyDocument({
          statements: [
            // DynamoDB permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:Query',
                'dynamodb:Scan'
              ],
              resources: [
                this.usersTable.tableArn,
                `${this.usersTable.tableArn}/index/*`
              ]
            }),
            // Secrets Manager permissions for JWT secrets
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue'
              ],
              resources: [
                `arn:aws:secretsmanager:${this.region}:${this.account}:secret:manpower-jwt-secret-*`
              ]
            }),
            // CloudWatch Logs permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
              ],
              resources: [
                `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/auth-service-*`
              ]
            })
          ]
        })
      }
    });

    // Auth Service Lambda function
    this.authFunction = new lambda.Function(this, 'AuthFunction', {
      functionName: `auth-service-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../../backend/services/auth-service/dist'),
      role: authLambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      
      // Environment variables
      environment: {
        NODE_ENV: environment,
        USERS_TABLE: this.usersTable.tableName,
        JWT_SECRET_ARN: `arn:aws:secretsmanager:${this.region}:${this.account}:secret:manpower-jwt-secret`,
        FRONTEND_URL: process.env.FRONTEND_URL || '*'
      },

      // Logging configuration
      logRetention: environment === 'prod' 
        ? logs.RetentionDays.ONE_MONTH 
        : logs.RetentionDays.ONE_WEEK,

      // Tags (removed - use cdk.Tags.of() instead)
    });

    // API Gateway for Auth Service
    this.authApi = new apigateway.RestApi(this, 'AuthApi', {
      restApiName: `Auth Service API - ${environment}`,
      description: `Authentication microservice API for Manpower Platform (${environment})`,
      
      // CORS configuration
      defaultCorsPreflightOptions: {
        allowOrigins: environment === 'prod' 
          ? [process.env.FRONTEND_URL || 'https://app.manpower.com']
          : apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        allowCredentials: true
      },

      // API Gateway configuration
      deployOptions: {
        stageName: environment,
        description: `${environment} stage for Auth Service`,
        

        // Logging
        accessLogDestination: new apigateway.LogGroupLogDestination(
          new logs.LogGroup(this, 'AuthApiAccessLogs', {
            logGroupName: `/aws/apigateway/auth-service-${environment}`,
            retention: environment === 'prod' 
              ? logs.RetentionDays.ONE_MONTH 
              : logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY
          })
        ),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),

        // Metrics
        metricsEnabled: true,
        dataTraceEnabled: environment !== 'prod' // Only in dev for debugging
      },

      // Tags (removed - use cdk.Tags.of() instead)
    });

    // Lambda integration
    const authIntegration = new apigateway.LambdaIntegration(this.authFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      proxy: true
    });

    // API Gateway routes
    const authResource = this.authApi.root.addResource('auth');
    
    // Auth endpoints
    const registerResource = authResource.addResource('register');
    registerResource.addMethod('POST', authIntegration);

    const loginResource = authResource.addResource('login');
    loginResource.addMethod('POST', authIntegration);

    const healthResource = authResource.addResource('health');
    healthResource.addMethod('GET', authIntegration);

    // Root health check
    this.authApi.root.addMethod('GET', authIntegration);

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'AuthApiUrl', {
      value: this.authApi.url,
      description: 'Auth Service API Gateway URL',
      exportName: `AuthServiceApiUrl-${environment}`
    });

    new cdk.CfnOutput(this, 'AuthFunctionName', {
      value: this.authFunction.functionName,
      description: 'Auth Service Lambda Function Name',
      exportName: `AuthServiceFunctionName-${environment}`
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
      description: 'Auth Service Users Table Name',
      exportName: `AuthServiceUsersTable-${environment}`
    });

    new cdk.CfnOutput(this, 'AuthServiceEndpoints', {
      value: JSON.stringify({
        register: `${this.authApi.url}auth/register`,
        login: `${this.authApi.url}auth/login`,
        health: `${this.authApi.url}auth/health`
      }),
      description: 'Auth Service API Endpoints',
      exportName: `AuthServiceEndpoints-${environment}`
    });
  }
}