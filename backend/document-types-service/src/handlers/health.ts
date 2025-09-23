import { APIGatewayProxyHandler } from 'aws-lambda';

export const checkHealth: APIGatewayProxyHandler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent, X-User-Id',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    },
    body: JSON.stringify({
      success: true,
      message: 'Document Types Service is healthy',
      timestamp: new Date().toISOString(),
      service: 'document-types-service'
    }),
  };
};
