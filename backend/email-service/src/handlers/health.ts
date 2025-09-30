import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const checkHealth = async (
  _event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      success: true,
      service: 'email-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    }),
  };
};