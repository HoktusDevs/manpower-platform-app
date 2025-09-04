import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DatabaseStack extends cdk.Stack {
  public readonly tables: { [key: string]: dynamodb.Table } = {};

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Users table with role-based access (admin/postulante)
    this.tables.users = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'manpower-users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Add GSI for email lookup (unique login)
    this.tables.users.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Add GSI for role-based queries
    this.tables.users.addGlobalSecondaryIndex({
      indexName: 'RoleIndex',
      partitionKey: { name: 'role', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING }
    });

    // Job postings table (created by admins)
    this.tables.jobPostings = new dynamodb.Table(this, 'JobPostingsTable', {
      tableName: 'manpower-job-postings',
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Add GSI for active job postings
    this.tables.jobPostings.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING }
    });

    // Forms table (dynamic form definitions)
    this.tables.forms = new dynamodb.Table(this, 'FormsTable', {
      tableName: 'manpower-forms',
      partitionKey: { name: 'formId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Applications table (postulante applications to jobs)
    this.tables.applications = new dynamodb.Table(this, 'ApplicationsTable', {
      tableName: 'manpower-applications',
      partitionKey: { name: 'applicationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Add GSI for user applications
    this.tables.applications.addGlobalSecondaryIndex({
      indexName: 'UserApplicationsIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING }
    });

    // Add GSI for job applications
    this.tables.applications.addGlobalSecondaryIndex({
      indexName: 'JobApplicationsIndex',
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'status', type: dynamodb.AttributeType.STRING }
    });

    // Add GSI for status tracking
    this.tables.applications.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING }
    });

    // Form submissions table (postulante responses)
    this.tables.formSubmissions = new dynamodb.Table(this, 'FormSubmissionsTable', {
      tableName: 'manpower-form-submissions',
      partitionKey: { name: 'submissionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Add GSI for application submissions
    this.tables.formSubmissions.addGlobalSecondaryIndex({
      indexName: 'ApplicationSubmissionsIndex',
      partitionKey: { name: 'applicationId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING }
    });

    // Files metadata table (optimized for 15K daily uploads)
    this.tables.files = new dynamodb.Table(this, 'FilesTable', {
      tableName: 'manpower-files',
      partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Add GSI for user files
    this.tables.files.addGlobalSecondaryIndex({
      indexName: 'UserFilesIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING }
    });

    // Add GSI for application files
    this.tables.files.addGlobalSecondaryIndex({
      indexName: 'ApplicationFilesIndex',
      partitionKey: { name: 'applicationId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING }
    });

    // Add GSI for file type queries
    this.tables.files.addGlobalSecondaryIndex({
      indexName: 'FileTypeIndex',
      partitionKey: { name: 'fileType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING }
    });

    // Sessions table for authentication
    this.tables.sessions = new dynamodb.Table(this, 'SessionsTable', {
      tableName: 'manpower-sessions',
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Audit trail table for sensitive data tracking
    this.tables.auditTrail = new dynamodb.Table(this, 'AuditTrailTable', {
      tableName: 'manpower-audit-trail',
      partitionKey: { name: 'trailId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Add GSI for user audit trails
    this.tables.auditTrail.addGlobalSecondaryIndex({
      indexName: 'UserAuditIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING }
    });

    // Add GSI for action-based audit queries
    this.tables.auditTrail.addGlobalSecondaryIndex({
      indexName: 'ActionAuditIndex',
      partitionKey: { name: 'action', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING }
    });

    // Add outputs for all tables
    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.tables.users.tableName,
      exportName: 'ManpowerUsersTableName'
    });

    new cdk.CfnOutput(this, 'JobPostingsTableName', {
      value: this.tables.jobPostings.tableName,
      exportName: 'ManpowerJobPostingsTableName'
    });

    new cdk.CfnOutput(this, 'FormsTableName', {
      value: this.tables.forms.tableName,
      exportName: 'ManpowerFormsTableName'
    });

    new cdk.CfnOutput(this, 'ApplicationsTableName', {
      value: this.tables.applications.tableName,
      exportName: 'ManpowerApplicationsTableName'
    });

    new cdk.CfnOutput(this, 'FormSubmissionsTableName', {
      value: this.tables.formSubmissions.tableName,
      exportName: 'ManpowerFormSubmissionsTableName'
    });

    new cdk.CfnOutput(this, 'FilesTableName', {
      value: this.tables.files.tableName,
      exportName: 'ManpowerFilesTableName'
    });

    new cdk.CfnOutput(this, 'SessionsTableName', {
      value: this.tables.sessions.tableName,
      exportName: 'ManpowerSessionsTableName'
    });

    new cdk.CfnOutput(this, 'AuditTrailTableName', {
      value: this.tables.auditTrail.tableName,
      exportName: 'ManpowerAuditTrailTableName'
    });
  }
}