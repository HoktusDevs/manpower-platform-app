import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface JobsServiceStackProps extends cdk.StackProps {
  environment?: 'dev' | 'prod';
}

export class JobsServiceStack extends cdk.Stack {
  public readonly jobsFunction: lambda.Function;
  public readonly jobsApi: apigateway.RestApi;
  public readonly jobPostingsTable: dynamodb.Table;
  public readonly applicationsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: JobsServiceStackProps = {}) {
    super(scope, id, props);

    const environment = props.environment || 'dev';

    // DynamoDB table for job postings
    this.jobPostingsTable = new dynamodb.Table(this, 'JobPostingsTable', {
      tableName: `manpower-job-postings-${environment}`,
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // DynamoDB table for job applications
    this.applicationsTable = new dynamodb.Table(this, 'ApplicationsTable', {
      tableName: `manpower-applications-${environment}`,
      partitionKey: { name: 'applicationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // IAM role for Jobs Lambda function
    const jobsLambdaRole = new iam.Role(this, 'JobsLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for Jobs Service Lambda function',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        JobsServicePolicy: new iam.PolicyDocument({
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
                'dynamodb:Scan',
                'dynamodb:BatchGetItem',
                'dynamodb:BatchWriteItem'
              ],
              resources: [
                this.jobPostingsTable.tableArn,
                `${this.jobPostingsTable.tableArn}/index/*`,
                this.applicationsTable.tableArn,
                `${this.applicationsTable.tableArn}/index/*`
              ]
            })
          ]
        })
      }
    });

    // Jobs Service Lambda function (placeholder for now)
    this.jobsFunction = new lambda.Function(this, 'JobsFunction', {
      functionName: `jobs-service-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      // Will be updated when we create the jobs-service
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Jobs Service - Event:', JSON.stringify(event, null, 2));
          
          const path = event.path;
          const method = event.httpMethod;
          
          // Mock job data
          const mockJobs = [
            {
              jobId: 'job-001',
              title: 'Desarrollador Frontend',
              description: 'React, TypeScript, TailwindCSS',
              category: 'desarrollo',
              status: 'active',
              location: 'Remote',
              salary: '$50,000 - $70,000',
              createdAt: '2024-01-01T00:00:00Z'
            },
            {
              jobId: 'job-002', 
              title: 'Diseñador UX/UI',
              description: 'Figma, Adobe XD, Prototipado',
              category: 'design',
              status: 'active',
              location: 'Santiago',
              salary: '$40,000 - $60,000',
              createdAt: '2024-01-02T00:00:00Z'
            }
          ];
          
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
              message: 'Jobs Service is running',
              service: 'jobs-service',
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              path: path,
              method: method,
              data: path.includes('/jobs') && method === 'GET' ? mockJobs : undefined
            })
          };
        };
      `),
      role: jobsLambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      reservedConcurrentExecutions: environment === 'prod' ? 50 : 5,
      
      environment: {
        NODE_ENV: environment,
        JOB_POSTINGS_TABLE: this.jobPostingsTable.tableName,
        APPLICATIONS_TABLE: this.applicationsTable.tableName,
        AWS_REGION: this.region
      },

      logRetention: environment === 'prod' 
        ? logs.RetentionDays.ONE_MONTH 
        : logs.RetentionDays.ONE_WEEK
    });

    // API Gateway for Jobs Service
    this.jobsApi = new apigateway.RestApi(this, 'JobsApi', {
      restApiName: `Jobs Service API - ${environment}`,
      description: `Job postings and applications microservice API for Manpower Platform (${environment})`,
      
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
        description: `${environment} stage for Jobs Service`,
        metricsEnabled: true,
        dataTraceEnabled: environment !== 'prod'
      }
    });

    // Lambda integration
    const jobsIntegration = new apigateway.LambdaIntegration(this.jobsFunction, {
      proxy: true
    });

    // API Gateway routes
    const jobsResource = this.jobsApi.root.addResource('jobs');
    
    // Job postings endpoints
    jobsResource.addMethod('GET', jobsIntegration);    // List jobs
    jobsResource.addMethod('POST', jobsIntegration);   // Create job
    jobsResource.addMethod('OPTIONS', jobsIntegration);

    const jobByIdResource = jobsResource.addResource('{jobId}');
    jobByIdResource.addMethod('GET', jobsIntegration);    // Get job by ID
    jobByIdResource.addMethod('PUT', jobsIntegration);    // Update job
    jobByIdResource.addMethod('DELETE', jobsIntegration); // Delete job
    jobByIdResource.addMethod('OPTIONS', jobsIntegration);

    // Applications endpoints
    const applicationsResource = this.jobsApi.root.addResource('applications');
    applicationsResource.addMethod('GET', jobsIntegration);    // List applications
    applicationsResource.addMethod('POST', jobsIntegration);   // Submit application
    applicationsResource.addMethod('OPTIONS', jobsIntegration);

    const applicationByIdResource = applicationsResource.addResource('{applicationId}');
    applicationByIdResource.addMethod('GET', jobsIntegration);    // Get application
    applicationByIdResource.addMethod('PUT', jobsIntegration);    // Update application status
    applicationByIdResource.addMethod('DELETE', jobsIntegration); // Withdraw application
    applicationByIdResource.addMethod('OPTIONS', jobsIntegration);

    // Health check
    const healthResource = jobsResource.addResource('health');
    healthResource.addMethod('GET', jobsIntegration);

    // Root health check
    this.jobsApi.root.addMethod('GET', jobsIntegration);

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'JobsApiUrl', {
      value: this.jobsApi.url,
      description: 'Jobs Service API Gateway URL',
      exportName: `JobsServiceApiUrl-${environment}`
    });

    new cdk.CfnOutput(this, 'JobsFunctionName', {
      value: this.jobsFunction.functionName,
      description: 'Jobs Service Lambda Function Name',
      exportName: `JobsServiceFunctionName-${environment}`
    });

    new cdk.CfnOutput(this, 'JobPostingsTableName', {
      value: this.jobPostingsTable.tableName,
      description: 'Jobs Service Job Postings Table Name',
      exportName: `JobsServiceJobPostingsTable-${environment}`
    });

    new cdk.CfnOutput(this, 'ApplicationsTableName', {
      value: this.applicationsTable.tableName,
      description: 'Jobs Service Applications Table Name',
      exportName: `JobsServiceApplicationsTable-${environment}`
    });
  }
}