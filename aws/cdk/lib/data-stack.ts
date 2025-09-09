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
  public readonly formsTable: dynamodb.Table;
  public readonly formSubmissionsTable: dynamodb.Table;
  public readonly jobPostingsTable: dynamodb.Table;
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

    // JOB POSTINGS TABLE - For job listings
    this.jobPostingsTable = new dynamodb.Table(this, 'JobPostingsTable', {
      tableName: `manpower-job-postings-${environment}`,
      partitionKey: { 
        name: 'jobId', 
        type: dynamodb.AttributeType.STRING 
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for active job postings
    this.jobPostingsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // FORMS TABLE - Dynamic form definitions
    this.formsTable = new dynamodb.Table(this, 'FormsTable', {
      tableName: `manpower-forms-${environment}`,
      partitionKey: { 
        name: 'formId', 
        type: dynamodb.AttributeType.STRING 
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for job-based form queries
    this.formsTable.addGlobalSecondaryIndex({
      indexName: 'JobFormsIndex',
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // FORM SUBMISSIONS TABLE - Postulante responses
    this.formSubmissionsTable = new dynamodb.Table(this, 'FormSubmissionsTable', {
      tableName: `manpower-form-submissions-${environment}`,
      partitionKey: { 
        name: 'submissionId', 
        type: dynamodb.AttributeType.STRING 
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES, // For notifications
    });

    // Add GSI for form submissions
    this.formSubmissionsTable.addGlobalSecondaryIndex({
      indexName: 'FormSubmissionsIndex',
      partitionKey: { name: 'formId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
    });

    // Add GSI for user submissions
    this.formSubmissionsTable.addGlobalSecondaryIndex({
      indexName: 'UserSubmissionsIndex',
      partitionKey: { name: 'applicantId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
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

    const formsDataSource = this.graphqlApi.addDynamoDbDataSource(
      'FormsDataSource',
      this.formsTable
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
        #if($ctx.identity.claims["custom:role"] != "admin")
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

    // FORMS RESOLVERS

    // Query: Get all forms (admin only)
    formsDataSource.createResolver('GetAllFormsResolver', {
      typeName: 'Query',
      fieldName: 'getAllForms',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version" : "2017-02-28",
          "operation" : "Scan"
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result.items)
      `),
    });

    // Mutation: Create form (admin only)
    formsDataSource.createResolver('CreateFormResolver', {
      typeName: 'Mutation',
      fieldName: 'createForm',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($formId = $util.autoId())
        #set($now = $util.time.nowISO8601())
        #set($fields = [])
        
        ## Process and validate fields
        #foreach($field in $ctx.args.input.fields)
          #set($fieldId = $util.autoId())
          #set($processedField = {
            "fieldId": $fieldId,
            "type": $field.type,
            "label": $field.label,
            "required": $field.required,
            "order": $field.order
          })
          
          ## Add optional field properties
          #if($field.placeholder) #set($processedField.placeholder = $field.placeholder) #end
          #if($field.options) #set($processedField.options = $field.options) #end
          #if($field.validation) #set($processedField.validation = $field.validation) #end
          #if($field.description) #set($processedField.description = $field.description) #end
          #if($field.defaultValue) #set($processedField.defaultValue = $field.defaultValue) #end
          
          #set($addResult = $fields.add($processedField))
        #end
        
        {
          "version": "2017-02-28",
          "operation": "PutItem",
          "key": {
            "formId": { "S": "$formId" }
          },
          "attributeValues": {
            "formId": { "S": "$formId" },
            "title": { "S": "$ctx.args.input.title" },
            "status": { "S": "DRAFT" },
            "fields": { "S": "$util.toJson($fields)" },
            "isRequired": { "BOOL": $ctx.args.input.isRequired },
            "createdAt": { "S": "$now" },
            "updatedAt": { "S": "$now" },
            "currentSubmissions": { "N": "0" }
            #if($ctx.args.input.description), "description": { "S": "$ctx.args.input.description" }#end
            #if($ctx.args.input.jobId), "jobId": { "S": "$ctx.args.input.jobId" }#end
            #if($ctx.args.input.expiresAt), "expiresAt": { "S": "$ctx.args.input.expiresAt" }#end
            #if($ctx.args.input.maxSubmissions), "maxSubmissions": { "N": "$ctx.args.input.maxSubmissions" }#end
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #if($ctx.result.fields)
          #set($parsedFields = $util.parseJson($ctx.result.fields))
          #set($ctx.result.fields = $parsedFields)
        #end
        $util.toJson($ctx.result)
      `),
    });

    // Mutation: Update form (admin only)
    formsDataSource.createResolver('UpdateFormResolver', {
      typeName: 'Mutation',
      fieldName: 'updateForm',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($now = $util.time.nowISO8601())
        #set($updateExpression = "SET updatedAt = :updatedAt")
        #set($expressionAttributeValues = { ":updatedAt": { "S": "$now" } })
        
        ## Build dynamic update expression
        #if($ctx.args.input.title)
          #set($updateExpression = "$updateExpression, title = :title")
          #set($expressionAttributeValues[":title"] = { "S": "$ctx.args.input.title" })
        #end
        
        #if($ctx.args.input.description)
          #set($updateExpression = "$updateExpression, description = :description")
          #set($expressionAttributeValues[":description"] = { "S": "$ctx.args.input.description" })
        #end
        
        #if($ctx.args.input.jobId)
          #set($updateExpression = "$updateExpression, jobId = :jobId")
          #set($expressionAttributeValues[":jobId"] = { "S": "$ctx.args.input.jobId" })
        #end
        
        #if($ctx.args.input.status)
          #set($updateExpression = "$updateExpression, #status = :status")
          #set($expressionAttributeValues[":status"] = { "S": "$ctx.args.input.status" })
        #end
        
        #if($ctx.args.input.isRequired != $util.isNull())
          #set($updateExpression = "$updateExpression, isRequired = :isRequired")
          #set($expressionAttributeValues[":isRequired"] = { "BOOL": $ctx.args.input.isRequired })
        #end
        
        #if($ctx.args.input.maxSubmissions)
          #set($updateExpression = "$updateExpression, maxSubmissions = :maxSubmissions")
          #set($expressionAttributeValues[":maxSubmissions"] = { "N": "$ctx.args.input.maxSubmissions" })
        #end
        
        #if($ctx.args.input.expiresAt)
          #set($updateExpression = "$updateExpression, expiresAt = :expiresAt")
          #set($expressionAttributeValues[":expiresAt"] = { "S": "$ctx.args.input.expiresAt" })
        #end
        
        ## Process fields if provided
        #if($ctx.args.input.fields)
          #set($fields = [])
          #foreach($field in $ctx.args.input.fields)
            #set($processedField = {})
            #if($field.fieldId)
              #set($processedField.fieldId = $field.fieldId)
            #else
              #set($processedField.fieldId = $util.autoId())
            #end
            #if($field.type) #set($processedField.type = $field.type) #end
            #if($field.label) #set($processedField.label = $field.label) #end
            #if($field.placeholder) #set($processedField.placeholder = $field.placeholder) #end
            #if($field.required != $util.isNull()) #set($processedField.required = $field.required) #end
            #if($field.options) #set($processedField.options = $field.options) #end
            #if($field.validation) #set($processedField.validation = $field.validation) #end
            #if($field.order) #set($processedField.order = $field.order) #end
            #if($field.description) #set($processedField.description = $field.description) #end
            #if($field.defaultValue) #set($processedField.defaultValue = $field.defaultValue) #end
            #set($addResult = $fields.add($processedField))
          #end
          #set($updateExpression = "$updateExpression, fields = :fields")
          #set($expressionAttributeValues[":fields"] = { "S": "$util.toJson($fields)" })
        #end
        
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "formId": { "S": "$ctx.args.input.formId" }
          },
          "update": {
            "expression": "$updateExpression",
            "expressionValues": $util.toJson($expressionAttributeValues)
            #if($ctx.args.input.status)
              ,"expressionNames": { "#status": "status" }
            #end
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #if($ctx.result.fields)
          #set($parsedFields = $util.parseJson($ctx.result.fields))
          #set($ctx.result.fields = $parsedFields)
        #end
        $util.toJson($ctx.result)
      `),
    });

    // Mutation: Delete form (admin only)
    formsDataSource.createResolver('DeleteFormResolver', {
      typeName: 'Mutation',
      fieldName: 'deleteForm',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "DeleteItem",
          "key": {
            "formId": { "S": "$ctx.args.formId" }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #if($ctx.result)
          true
        #else
          false
        #end
      `),
    });

    // Mutation: Publish form (admin only)
    formsDataSource.createResolver('PublishFormResolver', {
      typeName: 'Mutation',  
      fieldName: 'publishForm',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($now = $util.time.nowISO8601())
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "formId": { "S": "$ctx.args.formId" }
          },
          "update": {
            "expression": "SET #status = :status, updatedAt = :updatedAt",
            "expressionNames": {
              "#status": "status"
            },
            "expressionValues": {
              ":status": { "S": "PUBLISHED" },
              ":updatedAt": { "S": "$now" }
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #if($ctx.result.fields)
          #set($parsedFields = $util.parseJson($ctx.result.fields))
          #set($ctx.result.fields = $parsedFields)
        #end
        $util.toJson($ctx.result)
      `),
    });

    // Mutation: Pause form (admin only)
    formsDataSource.createResolver('PauseFormResolver', {
      typeName: 'Mutation',
      fieldName: 'pauseForm',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($now = $util.time.nowISO8601())
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "formId": { "S": "$ctx.args.formId" }
          },
          "update": {
            "expression": "SET #status = :status, updatedAt = :updatedAt",
            "expressionNames": {
              "#status": "status"
            },
            "expressionValues": {
              ":status": { "S": "PAUSED" },
              ":updatedAt": { "S": "$now" }
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #if($ctx.result.fields)
          #set($parsedFields = $util.parseJson($ctx.result.fields))
          #set($ctx.result.fields = $parsedFields)
        #end
        $util.toJson($ctx.result)
      `),
    });

    // IMPORTANT: The Identity Pool Role Attachment is handled in CognitoAuthStack
    // We DO NOT create another one here to avoid the "already exists" error
    // Instead, we create a managed policy that can be attached manually to the role
    
    // Grant DynamoDB permissions to authenticated Cognito users
    const dynamoDbDataAccessPolicy = new iam.ManagedPolicy(this, 'DynamoDbDataAccessPolicy', {
      managedPolicyName: `ManpowerDynamoDbAccess-${environment}`,
      description: 'Policy for DynamoDB access from Cognito authenticated users',
      statements: [
        // POSTULANTE PERMISSIONS - Restrictive access
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:GetItem',
            'dynamodb:Query',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:Scan' // Needed for active forms/jobs
          ],
          resources: [
            this.applicationsTable.tableArn,
            `${this.applicationsTable.tableArn}/*`,
            this.documentsTable.tableArn,
            `${this.documentsTable.tableArn}/*`,
            this.formsTable.tableArn,
            `${this.formsTable.tableArn}/*`,
            this.jobPostingsTable.tableArn,
            `${this.jobPostingsTable.tableArn}/*`,
            this.formSubmissionsTable.tableArn,
            `${this.formSubmissionsTable.tableArn}/*`
          ]
        }),
        // GraphQL permissions
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['appsync:GraphQL'],
          resources: [`${this.graphqlApi.arn}/*`]
        })
      ]
    });

    // Output the policy ARN so it can be attached to the Cognito role externally
    new cdk.CfnOutput(this, 'DataAccessPolicyArn', {
      value: dynamoDbDataAccessPolicy.managedPolicyArn,
      description: 'Managed Policy ARN for DynamoDB and GraphQL access',
      exportName: `ManpowerDataAccessPolicy-${environment}`
    });

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

    new cdk.CfnOutput(this, 'FormsTableName', {
      value: this.formsTable.tableName,
      description: 'Forms DynamoDB Table Name',
      exportName: `ManpowerFormsTable-${environment}`
    });

    new cdk.CfnOutput(this, 'FormSubmissionsTableName', {
      value: this.formSubmissionsTable.tableName,
      description: 'Form Submissions DynamoDB Table Name',
      exportName: `ManpowerFormSubmissionsTable-${environment}`
    });

    new cdk.CfnOutput(this, 'JobPostingsTableName', {
      value: this.jobPostingsTable.tableName,
      description: 'Job Postings DynamoDB Table Name',
      exportName: `ManpowerJobPostingsTable-${environment}`
    });
  }
}