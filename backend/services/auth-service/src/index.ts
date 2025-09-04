import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { authHandler } from './authHandler';

/**
 * Auth Service Lambda Handler
 * 
 * This is the main entry point for the Authentication microservice.
 * It handles all authentication-related operations:
 * - User registration
 * - User login
 * - Token validation
 * - Password management
 * 
 * Endpoints:
 * - POST /register - User registration
 * - POST /login - User authentication
 * - GET /health - Service health check
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Set Lambda context for better logging
  console.log('Auth Service - Request ID:', context.awsRequestId);
  console.log('Auth Service - Function Name:', context.functionName);
  console.log('Auth Service - Remaining Time:', context.getRemainingTimeInMillis());
  
  try {
    // All authentication logic is delegated to authHandler
    return await authHandler(event);
  } catch (error) {
    console.error('Auth Service - Unhandled error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Auth service encountered an unexpected error',
        requestId: context.awsRequestId,
        timestamp: new Date().toISOString()
      })
    };
  }
};