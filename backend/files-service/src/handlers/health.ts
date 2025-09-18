import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';

const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  },
  body: JSON.stringify(body),
});

export const checkHealth: APIGatewayProxyHandler = async (event) => {
  try {
    const response = {
      service: 'files-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      dependencies: {
        s3: 'healthy',
        dynamodb: 'healthy',
      },
    };

    return createResponse(200, response);
  } catch (error) {
    console.error('Health check error:', error);

    const response = {
      service: 'files-service',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      error: 'Service unhealthy',
    };

    return createResponse(503, response);
  }
};