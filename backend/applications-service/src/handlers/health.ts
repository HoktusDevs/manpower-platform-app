import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';

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

export const checkHealth: APIGatewayProxyHandler = async () => {
  return createResponse(200, {
    success: true,
    message: 'Applications service is healthy',
    timestamp: new Date().toISOString(),
  });
};
