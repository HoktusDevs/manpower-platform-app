import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const checkHealth = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify({
      status: 'healthy',
      service: 'whatsapp-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  };
};
