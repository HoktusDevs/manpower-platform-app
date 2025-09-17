import { AppSyncResolverEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, BatchGetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Table names from environment
const APPLICATIONS_TABLE = process.env.APPLICATIONS_TABLE || 'manpower-applications-dev';
const JOB_POSTINGS_TABLE = process.env.JOB_POSTINGS_TABLE || 'manpower-job-postings-dev';

interface Application {
  userId: string;
  applicationId: string;
  jobId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  // Enriched fields
  position?: string;
  companyName?: string;
  description?: string;
  location?: string;
  salary?: string;
  companyId?: string;
}

interface JobPosting {
  jobId: string;
  title: string;
  companyName: string;
  description?: string;
  location?: string;
  salary?: string;
  companyId?: string;
}

/**
 * Main GraphQL Resolver Handler
 */
export const handler = async (event: AppSyncResolverEvent<any>) => {
  console.log('GraphQL Request:', JSON.stringify(event, null, 2));

  const fieldName = event.info.fieldName;
  const identity = event.identity as any;
  const args = event.arguments;
  const userId = identity?.sub;

  try {
    switch (fieldName) {
      case 'getMyApplications':
        return await getMyApplications(userId);

      case 'applyToJob':
        return await applyToJob(userId, args.jobId);

      case 'applyToMultipleJobs':
        return await applyToMultipleJobs(userId, args.jobIds);

      case 'getAllApplications':
        return await getAllApplications(args.status, args.limit, args.nextToken);

      case 'updateApplicationStatus':
        return await updateApplicationStatus(args.applicationId, args.userId, args.status);

      case 'deleteMyApplication':
        return await deleteMyApplication(userId, args.applicationId);

      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    console.error('Resolver Error:', error);
    throw error;
  }
};

/**
 * Get applications for current user WITH job data
 */
async function getMyApplications(userId: string): Promise<Application[]> {
  // 1. Get user's applications
  const response = await docClient.send(new QueryCommand({
    TableName: APPLICATIONS_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  }));

  const applications = response.Items as Application[] || [];

  if (applications.length === 0) {
    return [];
  }

  // 2. Get unique job IDs
  const jobIds = [...new Set(applications.map(app => app.jobId))];

  // 3. Batch get job postings
  const jobsResponse = await docClient.send(new BatchGetCommand({
    RequestItems: {
      [JOB_POSTINGS_TABLE]: {
        Keys: jobIds.map(jobId => ({ jobId }))
      }
    }
  }));

  const jobs = jobsResponse.Responses?.[JOB_POSTINGS_TABLE] as JobPosting[] || [];
  const jobMap = Object.fromEntries(jobs.map(job => [job.jobId, job]));

  // 4. Enrich applications with job data
  return applications.map(app => {
    const job = jobMap[app.jobId];

    if (job) {
      return {
        ...app,
        position: job.title,
        companyName: job.companyName,
        description: job.description || '',
        location: job.location || '',
        salary: job.salary || '',
        companyId: job.companyId || ''
      };
    }

    // Job not found - return with placeholder data
    return {
      ...app,
      position: 'Posicion no encontrada',
      companyName: 'Empresa no encontrada',
      description: '',
      location: '',
      salary: '',
      companyId: ''
    };
  });
}

/**
 * Apply to a single job
 */
async function applyToJob(userId: string, jobId: string): Promise<Application> {
  // 1. Get the job posting first
  const jobResponse = await docClient.send(new GetCommand({
    TableName: JOB_POSTINGS_TABLE,
    Key: { jobId }
  }));

  const job = jobResponse.Item as JobPosting;

  if (!job) {
    throw new Error(`Job posting ${jobId} not found`);
  }

  // 2. Create the application
  const application: Application = {
    userId,
    applicationId: uuidv4(),
    jobId,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 3. Save to database
  await docClient.send(new PutCommand({
    TableName: APPLICATIONS_TABLE,
    Item: application
  }));

  // 4. Return enriched application
  return {
    ...application,
    position: job.title,
    companyName: job.companyName,
    description: job.description || '',
    location: job.location || '',
    salary: job.salary || '',
    companyId: job.companyId || ''
  };
}

/**
 * Apply to multiple jobs at once
 */
async function applyToMultipleJobs(userId: string, jobIds: string[]): Promise<Application[]> {
  // 1. Get all job postings
  const jobsResponse = await docClient.send(new BatchGetCommand({
    RequestItems: {
      [JOB_POSTINGS_TABLE]: {
        Keys: jobIds.map(jobId => ({ jobId }))
      }
    }
  }));

  const jobs = jobsResponse.Responses?.[JOB_POSTINGS_TABLE] as JobPosting[] || [];
  const jobMap = Object.fromEntries(jobs.map(job => [job.jobId, job]));

  // 2. Create applications for each job
  const applications: Application[] = [];

  for (const jobId of jobIds) {
    const job = jobMap[jobId];
    if (!job) {
      console.warn(`Job ${jobId} not found, skipping`);
      continue;
    }

    const application: Application = {
      userId,
      applicationId: uuidv4(),
      jobId,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Include job data directly
      position: job.title,
      companyName: job.companyName,
      description: job.description || '',
      location: job.location || '',
      salary: job.salary || '',
      companyId: job.companyId || ''
    };

    // Save to database
    await docClient.send(new PutCommand({
      TableName: APPLICATIONS_TABLE,
      Item: application
    }));

    applications.push(application);
  }

  return applications;
}

/**
 * Admin: Get all applications
 */
async function getAllApplications(status?: string, limit?: number, nextToken?: string): Promise<Application[]> {
  const params: any = {
    TableName: APPLICATIONS_TABLE,
    Limit: limit || 100
  };

  if (status) {
    params.FilterExpression = '#status = :status';
    params.ExpressionAttributeNames = { '#status': 'status' };
    params.ExpressionAttributeValues = { ':status': status };
  }

  if (nextToken) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
  }

  const response = await docClient.send(new ScanCommand(params));
  const applications = response.Items as Application[] || [];

  // Enrich with job data (same as getMyApplications)
  if (applications.length > 0) {
    const jobIds = [...new Set(applications.map(app => app.jobId))];

    const jobsResponse = await docClient.send(new BatchGetCommand({
      RequestItems: {
        [JOB_POSTINGS_TABLE]: {
          Keys: jobIds.map(jobId => ({ jobId }))
        }
      }
    }));

    const jobs = jobsResponse.Responses?.[JOB_POSTINGS_TABLE] as JobPosting[] || [];
    const jobMap = Object.fromEntries(jobs.map(job => [job.jobId, job]));

    return applications.map(app => {
      const job = jobMap[app.jobId];
      return job ? {
        ...app,
        position: job.title,
        companyName: job.companyName,
        description: job.description || '',
        location: job.location || '',
        salary: job.salary || '',
        companyId: job.companyId || ''
      } : app;
    });
  }

  return applications;
}

/**
 * Admin: Update application status
 */
async function updateApplicationStatus(applicationId: string, userId: string, status: string): Promise<Application> {
  const response = await docClient.send(new UpdateCommand({
    TableName: APPLICATIONS_TABLE,
    Key: { userId, applicationId },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': new Date().toISOString()
    },
    ReturnValues: 'ALL_NEW'
  }));

  return response.Attributes as Application;
}

/**
 * Delete user's application
 */
async function deleteMyApplication(userId: string, applicationId: string): Promise<boolean> {
  await docClient.send(new DeleteCommand({
    TableName: APPLICATIONS_TABLE,
    Key: { userId, applicationId }
  }));

  return true;
}