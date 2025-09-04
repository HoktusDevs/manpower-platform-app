import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface DataStackProps extends cdk.StackProps {
  environment?: 'dev' | 'prod';
  userPool: cognito.UserPool;
  identityPool: cognito.CfnIdentityPool;
}

export class DataStack extends cdk.Stack {
  public readonly applicationsTable: dynamodb.Table;
  public readonly documentsTable: dynamodb.Table;
  public readonly graphqlApi: appsync.GraphqlApi;
  public readonly graphqlUrl: string;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const environment = props.environment || 'dev';

    // APPLICATIONS TABLE - Optimized for direct access
    this.applicationsTable = new dynamodb.Table(this, 'ApplicationsTable', {
      tableName: `manpower-applications-${environment}`,
      partitionKey: { 
        name: 'userId', 
        type: dynamodb.AttributeType.STRING 
      },
      sortKey: { 
        name: 'applicationId', 
        type: dynamodb.AttributeType.STRING 
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      
      // Enable point-in-time recovery
      pointInTimeRecovery: environment === 'prod',
      
      // Encryption
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      
      // Removal policy
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,

      // Enable streaming for real-time updates
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // Add GSI for status queries (admin)
    this.applicationsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Add GSI for company queries
    this.applicationsTable.addGlobalSecondaryIndex({
      indexName: 'CompanyIndex',
      partitionKey: { name: 'companyId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // DOCUMENTS TABLE - For file metadata
    this.documentsTable = new dynamodb.Table(this, 'DocumentsTable', {
      tableName: `manpower-documents-${environment}`,
      partitionKey: { 
        name: 'userId', 
        type: dynamodb.AttributeType.STRING 
      },
      sortKey: { 
        name: 'documentId', 
        type: dynamodb.AttributeType.STRING 
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,

      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for document type queries
    this.documentsTable.addGlobalSecondaryIndex({
      indexName: 'TypeIndex',
      partitionKey: { name: 'documentType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uploadedAt', type: dynamodb.AttributeType.STRING },
    });

    // APPSYNC GRAPHQL API - AWS Native data access
    this.graphqlApi = new appsync.GraphqlApi(this, 'ManpowerGraphQL', {
      name: `manpower-api-${environment}`,
      
      // GraphQL Schema
      schema: appsync.SchemaFile.fromAsset('./graphql/schema.graphql'),
      
      // Multiple auth methods
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.userPool,
            defaultAction: appsync.UserPoolDefaultAction.ALLOW,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.IAM,
          },
        ],
      },

      // Enable logging
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ERROR,
        excludeVerboseContent: false,
      },

      // Enable X-Ray tracing
      xrayEnabled: true,
    });

    // DATA SOURCES - Direct DynamoDB connections
    const applicationsDataSource = this.graphqlApi.addDynamoDbDataSource(
      'ApplicationsDataSource',
      this.applicationsTable
    );

    const documentsDataSource = this.graphqlApi.addDynamoDbDataSource(
      'DocumentsDataSource', 
      this.documentsTable
    );

    // RESOLVERS - No Lambda needed!

    // Query: Get applications for current user
    applicationsDataSource.createResolver('GetMyApplicationsResolver', {
      typeName: 'Query',
      fieldName: 'getMyApplications',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version" : "2017-02-28",
          "operation" : "Query",
          "query" : {
            "expression": "userId = :userId",
            "expressionValues" : {
              ":userId" : $util.dynamodb.toDynamoDBJson($ctx.identity.sub)
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result.items)
      `),
    });

    // Query: Get all applications (admin only)
    applicationsDataSource.createResolver('GetAllApplicationsResolver', {
      typeName: 'Query',
      fieldName: 'getAllApplications',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #if($ctx.identity.claims.get("custom:role") != "admin")
          $util.unauthorized()
        #end
        {
          "version" : "2017-02-28",
          "operation" : "Scan"
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result.items)
      `),
    });

    // Mutation: Create application
    applicationsDataSource.createResolver('CreateApplicationResolver', {
      typeName: 'Mutation',
      fieldName: 'createApplication',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version" : "2017-02-28",
          "operation" : "PutItem",
          "key" : {
            "userId" : $util.dynamodb.toDynamoDBJson($ctx.identity.sub),
            "applicationId" : $util.dynamodb.toDynamoDBJson($util.autoId())
          },
          "attributeValues" : {
            "companyName" : $util.dynamodb.toDynamoDBJson($ctx.args.input.companyName),
            "position" : $util.dynamodb.toDynamoDBJson($ctx.args.input.position),
            "status" : $util.dynamodb.toDynamoDBJson("pending"),
            "createdAt" : $util.dynamodb.toDynamoDBJson($util.time.nowISO8601()),
            "updatedAt" : $util.dynamodb.toDynamoDBJson($util.time.nowISO8601())
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result)
      `),
    });

    // COGNITO IDENTITY POOL ROLES - Direct DynamoDB access
    const authenticatedRole = new iam.Role(this, 'AuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
        'StringEquals': {
          'cognito-identity.amazonaws.com:aud': props.identityPool.ref,
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'authenticated',
        },
      }),
      description: 'Role for authenticated users with direct DynamoDB access',
    });

    // POSTULANTE PERMISSIONS - Restrictive
    const postulantePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Query',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem'
      ],
      resources: [
        this.applicationsTable.tableArn,
        `${this.applicationsTable.tableArn}/*`,
        this.documentsTable.tableArn,
        `${this.documentsTable.tableArn}/*`
      ],
      conditions: {
        'ForAllValues:StringEquals': {
          'dynamodb:LeadingKeys': ['${cognito-identity.amazonaws.com:sub}']
        }
      }
    });

    // ADMIN PERMISSIONS - Full access
    const adminPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:*',
      ],
      resources: [
        this.applicationsTable.tableArn,
        `${this.applicationsTable.tableArn}/*`, 
        this.documentsTable.tableArn,
        `${this.documentsTable.tableArn}/*`
      ]
    });

    // Apply policies based on role
    authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['appsync:GraphQL'],
      resources: [`${this.graphqlApi.arn}/*`]
    }));

    // Store GraphQL URL for frontend
    this.graphqlUrl = this.graphqlApi.graphqlUrl;

    // OUTPUTS
    new cdk.CfnOutput(this, 'GraphQLURL', {
      value: this.graphqlApi.graphqlUrl,
      description: 'GraphQL API URL for direct frontend access',
      exportName: `ManpowerGraphQLURL-${environment}`
    });

    new cdk.CfnOutput(this, 'GraphQLAPIId', {
      value: this.graphqlApi.apiId,
      description: 'GraphQL API ID',
      exportName: `ManpowerGraphQLAPIId-${environment}`
    });

    new cdk.CfnOutput(this, 'ApplicationsTableName', {
      value: this.applicationsTable.tableName,
      description: 'Applications DynamoDB Table Name',
      exportName: `ManpowerApplicationsTable-${environment}`
    });

    new cdk.CfnOutput(this, 'DocumentsTableName', {
      value: this.documentsTable.tableName,
      description: 'Documents DynamoDB Table Name', 
      exportName: `ManpowerDocumentsTable-${environment}`
    });
  }
}