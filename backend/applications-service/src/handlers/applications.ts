import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { ApplicationService } from '../services/applicationService';
import { CreateApplicationInput } from '../types';

// Extract user from JWT token
const extractUserFromEvent = (event: any) => {
  // Extract userId from Authorization header (JWT token)
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization header required');
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Decode JWT token to get user information
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = decoded.sub; // Cognito sub is the user ID
    
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    
    return {
      sub: userId,
      email: decoded.email || 'user@example.com',
      role: decoded['custom:role'] || 'postulante',
      userId: userId,
      userRole: decoded['custom:role'] || 'postulante'
    };
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    throw new Error('Invalid token');
  }
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
    const { userId, email } = extractUserFromEvent(event);

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: CreateApplicationInput = JSON.parse(event.body);

    if (!input.jobIds || !Array.isArray(input.jobIds) || input.jobIds.length === 0) {
      return createResponse(400, {
        success: false,
        message: 'Job IDs array is required and must not be empty',
      });
    }

    const result = await applicationService.createApplication(input, userId, email);

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
    const applicationId = event.pathParameters?.applicationId;

    if (!applicationId) {
      return createResponse(400, {
        success: false,
        message: 'Application ID is required',
      });
    }

    // Extract user from token to pass userId for folder deletion
    const user = extractUserFromEvent(event);

    const result = await applicationService.deleteApplication(applicationId, user.userId);

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

// Update application
export const updateApplication: APIGatewayProxyHandler = async (event) => {
  try {
    const { applicationId } = event.pathParameters || {};
    
    if (!applicationId) {
      return createResponse(400, {
        success: false,
        message: 'Application ID is required',
      });
    }

    const body = JSON.parse(event.body || '{}');
    const { status, description } = body;

    if (!status) {
      return createResponse(400, {
        success: false,
        message: 'Status is required',
      });
    }

    const result = await applicationService.updateApplication(applicationId, { status, description });

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in updateApplication:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get all applications (admin only)
export const getAllApplications: APIGatewayProxyHandler = async (event) => {
  try {
    console.log('📋 Getting all applications (no auth required)');
    
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : undefined;
    const nextToken = event.queryStringParameters?.nextToken;

    const result = await applicationService.getAllApplications(limit, nextToken);

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getAllApplications:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Delete multiple applications (admin only)
export const deleteApplications: APIGatewayProxyHandler = async (event) => {
  try {
    console.log('🗑️ Deleting multiple applications (admin only)');
    console.log('📝 Request body:', event.body);
    
    const body = JSON.parse(event.body || '{}');
    const { applicationIds } = body;

    console.log('📋 Application IDs to delete:', applicationIds);

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      console.log('❌ Invalid applicationIds:', applicationIds);
      return createResponse(400, {
        success: false,
        message: 'Application IDs array is required',
      });
    }

    const result = await applicationService.deleteApplications(applicationIds);
    console.log('✅ Delete result:', result);

    return createResponse(200, result);
  } catch (error) {
    console.error('❌ Error in deleteApplications:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};
