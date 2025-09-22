import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { ApplicationService } from '../services/applicationService';
import { CreateApplicationInput } from '../types';

// Extract user from event headers or JWT token
const extractUserFromEvent = (event: any) => {
  // Try to get userId from headers first
  const userIdFromHeaders = event.headers?.['x-user-id'] || event.headers?.['X-User-Id'];
  
  if (!userIdFromHeaders) {
    throw new Error('User ID is required');
  }
  
  return {
    sub: userIdFromHeaders,
    email: 'user@example.com',
    role: 'postulante' as const,
    userId: userIdFromHeaders,
    userRole: 'postulante' as const
  };
};

const applicationService = new ApplicationService();

const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent, X-User-Id',
  },
  body: JSON.stringify(body),
});

// Create application
export const createApplication: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId } = extractUserFromEvent(event);

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: CreateApplicationInput = JSON.parse(event.body);

    if (!input.jobId) {
      return createResponse(400, {
        success: false,
        message: 'Job ID is required',
      });
    }

    const result = await applicationService.createApplication(input, userId);

    if (!result.success) {
      return createResponse(400, result);
    }

    return createResponse(201, result);
  } catch (error) {
    console.error('Error in createApplication:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get my applications
export const getMyApplications: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId } = extractUserFromEvent(event);

    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : undefined;
    const nextToken = event.queryStringParameters?.nextToken;

    const result = await applicationService.getMyApplications(userId, limit, nextToken);

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getMyApplications:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Delete application
export const deleteApplication: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId } = extractUserFromEvent(event);
    const applicationId = event.pathParameters?.applicationId;

    if (!applicationId) {
      return createResponse(400, {
        success: false,
        message: 'Application ID is required',
      });
    }

    const result = await applicationService.deleteApplication(applicationId, userId);

    if (!result.success) {
      return createResponse(404, result);
    }

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in deleteApplication:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Check if application exists for a job
export const checkApplicationExists: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId } = extractUserFromEvent(event);
    const jobId = event.pathParameters?.jobId;

    if (!jobId) {
      return createResponse(400, {
        success: false,
        message: 'Job ID is required',
      });
    }

    const result = await applicationService.checkApplicationExists(userId, jobId);

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in checkApplicationExists:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};
