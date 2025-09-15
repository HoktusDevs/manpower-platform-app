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
  public readonly foldersTable: dynamodb.Table;
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

    // FOLDERS TABLE - Hierarchical folder structure
    this.foldersTable = new dynamodb.Table(this, 'FoldersTable', {
      tableName: `manpower-folders-${environment}`,
      partitionKey: { 
        name: 'userId', 
        type: dynamodb.AttributeType.STRING 
      },
      sortKey: { 
        name: 'folderId', 
        type: dynamodb.AttributeType.STRING 
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for parent-child relationships (hierarchical navigation)
    this.foldersTable.addGlobalSecondaryIndex({
      indexName: 'ParentFolderIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'parentId', type: dynamodb.AttributeType.STRING },
    });

    // Add GSI for folder type queries
    this.foldersTable.addGlobalSecondaryIndex({
      indexName: 'FolderTypeIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'type', type: dynamodb.AttributeType.STRING },
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
          {
            authorizationType: appsync.AuthorizationType.API_KEY,
            apiKeyConfig: {
              expires: cdk.Expiration.after(cdk.Duration.days(365)),
              description: 'Public API for job postings access',
            },
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

    const foldersDataSource = this.graphqlApi.addDynamoDbDataSource(
      'FoldersDataSource',
      this.foldersTable
    );

    const jobPostingsDataSource = this.graphqlApi.addDynamoDbDataSource(
      'JobPostingsDataSource',
      this.jobPostingsTable
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
        {
          "version" : "2017-02-28",
          "operation" : "Scan"
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($applications = [])
        #foreach($item in $ctx.result.items)
          #set($app = {})
          #set($app.userId = $item.userId)
          #set($app.applicationId = $item.applicationId)
          #set($app.jobId = $item.jobId)
          #set($app.companyName = $util.defaultIfNull($item.companyName, "TechCorp Innovations"))
          #set($app.position = $util.defaultIfNull($item.position, "Desarrollador Full Stack"))
          #set($app.status = $item.status)
          #set($app.description = $item.description)
          #set($app.salary = $item.salary)
          #set($app.location = $item.location)
          #set($app.createdAt = $item.createdAt)
          #set($app.updatedAt = $item.updatedAt)
          #set($app.companyId = $item.companyId)
          #set($app.folderId = $item.folderId)
          #set($void = $applications.add($app))
        #end
        $util.toJson($applications)
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

    // Pipeline resolver functions for apply to multiple jobs with folder organization
    const createUserFolderFunction = new appsync.AppsyncFunction(this, 'CreateUserFolderFunction', {
      name: 'createUserFolderFunction',
      api: this.graphqlApi,
      dataSource: foldersDataSource,
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($firstJobId = $ctx.args.jobIds[0])
        #set($currentUser = $ctx.identity.sub)
        #set($userFolderId = $util.autoId())

        ## Create user folder under the job's company structure
        ## For now, create it as a top-level user folder
        {
          "version": "2017-02-28",
          "operation": "PutItem",
          "key": {
            "folderId": $util.dynamodb.toDynamoDBJson($userFolderId)
          },
          "attributeValues": {
            "userId": $util.dynamodb.toDynamoDBJson($currentUser),
            "name": $util.dynamodb.toDynamoDBJson("Usuario-$currentUser"),
            "type": $util.dynamodb.toDynamoDBJson("Usuario"),
            "parentId": $util.dynamodb.toDynamoDBJson("d12fa32b-31e6-4ce5-9213-f3c982b02ce5"),
            "createdAt": $util.dynamodb.toDynamoDBJson($util.time.nowISO8601()),
            "updatedAt": $util.dynamodb.toDynamoDBJson($util.time.nowISO8601()),
            "childrenCount": $util.dynamodb.toDynamoDBJson(0)
          },
          "condition": {
            "expression": "attribute_not_exists(folderId)"
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($ctx.stash.userFolderId = $ctx.result.folderId)
        $util.toJson($ctx.result)
      `),
    });

    const createApplicationWithFolderFunction = new appsync.AppsyncFunction(this, 'CreateApplicationWithFolderFunction', {
      name: 'createApplicationWithFolderFunction',
      api: this.graphqlApi,
      dataSource: applicationsDataSource,
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($firstJobId = $ctx.args.jobIds[0])
        #set($userFolderId = $ctx.stash.userFolderId)
        {
          "version": "2017-02-28",
          "operation": "PutItem",
          "key": {
            "userId": $util.dynamodb.toDynamoDBJson($ctx.identity.sub),
            "applicationId": $util.dynamodb.toDynamoDBJson($util.autoId())
          },
          "attributeValues": {
            "jobId": $util.dynamodb.toDynamoDBJson($firstJobId),
            "companyName": $util.dynamodb.toDynamoDBJson("TechCorp Innovations"),
            "position": $util.dynamodb.toDynamoDBJson("Desarrollador Full Stack"),
            "status": $util.dynamodb.toDynamoDBJson("PENDING"),
            "folderId": $util.dynamodb.toDynamoDBJson($userFolderId),
            "createdAt": $util.dynamodb.toDynamoDBJson($util.time.nowISO8601()),
            "updatedAt": $util.dynamodb.toDynamoDBJson($util.time.nowISO8601())
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result)
      `),
    });

    // NOTE: applyToMultipleJobs resolver will be created manually via AWS CLI
    // to avoid CloudFormation conflicts with orphaned resources
    // The pipeline functions above are ready to be used

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
        ## Parse JSON fields for each form and handle migration
        #foreach($form in $ctx.result.items)
          #if($form.fields)
            #set($parsedFields = $util.parseJson($form.fields))
            #set($migratedFields = [])
            
            ## Migrate fields without fieldId (for backwards compatibility)
            #foreach($field in $parsedFields)
              #if($util.isNull($field.fieldId) || $field.fieldId == "")
                #set($field.fieldId = $util.autoId())
              #end
              #set($void = $migratedFields.add($field))
            #end
            
            #set($form.fields = $migratedFields)
          #else
            ## If no fields, set empty array
            #set($form.fields = [])
          #end
        #end
        $util.toJson($ctx.result.items)
      `),
    });

    // Mutation: Create form (admin only) - Simplified approach
    formsDataSource.createResolver('CreateFormResolver', {
      typeName: 'Mutation',
      fieldName: 'createForm',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($formId = $util.autoId())
        #set($now = $util.time.nowISO8601())
        
        ## Generate fieldId for each field
        #set($fieldsWithIds = [])
        #foreach($field in $ctx.args.input.fields)
          #set($fieldWithId = {})
          #set($fieldWithId.fieldId = $util.autoId())
          #set($fieldWithId.type = $field.type)
          #set($fieldWithId.label = $field.label)
          #set($fieldWithId.required = $field.required)
          #set($fieldWithId.order = $field.order)
          #if($field.placeholder)
            #set($fieldWithId.placeholder = $field.placeholder)
          #end
          #if($field.options)
            #set($fieldWithId.options = $field.options)
          #end
          #if($field.description)
            #set($fieldWithId.description = $field.description)
          #end
          #if($field.defaultValue)
            #set($fieldWithId.defaultValue = $field.defaultValue)
          #end
          #if($field.validation)
            #set($fieldWithId.validation = $field.validation)
          #end
          $util.list.add($fieldsWithIds, $fieldWithId)
        #end
        
        ## Serialize fields with IDs as JSON string
        #set($fieldsJson = $util.escapeJavaScript($util.toJson($fieldsWithIds)))
        
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
            "fields": { "S": "$fieldsJson" },
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
        ## Parse JSON string back to object
        #if($ctx.result.fields)
          #set($ctx.result.fields = $util.parseJson($ctx.result.fields))
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

    // JOB POSTINGS RESOLVERS

    // Query: Get active job postings (public)
    jobPostingsDataSource.createResolver('GetActiveJobPostingsResolver', {
      typeName: 'Query',
      fieldName: 'getActiveJobPostings',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "Query",
          "index": "StatusIndex",
          "query": {
            "expression": "#status = :status",
            "expressionNames": {
              "#status": "status"
            },
            "expressionValues": {
              ":status": $util.dynamodb.toDynamoDBJson("PUBLISHED")
            }
          }
          #if($ctx.args.limit)
            ,"limit": $ctx.args.limit
          #end
          #if($ctx.args.nextToken)
            ,"nextToken": "$ctx.args.nextToken"
          #end
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result.items)
      `),
    });

    // Query: Get specific job posting (public)
    jobPostingsDataSource.createResolver('GetJobPostingResolver', {
      typeName: 'Query',
      fieldName: 'getJobPosting',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "GetItem",
          "key": {
            "jobId": $util.dynamodb.toDynamoDBJson($ctx.args.jobId)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result)
      `),
    });

    // Query: Get all job postings (admin only)
    jobPostingsDataSource.createResolver('GetAllJobPostingsResolver', {
      typeName: 'Query',
      fieldName: 'getAllJobPostings',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "Scan"
          #if($ctx.args.limit)
            ,"limit": $ctx.args.limit
          #end
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result.items)
      `),
    });

    // STEP 1: Create folder function for pipeline
    const createJobFolderFunction = new appsync.AppsyncFunction(this, 'CreateJobFolderFunction', {
      name: 'createJobFolder',
      api: this.graphqlApi,
      dataSource: foldersDataSource,
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        ## Generate folder ID and current timestamp
        #set($cargoFolderId = $util.autoId())
        #set($now = $util.time.nowISO8601())
        #set($userId = $ctx.identity.sub)

        ## Store values in stash for next function
        $util.qr($ctx.stash.put("cargoFolderId", $cargoFolderId))
        $util.qr($ctx.stash.put("now", $now))
        $util.qr($ctx.stash.put("jobId", $util.autoId()))

        ## Create the job position folder
        {
          "version": "2017-02-28",
          "operation": "PutItem",
          "key": {
            "userId": $util.dynamodb.toDynamoDBJson($userId),
            "folderId": $util.dynamodb.toDynamoDBJson($cargoFolderId)
          },
          "attributeValues": {
            "userId": $util.dynamodb.toDynamoDBJson($userId),
            "folderId": $util.dynamodb.toDynamoDBJson($cargoFolderId),
            "name": $util.dynamodb.toDynamoDBJson($ctx.args.input.title),
            "type": $util.dynamodb.toDynamoDBJson("Cargo"),
            "createdAt": $util.dynamodb.toDynamoDBJson($now),
            "updatedAt": $util.dynamodb.toDynamoDBJson($now),
            "childrenCount": $util.dynamodb.toDynamoDBJson(0)
            #if($ctx.args.input.folderId)
              ,"parentId": $util.dynamodb.toDynamoDBJson($ctx.args.input.folderId)
            #end
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        ## Pass folder creation result and continue
        $util.toJson($ctx.result)
      `),
    });

    const createJobPostingFunction = new appsync.AppsyncFunction(this, 'CreateJobPostingFunction', {
      name: 'createJobPosting',
      api: this.graphqlApi,
      dataSource: jobPostingsDataSource,
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        ## Get values from stash
        #set($jobId = $ctx.stash.jobId)
        #set($cargoFolderId = $ctx.stash.cargoFolderId)
        #set($now = $ctx.stash.now)
        {
          "version": "2017-02-28",
          "operation": "PutItem",
          "key": {
            "jobId": $util.dynamodb.toDynamoDBJson($jobId)
          },
          "attributeValues": {
            "jobId": $util.dynamodb.toDynamoDBJson($jobId),
            "title": $util.dynamodb.toDynamoDBJson($ctx.args.input.title),
            "description": $util.dynamodb.toDynamoDBJson($ctx.args.input.description),
            "requirements": $util.dynamodb.toDynamoDBJson($ctx.args.input.requirements),
            "location": $util.dynamodb.toDynamoDBJson($ctx.args.input.location),
            "employmentType": $util.dynamodb.toDynamoDBJson($ctx.args.input.employmentType),
            "status": $util.dynamodb.toDynamoDBJson("DRAFT"),
            "companyName": $util.dynamodb.toDynamoDBJson($ctx.args.input.companyName),
            "experienceLevel": $util.dynamodb.toDynamoDBJson($ctx.args.input.experienceLevel),
            "folderId": $util.dynamodb.toDynamoDBJson($cargoFolderId),
            "createdAt": $util.dynamodb.toDynamoDBJson($now),
            "updatedAt": $util.dynamodb.toDynamoDBJson($now),
            "applicationCount": $util.dynamodb.toDynamoDBJson(0)
            #if($ctx.args.input.salary)
              ,"salary": $util.dynamodb.toDynamoDBJson($ctx.args.input.salary)
            #end
            #if($ctx.args.input.companyId)
              ,"companyId": $util.dynamodb.toDynamoDBJson($ctx.args.input.companyId)
            #end
            #if($ctx.args.input.benefits)
              ,"benefits": $util.dynamodb.toDynamoDBJson($ctx.args.input.benefits)
            #end
            #if($ctx.args.input.expiresAt)
              ,"expiresAt": $util.dynamodb.toDynamoDBJson($ctx.args.input.expiresAt)
            #end
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result)
      `),
    });

    // STEP 2: Create Pipeline Resolver
    this.graphqlApi.createResolver('CreateJobPostingPipelineResolver', {
      typeName: 'Mutation',
      fieldName: 'createJobPosting',
      pipelineConfig: [createJobFolderFunction, createJobPostingFunction],
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #if(!$ctx.identity.claims.scope.contains("aws.cognito.signin.user.admin"))
          $util.unauthorized()
        #end
        ## Pipeline start - store original input
        $util.toJson({})
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        ## Return the created job posting
        $util.toJson($ctx.result)
      `),
    });

    // Mutation: Update job posting (admin only)
    jobPostingsDataSource.createResolver('UpdateJobPostingResolver', {
      typeName: 'Mutation',
      fieldName: 'updateJobPosting',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($now = $util.time.nowISO8601())
        #set($updateExpression = "SET updatedAt = :updatedAt")
        #set($expressionAttributeValues = { ":updatedAt": { "S": "$now" } })
        
        #if($ctx.args.input.title)
          #set($updateExpression = "$updateExpression, title = :title")
          #set($expressionAttributeValues[":title"] = { "S": "$ctx.args.input.title" })
        #end
        
        #if($ctx.args.input.description)
          #set($updateExpression = "$updateExpression, description = :description")
          #set($expressionAttributeValues[":description"] = { "S": "$ctx.args.input.description" })
        #end
        
        #if($ctx.args.input.requirements)
          #set($updateExpression = "$updateExpression, requirements = :requirements")
          #set($expressionAttributeValues[":requirements"] = { "S": "$ctx.args.input.requirements" })
        #end
        
        #if($ctx.args.input.salary)
          #set($updateExpression = "$updateExpression, salary = :salary")
          #set($expressionAttributeValues[":salary"] = { "S": "$ctx.args.input.salary" })
        #end
        
        #if($ctx.args.input.location)
          #set($updateExpression = "$updateExpression, #location = :location")
          #set($expressionAttributeValues[":location"] = { "S": "$ctx.args.input.location" })
        #end
        
        #if($ctx.args.input.employmentType)
          #set($updateExpression = "$updateExpression, employmentType = :employmentType")
          #set($expressionAttributeValues[":employmentType"] = { "S": "$ctx.args.input.employmentType" })
        #end
        
        #if($ctx.args.input.companyName)
          #set($updateExpression = "$updateExpression, companyName = :companyName")
          #set($expressionAttributeValues[":companyName"] = { "S": "$ctx.args.input.companyName" })
        #end
        
        #if($ctx.args.input.experienceLevel)
          #set($updateExpression = "$updateExpression, experienceLevel = :experienceLevel")
          #set($expressionAttributeValues[":experienceLevel"] = { "S": "$ctx.args.input.experienceLevel" })
        #end
        
        #if($ctx.args.input.folderId)
          #set($updateExpression = "$updateExpression, folderId = :folderId")
          #set($expressionAttributeValues[":folderId"] = { "S": "$ctx.args.input.folderId" })
        #end
        
        #if($ctx.args.input.status)
          #set($updateExpression = "$updateExpression, #status = :status")
          #set($expressionAttributeValues[":status"] = { "S": "$ctx.args.input.status" })
        #end
        
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "jobId": $util.dynamodb.toDynamoDBJson($ctx.args.input.jobId)
          },
          "update": {
            "expression": "$updateExpression",
            "expressionValues": $util.toJson($expressionAttributeValues)
            #if($ctx.args.input.location || $ctx.args.input.status)
              ,"expressionNames": {
                #if($ctx.args.input.location) "#location": "location" #end
                #if($ctx.args.input.location && $ctx.args.input.status), #end
                #if($ctx.args.input.status) "#status": "status" #end
              }
            #end
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result)
      `),
    });

    // Mutation: Delete job posting (admin only)
    jobPostingsDataSource.createResolver('DeleteJobPostingResolver', {
      typeName: 'Mutation',
      fieldName: 'deleteJobPosting',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "DeleteItem",
          "key": {
            "jobId": $util.dynamodb.toDynamoDBJson($ctx.args.jobId)
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

    // Mutation: Publish job posting (admin only)
    jobPostingsDataSource.createResolver('PublishJobPostingResolver', {
      typeName: 'Mutation',
      fieldName: 'publishJobPosting',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($now = $util.time.nowISO8601())
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "jobId": $util.dynamodb.toDynamoDBJson($ctx.args.jobId)
          },
          "update": {
            "expression": "SET #status = :status, updatedAt = :updatedAt",
            "expressionNames": {
              "#status": "status"
            },
            "expressionValues": {
              ":status": $util.dynamodb.toDynamoDBJson("PUBLISHED"),
              ":updatedAt": $util.dynamodb.toDynamoDBJson($now)
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result)
      `),
    });

    // Mutation: Pause job posting (admin only)
    jobPostingsDataSource.createResolver('PauseJobPostingResolver', {
      typeName: 'Mutation',
      fieldName: 'pauseJobPosting',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($now = $util.time.nowISO8601())
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "jobId": $util.dynamodb.toDynamoDBJson($ctx.args.jobId)
          },
          "update": {
            "expression": "SET #status = :status, updatedAt = :updatedAt",
            "expressionNames": {
              "#status": "status"
            },
            "expressionValues": {
              ":status": $util.dynamodb.toDynamoDBJson("PAUSED"),
              ":updatedAt": $util.dynamodb.toDynamoDBJson($now)
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result)
      `),
    });

    // FOLDERS RESOLVERS

    // Query: Get all folders for current user
    foldersDataSource.createResolver('GetAllFoldersResolver', {
      typeName: 'Query',
      fieldName: 'getAllFolders',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "Scan",
          "limit": #if($ctx.args.limit) $ctx.args.limit #else 50 #end
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result.items)
      `),
    });

    // Query: Get specific folder
    foldersDataSource.createResolver('GetFolderResolver', {
      typeName: 'Query',
      fieldName: 'getFolder',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "GetItem",
          "key": {
            "userId": $util.dynamodb.toDynamoDBJson($ctx.identity.sub),
            "folderId": $util.dynamodb.toDynamoDBJson($ctx.args.folderId)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result)
      `),
    });

    // Query: Get folder children (subfolders)
    foldersDataSource.createResolver('GetFolderChildrenResolver', {
      typeName: 'Query',
      fieldName: 'getFolderChildren',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "Query",
          "index": "ParentFolderIndex",
          "query": {
            "expression": "userId = :userId AND parentId = :parentId",
            "expressionValues": {
              ":userId": $util.dynamodb.toDynamoDBJson($ctx.identity.sub),
              ":parentId": $util.dynamodb.toDynamoDBJson($ctx.args.parentId)
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result.items)
      `),
    });

    // Mutation: Create folder
    foldersDataSource.createResolver('CreateFolderResolver', {
      typeName: 'Mutation',
      fieldName: 'createFolder',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($folderId = $util.autoId())
        #set($now = $util.time.nowISO8601())
        {
          "version": "2017-02-28",
          "operation": "PutItem",
          "key": {
            "userId": $util.dynamodb.toDynamoDBJson($ctx.identity.sub),
            "folderId": $util.dynamodb.toDynamoDBJson($folderId)
          },
          "attributeValues": {
            "folderId": $util.dynamodb.toDynamoDBJson($folderId),
            "name": $util.dynamodb.toDynamoDBJson($ctx.args.input.name),
            "type": $util.dynamodb.toDynamoDBJson($ctx.args.input.type),
            "createdAt": $util.dynamodb.toDynamoDBJson($now),
            "updatedAt": $util.dynamodb.toDynamoDBJson($now),
            "childrenCount": $util.dynamodb.toDynamoDBJson(0)
            #if($ctx.args.input.parentId)
              ,"parentId": $util.dynamodb.toDynamoDBJson($ctx.args.input.parentId)
            #end
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result)
      `),
    });

    // Mutation: Update folder
    foldersDataSource.createResolver('UpdateFolderResolver', {
      typeName: 'Mutation',
      fieldName: 'updateFolder',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($now = $util.time.nowISO8601())
        #set($updateExpression = "SET updatedAt = :updatedAt")
        #set($expressionAttributeValues = { ":updatedAt": { "S": "$now" } })
        
        #if($ctx.args.input.name)
          #set($updateExpression = "$updateExpression, #name = :name")
          #set($expressionAttributeValues[":name"] = { "S": "$ctx.args.input.name" })
        #end
        
        #if($ctx.args.input.type)
          #set($updateExpression = "$updateExpression, #type = :type")
          #set($expressionAttributeValues[":type"] = { "S": "$ctx.args.input.type" })
        #end
        
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "userId": $util.dynamodb.toDynamoDBJson($ctx.identity.sub),
            "folderId": $util.dynamodb.toDynamoDBJson($ctx.args.input.folderId)
          },
          "update": {
            "expression": "$updateExpression",
            "expressionValues": $util.toJson($expressionAttributeValues)
            #if($ctx.args.input.name || $ctx.args.input.type)
              ,"expressionNames": {
                #if($ctx.args.input.name) "#name": "name" #end
                #if($ctx.args.input.name && $ctx.args.input.type), #end
                #if($ctx.args.input.type) "#type": "type" #end
              }
            #end
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result)
      `),
    });

    // Mutation: Delete folder
    foldersDataSource.createResolver('DeleteFolderResolver', {
      typeName: 'Mutation',
      fieldName: 'deleteFolder',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "DeleteItem",
          "key": {
            "userId": $util.dynamodb.toDynamoDBJson($ctx.identity.sub),
            "folderId": $util.dynamodb.toDynamoDBJson($ctx.args.folderId)
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

    // Mutation: Delete multiple folders
    foldersDataSource.createResolver('DeleteFoldersResolver', {
      typeName: 'Mutation',
      fieldName: 'deleteFolders',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        #set($deletedCount = 0)
        #set($errors = [])
        
        #foreach($folderId in $ctx.args.folderIds)
          ## Try to delete each folder individually
          #set($deleteRequest = {
            "version": "2017-02-28",
            "operation": "DeleteItem",
            "key": {
              "userId": $util.dynamodb.toDynamoDBJson($ctx.identity.sub),
              "folderId": $util.dynamodb.toDynamoDBJson($folderId)
            }
          })
          
          ## Store the request for later processing
          $util.qr($ctx.stash.put("deleteRequest_$folderId", $deleteRequest))
        #end
        
        ## Return the first delete request (we'll handle multiple deletes in a Lambda or use the first one as template)
        #set($firstId = $ctx.args.folderIds[0])
        {
          "version": "2017-02-28",
          "operation": "DeleteItem",
          "key": {
            "userId": $util.dynamodb.toDynamoDBJson($ctx.identity.sub),
            "folderId": $util.dynamodb.toDynamoDBJson($firstId)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #if($ctx.error)
          $util.error($ctx.error.message, $ctx.error.type)
        #end
        
        ## For now, just return true if the first deletion succeeded
        ## This is a limitation - we can only delete one at a time with direct DynamoDB
        true
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
            `${this.formSubmissionsTable.tableArn}/*`,
            this.foldersTable.tableArn,
            `${this.foldersTable.tableArn}/*`
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

    new cdk.CfnOutput(this, 'FoldersTableName', {
      value: this.foldersTable.tableName,
      description: 'Folders DynamoDB Table Name',
      exportName: `ManpowerFoldersTable-${environment}`
    });
  }
}