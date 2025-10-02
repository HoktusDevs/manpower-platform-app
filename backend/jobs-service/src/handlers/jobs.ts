import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { JobService } from '../services/jobService';
import { CreateJobInput, UpdateJobInput } from '../types';

// Extract user from event headers or JWT token
const extractUserFromEvent = (event: any) => {
  // Try to get userId from headers first
  const userIdFromHeaders = event.headers?.['x-user-id'] || event.headers?.['X-User-Id'];
  
  if (userIdFromHeaders) {
    return {
      sub: userIdFromHeaders,
      email: 'user@example.com',
      role: 'admin' as const,
      userId: userIdFromHeaders,
      userRole: 'admin' as const
    };
  }
  
  // Fallback to mock for development
  return {
    sub: 'b41824b8-70d1-7052-4d26-cbfaefcac8ed',
    email: 'user@example.com',
    role: 'admin' as const,
    userId: 'b41824b8-70d1-7052-4d26-cbfaefcac8ed',
    userRole: 'admin' as const
  };
};

const jobService = new JobService();

const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  },
  body: JSON.stringify(body),
});


// Create job - ADMIN ONLY
export const createJob: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId, userRole } = extractUserFromEvent(event);

    // Only admins can create jobs
    if (userRole !== 'admin') {
      return createResponse(403, {
        success: false,
        message: 'Only administrators can create jobs',
      });
    }

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: CreateJobInput = JSON.parse(event.body);

    // Validate required fields
    if (!input.title || !input.description || !input.companyName || !input.location || !input.folderId) {
      return createResponse(400, {
        success: false,
        message: 'Missing required fields: title, description, companyName, location, folderId',
      });
    }

    // Validate employment type
    const validEmploymentTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'TEMPORARY'];
    if (input.employmentType && !validEmploymentTypes.includes(input.employmentType)) {
      return createResponse(400, {
        success: false,
        message: `Invalid employment type. Must be one of: ${validEmploymentTypes.join(', ')}`,
      });
    }

    // Validate experience level
    const validExperienceLevels = ['ENTRY_LEVEL', 'MID_LEVEL', 'SENIOR_LEVEL', 'EXECUTIVE', 'INTERNSHIP'];
    if (input.experienceLevel && !validExperienceLevels.includes(input.experienceLevel)) {
      return createResponse(400, {
        success: false,
        message: `Invalid experience level. Must be one of: ${validExperienceLevels.join(', ')}`,
      });
    }

    // Validate status if provided
    const validStatuses = ['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED'];
    if (input.status && !validStatuses.includes(input.status)) {
      return createResponse(400, {
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Validate requiredDocuments if provided
    if (input.requiredDocuments && !Array.isArray(input.requiredDocuments)) {
      return createResponse(400, {
        success: false,
        message: 'requiredDocuments must be an array of strings',
      });
    }

    // Validate for special characters that could cause security issues (XSS, injection)
    // Allow most common characters including: - _ @ . , : ; ' " ( ) and Spanish characters
    const specialCharRegex = /[<>{}[\]\\|`]/;
    const fieldsToValidate = [
      { value: input.title, name: 'title' },
      { value: input.companyName, name: 'companyName' },
      { value: input.description, name: 'description' },
      { value: input.requirements, name: 'requirements' },
      { value: input.benefits, name: 'benefits' },
      { value: input.schedule, name: 'schedule' }
    ];

    for (const field of fieldsToValidate) {
      if (field.value && specialCharRegex.test(field.value)) {
        return createResponse(400, {
          success: false,
          message: `Field '${field.name}' contains invalid special characters. Please remove characters like < > { } [ ] \\ | \``,
        });
      }
    }

    const result = await jobService.createJob(input, userId);

    if (!result.success) {
      return createResponse(400, result);
    }

    return createResponse(201, result);
  } catch (error) {
    console.error('Error in createJob:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get all jobs (for admin)
export const getAllJobs: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId, userRole } = extractUserFromEvent(event);

    // Only admins can see all jobs
    if (userRole !== 'admin') {
      return createResponse(403, {
        success: false,
        message: 'Only administrators can view all jobs',
      });
    }

    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : undefined;
    const nextToken = event.queryStringParameters?.nextToken;

    const result = await jobService.getAllJobs(limit, nextToken);

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getAllJobs:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get published jobs (public endpoint for postulantes)
export const getPublishedJobs: APIGatewayProxyHandler = async (event) => {
  try {
    // This endpoint can be accessed by both admins and postulantes
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : undefined;
    const nextToken = event.queryStringParameters?.nextToken;

    const result = await jobService.getPublishedJobs(limit, nextToken);

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getPublishedJobs:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get single job
export const getJob: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId } = extractUserFromEvent(event);
    const jobId = event.pathParameters?.jobId;

    if (!jobId) {
      return createResponse(400, {
        success: false,
        message: 'Job ID is required',
      });
    }

    const result = await jobService.getJob(jobId, userId);

    if (!result.success) {
      return createResponse(404, result);
    }

    // Check if user has permission to view this job
    const { userRole } = extractUserFromEvent(event);

    if (userRole !== 'admin' && result.job?.status !== 'PUBLISHED') {
      return createResponse(403, {
        success: false,
        message: 'Access denied. Job not published.',
      });
    }

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getJob:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update job - ADMIN ONLY
export const updateJob: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId, userRole } = extractUserFromEvent(event);

    // Only admins can update jobs
    if (userRole !== 'admin') {
      return createResponse(403, {
        success: false,
        message: 'Only administrators can update jobs',
      });
    }

    const jobId = event.pathParameters?.jobId;

    if (!jobId) {
      return createResponse(400, {
        success: false,
        message: 'Job ID is required',
      });
    }

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const updateData = JSON.parse(event.body);
    const input: UpdateJobInput = {
      jobId,
      ...updateData,
    };

    const result = await jobService.updateJob(input, userId);

    if (!result.success) {
      return createResponse(404, result);
    }

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in updateJob:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Delete job - ADMIN ONLY
export const deleteJob: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId, userRole } = extractUserFromEvent(event);

    // Only admins can delete jobs
    if (userRole !== 'admin') {
      return createResponse(403, {
        success: false,
        message: 'Only administrators can delete jobs',
      });
    }

    const jobId = event.pathParameters?.jobId;

    if (!jobId) {
      return createResponse(400, {
        success: false,
        message: 'Job ID is required',
      });
    }

    const result = await jobService.deleteJob(jobId, userId);

    if (!result.success) {
      return createResponse(404, result);
    }

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in deleteJob:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Delete multiple jobs (batch) - ADMIN ONLY
export const deleteJobs: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId, userRole } = extractUserFromEvent(event);

    // Only admins can delete jobs
    if (userRole !== 'admin') {
      return createResponse(403, {
        success: false,
        message: 'Only administrators can delete jobs',
      });
    }

    // Parse the request body to get job IDs
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    let jobIds: string[];
    try {
      const body = JSON.parse(event.body);
      jobIds = body.jobIds;
    } catch (parseError) {
      return createResponse(400, {
        success: false,
        message: 'Invalid JSON in request body',
      });
    }

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return createResponse(400, {
        success: false,
        message: 'jobIds must be a non-empty array',
      });
    }

    // Process batch deletion
    const results = {
      deleted: [] as string[],
      failed: [] as { jobId: string; error: string }[],
      deletedCount: 0,
      failedCount: 0
    };

    console.log(`Starting batch deletion of ${jobIds.length} jobs`);

    for (const jobId of jobIds) {
      try {
        const result = await jobService.deleteJob(jobId, userId);

        if (result.success) {
          results.deleted.push(jobId);
          results.deletedCount++;
          console.log(`Successfully deleted job: ${jobId}`);
        } else {
          results.failed.push({ jobId, error: result.message || 'Unknown error' });
          results.failedCount++;
          console.warn(`Failed to delete job ${jobId}: ${result.message}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ jobId, error: errorMessage });
        results.failedCount++;
        console.error(`Error deleting job ${jobId}:`, error);
      }
    }

    console.log(`Batch deletion completed. Deleted: ${results.deletedCount}, Failed: ${results.failedCount}`);

    // Return success if at least some jobs were deleted, or all failed
    const statusCode = results.deletedCount > 0 ? 200 : (results.failedCount === jobIds.length ? 400 : 207);

    return createResponse(statusCode, {
      success: results.deletedCount > 0,
      message: `Batch deletion completed: ${results.deletedCount} deleted, ${results.failedCount} failed`,
      results
    });

  } catch (error) {
    console.error('Error in deleteJobs batch:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get jobs by folder - ADMIN ONLY
export const getJobsByFolder: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId, userRole } = extractUserFromEvent(event);

    // Only admins can view jobs by folder
    if (userRole !== 'admin') {
      return createResponse(403, {
        success: false,
        message: 'Only administrators can view jobs by folder',
      });
    }

    const folderId = event.pathParameters?.folderId;

    if (!folderId) {
      return createResponse(400, {
        success: false,
        message: 'Folder ID is required',
      });
    }

    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : undefined;

    const result = await jobService.getJobsByFolder(folderId, limit);

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getJobsByFolder:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Delete jobs by folder - INTERNAL SERVICE CALL
export const deleteJobsByFolder: APIGatewayProxyHandler = async (event) => {
  try {
    // This endpoint is for internal service calls only
    const folderId = event.pathParameters?.folderId;

    if (!folderId) {
      return createResponse(400, {
        success: false,
        message: 'Folder ID is required',
      });
    }

    // Get all jobs in this folder
    const jobsResult = await jobService.getJobsByFolder(folderId);
    
    if (!jobsResult.success || !jobsResult.jobs || jobsResult.jobs.length === 0) {
      return createResponse(200, {
        success: true,
        message: 'No jobs found for this folder',
        deletedCount: 0
      });
    }

    // Delete all jobs in this folder
    let deletedCount = 0;
    for (const job of jobsResult.jobs) {
      try {
        const deleteResult = await jobService.deleteJob(job.jobId, job.createdBy);
        if (deleteResult.success) {
          deletedCount++;
        }
      } catch (error) {
        console.warn(`Failed to delete job ${job.jobId}:`, error);
      }
    }

    return createResponse(200, {
      success: true,
      message: `Deleted ${deletedCount} jobs from folder`,
      deletedCount
    });
  } catch (error) {
    console.error('Error in deleteJobsByFolder:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};