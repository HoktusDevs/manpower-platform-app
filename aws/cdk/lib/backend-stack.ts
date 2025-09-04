import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface BackendStackProps extends cdk.StackProps {
  dynamoTables: { [key: string]: dynamodb.Table };
  storageBucket: s3.Bucket;
  discoveryApiUrl?: string;
}

export class BackendStack extends cdk.Stack {
  public readonly apiGateway: apigateway.RestApi;
  public readonly lambdaFunctions: { [key: string]: lambda.Function } = {};

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // Common Lambda execution role
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:BatchGetItem',
                'dynamodb:BatchWriteItem'
              ],
              resources: Object.values(props.dynamoTables).map(table => table.tableArn)
            })
          ]
        }),
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket'
              ],
              resources: [
                props.storageBucket.bucketArn,
                `${props.storageBucket.bucketArn}/*`
              ]
            })
          ]
        })
      }
    });

    // Environment variables for Lambda functions
    const commonEnvVars = {
      USERS_TABLE: props.dynamoTables.users.tableName,
      FILES_TABLE: props.dynamoTables.files.tableName,
      SESSIONS_TABLE: props.dynamoTables.sessions.tableName,
      FILES_BUCKET: props.storageBucket.bucketName,
      DISCOVERY_API_URL: props.discoveryApiUrl || '',
      NODE_ENV: 'production'
    };

    // Auth Lambda function
    this.lambdaFunctions.auth = new lambda.Function(this, 'AuthFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../../backend/dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      role: lambdaRole,
      environment: commonEnvVars,
      reservedConcurrentExecutions: 50
    });

    // Files Lambda function (optimized for high throughput)
    this.lambdaFunctions.files = new lambda.Function(this, 'FilesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../../backend/dist'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      role: lambdaRole,
      environment: commonEnvVars,
      reservedConcurrentExecutions: 100
    });

    // Users Lambda function
    this.lambdaFunctions.users = new lambda.Function(this, 'UsersFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../../backend/dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      role: lambdaRole,
      environment: commonEnvVars,
      reservedConcurrentExecutions: 50
    });

    // API Gateway with throttling for high load
    this.apiGateway = new apigateway.RestApi(this, 'ManpowerAPI', {
      restApiName: 'Manpower Platform API',
      description: 'API Gateway for Manpower Platform',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization']
      }
    });

    // API Gateway endpoints
    const authResource = this.apiGateway.root.addResource('auth');
    authResource.addMethod('ANY', new apigateway.LambdaIntegration(this.lambdaFunctions.auth));

    const filesResource = this.apiGateway.root.addResource('files');
    filesResource.addMethod('ANY', new apigateway.LambdaIntegration(this.lambdaFunctions.files));
    const fileProxyResource = filesResource.addResource('{proxy+}');
    fileProxyResource.addMethod('ANY', new apigateway.LambdaIntegration(this.lambdaFunctions.files));

    const usersResource = this.apiGateway.root.addResource('users');
    usersResource.addMethod('ANY', new apigateway.LambdaIntegration(this.lambdaFunctions.users));
    const userProxyResource = usersResource.addResource('{proxy+}');
    userProxyResource.addMethod('ANY', new apigateway.LambdaIntegration(this.lambdaFunctions.users));

    // Outputs
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.apiGateway.url,
      exportName: 'ManpowerApiGatewayUrl'
    });
  }
}