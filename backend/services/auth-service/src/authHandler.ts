import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { registerUser, loginUser } from './authService';
import { RegisterRequest, LoginRequest } from './types/auth';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
  createHealthResponse,
  createValidationErrorResponse
} from './utils/response';
import { validateRegistrationRequest, validateLoginRequest } from './utils/validation';

// Parse JSON body
function parseJsonBody<T>(body: string | null): T {
  if (!body) {
    throw new Error('Request body is required');
  }
  
  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

// Register endpoint handler
export async function handleRegister(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('Register request received');
    
    // Validate request method
    if (event.httpMethod !== 'POST') {
      return createErrorResponse(405, 'Method not allowed');
    }
    
    // Parse request body
    const request = parseJsonBody<RegisterRequest>(event.body);
    
    // Validate request using auth-specific validation
    const validation = validateRegistrationRequest(request);
    if (!validation.valid) {
      return createValidationErrorResponse(validation.errors);
    }
    
    console.log('Processing registration for:', request.email);
    
    // Register user
    const result = await registerUser(request);
    
    return createSuccessResponse(result, 'User registered successfully');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';
    
    // Determine appropriate status code based on error message
    let statusCode = 500;
    if (errorMessage.includes('already exists')) {
      statusCode = 409; // Conflict
    } else if (errorMessage.includes('validation') || errorMessage.includes('Invalid') || errorMessage.includes('required')) {
      statusCode = 400; // Bad Request
    }
    
    return createErrorResponse(statusCode, errorMessage, 'AUTH_ERROR', error);
  }
}

// Login endpoint handler
export async function handleLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('Login request received');
    
    // Validate request method
    if (event.httpMethod !== 'POST') {
      return createErrorResponse(405, 'Method not allowed');
    }
    
    // Parse request body
    const request = parseJsonBody<LoginRequest>(event.body);
    
    // Validate request using auth-specific validation
    const validation = validateLoginRequest(request);
    if (!validation.valid) {
      return createValidationErrorResponse(validation.errors);
    }
    
    console.log('Processing login for:', request.email);
    
    // Login user
    const result = await loginUser(request);
    
    return createSuccessResponse(result, 'Login successful');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    
    // Determine appropriate status code
    let statusCode = 500;
    if (errorMessage.includes('Invalid') || errorMessage.includes('password') || errorMessage.includes('deactivated')) {
      statusCode = 401; // Unauthorized
    } else if (errorMessage.includes('required')) {
      statusCode = 400; // Bad Request
    }
    
    return createErrorResponse(statusCode, errorMessage, 'AUTH_ERROR', error);
  }
}

// Health check for auth service
export async function handleHealthCheck(): Promise<APIGatewayProxyResult> {
  return createHealthResponse();
}

// Main auth handler (routes to specific handlers)
export async function authHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Auth handler received request:', {
    path: event.path,
    method: event.httpMethod,
    headers: event.headers
  });
  
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createCorsResponse();
    }
    
    // Route based on path
    const path = event.path;
    
    if (path === '/auth/register') {
      return await handleRegister(event);
    }
    
    if (path === '/auth/login') {
      return await handleLogin(event);
    }
    
    if (path === '/auth/health') {
      return await handleHealthCheck();
    }
    
    // Default response for unknown paths
    return createErrorResponse(404, 'Auth endpoint not found', 'NOT_FOUND', {
      path,
      availableEndpoints: [
        'POST /auth/register',
        'POST /auth/login',
        'GET /auth/health'
      ]
    });
    
  } catch (error) {
    console.error('Unhandled error in auth handler:', error);
    return createErrorResponse(500, 'Internal server error', 'INTERNAL_ERROR', error);
  }
}