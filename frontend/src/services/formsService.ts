import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  ScanCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand 
} from '@aws-sdk/lib-dynamodb';
import type { ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { v4 as uuidv4 } from 'uuid';

// Form field types
export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'file' | 'date' | 'checkbox' | 'number';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    fileTypes?: string[];
    maxFileSize?: number;
    min?: number;
    max?: number;
  };
  description?: string;
}

// Form definition
export interface JobApplicationForm {
  formId: string;
  jobId: string;
  title: string;
  description: string;
  fields: FormField[];
  status: 'draft' | 'active' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata: {
    submitCount: number;
    lastSubmission?: string;
    expiresAt?: string;
    isPublic?: boolean;
  };
}

// Form submission
export interface FormSubmission {
  submissionId: string;
  formId: string;
  jobId: string;
  applicantId: string;
  responses: Record<string, unknown>;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  score?: number;
  attachments?: {
    fieldId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    uploadedAt: string;
  }[];
}

class FormsService {
  private client: DynamoDBDocumentClient | null = null;
  private region: string;
  private userPoolId: string;
  private identityPoolId: string;

  constructor() {
    this.region = import.meta.env.VITE_AWS_REGION || 'us-east-1';
    this.userPoolId = import.meta.env.VITE_USER_POOL_ID;
    this.identityPoolId = import.meta.env.VITE_IDENTITY_POOL_ID;
  }

  private async getClient(idToken?: string): Promise<DynamoDBDocumentClient> {
    if (this.client && !idToken) {
      return this.client;
    }

    let credentials;
    
    if (idToken) {
      // Authenticated user with Cognito credentials
      credentials = fromCognitoIdentityPool({
        client: new CognitoIdentityClient({ region: this.region }),
        identityPoolId: this.identityPoolId,
        logins: {
          [`cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`]: idToken,
        },
      });
    } else {
      throw new Error('Authentication required');
    }

    const dynamoClient = new DynamoDBClient({
      region: this.region,
      credentials,
    });

    this.client = DynamoDBDocumentClient.from(dynamoClient);
    return this.client;
  }

  private getTableName(tableType: 'forms' | 'submissions' | 'jobs'): string {
    const environment = import.meta.env.VITE_ENVIRONMENT || 'dev';
    
    switch (tableType) {
      case 'forms':
        return `manpower-forms-${environment}`;
      case 'submissions':
        return `manpower-form-submissions-${environment}`;
      case 'jobs':
        return `manpower-job-postings-${environment}`;
      default:
        throw new Error(`Unknown table type: ${tableType}`);
    }
  }

  // ADMIN ONLY - Create a new form
  async createForm(
    jobId: string,
    title: string,
    description: string,
    fields: FormField[],
    userId: string,
    idToken: string
  ): Promise<JobApplicationForm> {
    const client = await this.getClient(idToken);
    const formId = uuidv4();
    const now = new Date().toISOString();

    const form: JobApplicationForm = {
      formId,
      jobId,
      title,
      description,
      fields: fields.map((field, index) => ({
        ...field,
        id: field.id || `field_${index}_${Date.now()}`,
      })),
      status: 'draft',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      metadata: {
        submitCount: 0,
        isPublic: false,
      },
    };

    await client.send(
      new PutCommand({
        TableName: this.getTableName('forms'),
        Item: form,
        ConditionExpression: 'attribute_not_exists(formId)',
      })
    );

    return form;
  }

  // ADMIN ONLY - Update an existing form
  async updateForm(
    formId: string,
    updates: Partial<Pick<JobApplicationForm, 'title' | 'description' | 'fields' | 'status'>>,
    idToken: string
  ): Promise<JobApplicationForm> {
    const client = await this.getClient(idToken);

    const updateExpression: string[] = [];
    const expressionAttributeValues: Record<string, unknown> = {};
    const expressionAttributeNames: Record<string, string> = {};

    if (updates.title) {
      updateExpression.push('#title = :title');
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':title'] = updates.title;
    }

    if (updates.description !== undefined) {
      updateExpression.push('#description = :description');
      expressionAttributeNames['#description'] = 'description';
      expressionAttributeValues[':description'] = updates.description;
    }

    if (updates.fields) {
      updateExpression.push('#fields = :fields');
      expressionAttributeNames['#fields'] = 'fields';
      expressionAttributeValues[':fields'] = updates.fields;
    }

    if (updates.status) {
      updateExpression.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = updates.status;
    }

    updateExpression.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const result = await client.send(
      new UpdateCommand({
        TableName: this.getTableName('forms'),
        Key: { formId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return result.Attributes as JobApplicationForm;
  }

  // Get a specific form (public access for active forms)
  async getForm(formId: string, idToken?: string): Promise<JobApplicationForm | null> {
    const client = await this.getClient(idToken);

    const result = await client.send(
      new GetCommand({
        TableName: this.getTableName('forms'),
        Key: { formId },
      })
    );

    if (!result.Item) {
      return null;
    }

    const form = result.Item as JobApplicationForm;
    
    // Non-admin users can only see active forms
    if (!idToken && form.status !== 'active') {
      return null;
    }

    return form;
  }

  // List forms (admin sees all, public sees only active)
  async listForms(filters?: {
    jobId?: string;
    status?: JobApplicationForm['status'];
  }, idToken?: string): Promise<JobApplicationForm[]> {
    const client = await this.getClient(idToken);

    const scanParams: ScanCommandInput = {
      TableName: this.getTableName('forms'),
    };

    const filterExpressions: string[] = [];
    const expressionAttributeValues: Record<string, unknown> = {};
    const expressionAttributeNames: Record<string, string> = {};

    // If no idToken (public access), only show active forms
    if (!idToken) {
      filterExpressions.push('#status = :activeStatus');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':activeStatus'] = 'active';
    } else if (filters?.status) {
      filterExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = filters.status;
    }

    if (filters?.jobId) {
      filterExpressions.push('jobId = :jobId');
      expressionAttributeValues[':jobId'] = filters.jobId;
    }

    if (filterExpressions.length > 0) {
      scanParams.FilterExpression = filterExpressions.join(' AND ');
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
      if (Object.keys(expressionAttributeNames).length > 0) {
        scanParams.ExpressionAttributeNames = expressionAttributeNames;
      }
    }

    const result = await client.send(new ScanCommand(scanParams));
    return (result.Items as JobApplicationForm[]) || [];
  }

  // ADMIN ONLY - Delete a form
  async deleteForm(formId: string, idToken: string): Promise<void> {
    const client = await this.getClient(idToken);

    await client.send(
      new DeleteCommand({
        TableName: this.getTableName('forms'),
        Key: { formId },
      })
    );
  }

  // Submit a form application
  async submitForm(
    formId: string,
    responses: { [fieldId: string]: unknown },
    applicantId: string,
    idToken: string,
    attachments?: FormSubmission['attachments']
  ): Promise<FormSubmission> {
    const client = await this.getClient(idToken);

    // First, get the form to validate it exists and is active
    const form = await this.getForm(formId, idToken);
    if (!form || form.status !== 'active') {
      throw new Error('Form not found or not active');
    }

    const submissionId = uuidv4();
    const now = new Date().toISOString();

    const submission: FormSubmission = {
      submissionId,
      formId,
      jobId: form.jobId,
      applicantId,
      responses,
      status: 'submitted',
      submittedAt: now,
      attachments: attachments || [],
    };

    // Create submission
    await client.send(
      new PutCommand({
        TableName: this.getTableName('submissions'),
        Item: submission,
      })
    );

    // Update form submit count
    await client.send(
      new UpdateCommand({
        TableName: this.getTableName('forms'),
        Key: { formId },
        UpdateExpression: 'SET metadata.submitCount = metadata.submitCount + :inc, metadata.lastSubmission = :now',
        ExpressionAttributeValues: {
          ':inc': 1,
          ':now': now,
        },
      })
    );

    return submission;
  }

  // Get form submissions (admin: all, user: own only)
  async getSubmissions(filters?: {
    formId?: string;
    applicantId?: string;
    status?: FormSubmission['status'];
  }, idToken?: string): Promise<FormSubmission[]> {
    const client = await this.getClient(idToken);

    if (filters?.formId) {
      // Query by form ID
      const result = await client.send(
        new QueryCommand({
          TableName: this.getTableName('submissions'),
          IndexName: 'FormSubmissionsIndex',
          KeyConditionExpression: 'formId = :formId',
          ExpressionAttributeValues: {
            ':formId': filters.formId,
          },
        })
      );
      return (result.Items as FormSubmission[]) || [];
    }

    if (filters?.applicantId) {
      // Query by applicant ID
      const result = await client.send(
        new QueryCommand({
          TableName: this.getTableName('submissions'),
          IndexName: 'UserSubmissionsIndex',
          KeyConditionExpression: 'applicantId = :applicantId',
          ExpressionAttributeValues: {
            ':applicantId': filters.applicantId,
          },
        })
      );
      return (result.Items as FormSubmission[]) || [];
    }

    // Scan all (admin only)
    const scanParams: ScanCommandInput = {
      TableName: this.getTableName('submissions'),
    };

    if (filters?.status) {
      scanParams.FilterExpression = '#status = :status';
      scanParams.ExpressionAttributeNames = { '#status': 'status' };
      scanParams.ExpressionAttributeValues = { ':status': filters.status };
    }

    const result = await client.send(new ScanCommand(scanParams));
    return (result.Items as FormSubmission[]) || [];
  }

  // ADMIN ONLY - Review a submission
  async reviewSubmission(
    submissionId: string,
    status: 'under_review' | 'accepted' | 'rejected',
    reviewerId: string,
    notes?: string,
    score?: number,
    idToken?: string
  ): Promise<FormSubmission> {
    const client = await this.getClient(idToken);

    const result = await client.send(
      new UpdateCommand({
        TableName: this.getTableName('submissions'),
        Key: { submissionId },
        UpdateExpression: 'SET #status = :status, reviewedAt = :reviewedAt, reviewedBy = :reviewedBy, notes = :notes, score = :score',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': status,
          ':reviewedAt': new Date().toISOString(),
          ':reviewedBy': reviewerId,
          ':notes': notes || '',
          ':score': score || null,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return result.Attributes as FormSubmission;
  }
}

export const formsService = new FormsService();