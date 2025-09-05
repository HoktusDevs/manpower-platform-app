import { APIGatewayProxyResult } from 'aws-lambda';
import type { 
  AuthResponse, 
  User, 
  HealthCheckData 
} from '../types/auth';

/**
 * Response utilities for Auth Service
 */

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  timestamp: string;
  requestId?: string;
}

export interface ErrorResponse extends ApiResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

export interface SuccessResponse extends ApiResponse {
  success: true;
  data: any;
}

// Standard CORS headers for auth service
export const getCorsHeaders = (origin?: string) => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': origin || process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true'
});

// Create standardized API response
export const createApiResponse = (
  statusCode: number,
  body: ApiResponse | ErrorResponse | SuccessResponse,
  additionalHeaders: Record<string, string> = {}
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    ...getCorsHeaders(),
    ...additionalHeaders
  },
  body: JSON.stringify(body)
});

// Success response helper
export const createSuccessResponse = (
  data: any,
  message: string = 'Success',
  requestId?: string
): APIGatewayProxyResult => {
  const response: SuccessResponse = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId })
  };
  
  return createApiResponse(200, response);
};

// Error response helper
export const createErrorResponse = (
  statusCode: number,
  message: string,
  code?: string,
  details?: any,
  requestId?: string
): APIGatewayProxyResult => {
  console.error(`Auth Service Error ${statusCode} [${code}]:`, message, details);
  
  const response: ErrorResponse = {
    success: false,
    message,
    error: message,
    timestamp: new Date().toISOString(),
    ...(code && { code }),
    ...(details && process.env.NODE_ENV === 'development' && { details }),
    ...(requestId && { requestId })
  };
  
  return createApiResponse(statusCode, response);
};

// CORS preflight response
export const createCorsResponse = (): APIGatewayProxyResult => {
  return createApiResponse(200, {
    success: true,
    message: 'CORS preflight successful',
    timestamp: new Date().toISOString()
  });
};

// Health check response
export const createHealthResponse = (
  additionalInfo?: any
): APIGatewayProxyResult => {
  const healthData = {
    service: 'auth-service',
    status: 'healthy',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    tables: {
      users: process.env.USERS_TABLE || 'manpower-users'
    },
    ...additionalInfo
  };
  
  return createSuccessResponse(healthData, 'Auth service is healthy');
};

// Validation error response
export const createValidationErrorResponse = (
  errors: string[],
  requestId?: string
): APIGatewayProxyResult => {
  const message = `Validation failed: ${errors.join(', ')}`;
  return createErrorResponse(
    400,
    message,
    'VALIDATION_ERROR',
    { validationErrors: errors },
    requestId
  );
};

// Unauthorized response
export const createUnauthorizedResponse = (
  message: string = 'Invalid credentials',
  requestId?: string
): APIGatewayProxyResult => {
  return createErrorResponse(401, message, 'UNAUTHORIZED', undefined, requestId);
};

// Conflict response (for duplicate users)
export const createConflictResponse = (
  message: string,
  requestId?: string
): APIGatewayProxyResult => {
  return createErrorResponse(409, message, 'CONFLICT', undefined, requestId);
};

// Internal server error response
export const createInternalServerErrorResponse = (
  message: string = 'Internal server error',
  requestId?: string,
  details?: any
): APIGatewayProxyResult => {
  return createErrorResponse(500, message, 'INTERNAL_ERROR', details, requestId);
};