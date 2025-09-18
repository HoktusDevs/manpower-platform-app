import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { JobService } from '../services/jobService';
import { CreateJobInput, UpdateJobInput } from '../types';

// Mock auth function for deployment
const extractUserFromEvent = (event: any) => ({
  sub: 'mock-user-id',
  email: 'mock@example.com',
  role: 'admin' as const,
  userId: 'mock-user-id',
  userRole: 'admin' as const
});

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
    const jobId = event.pathParameters?.jobId;

    if (!jobId) {
      return createResponse(400, {
        success: false,
        message: 'Job ID is required',
      });
    }

    const result = await jobService.getJob(jobId);

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

    const result = await jobService.updateJob(input);

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

    const result = await jobService.deleteJob(jobId);

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