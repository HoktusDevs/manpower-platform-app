import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class ApiDiscoveryStack extends cdk.Stack {
  public readonly discoveryFunction: lambda.Function;
  public readonly apiGateway: apigateway.RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda role for discovery function
    const discoveryRole = new iam.Role(this, 'DiscoveryLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });

    // Discovery Lambda function
    this.discoveryFunction = new lambda.Function(this, 'ApiDiscoveryFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../../backend/dist'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      role: discoveryRole,
      environment: {
        NODE_ENV: 'production'
      }
    });

    // API Gateway for discovery endpoints
    this.apiGateway = new apigateway.RestApi(this, 'ApiDiscoveryGateway', {
      restApiName: 'Manpower API Discovery',
      description: 'API Discovery service for dynamic frontend configuration',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: cdk.Duration.hours(1)
      }
    });

    // Discovery endpoints
    const discoveryResource = this.apiGateway.root.addResource('api');
    const configResource = discoveryResource.addResource('config');
    const endpointsResource = discoveryResource.addResource('endpoints');
    const schemasResource = discoveryResource.addResource('schemas');

    // Add methods with Lambda integration
    const discoveryIntegration = new apigateway.LambdaIntegration(this.discoveryFunction);
    
    configResource.addMethod('GET', discoveryIntegration);
    endpointsResource.addMethod('GET', discoveryIntegration);
    schemasResource.addMethod('GET', discoveryIntegration);
    schemasResource.addResource('{entityName}').addMethod('GET', discoveryIntegration);

    // Health check endpoint
    const healthResource = this.apiGateway.root.addResource('health');
    healthResource.addMethod('GET', discoveryIntegration);

    // Outputs
    new cdk.CfnOutput(this, 'DiscoveryApiUrl', {
      value: this.apiGateway.url,
      exportName: 'ManpowerDiscoveryApiUrl'
    });

    new cdk.CfnOutput(this, 'ConfigEndpoint', {
      value: `${this.apiGateway.url}api/config`,
      exportName: 'ManpowerConfigEndpoint'
    });
  }
}