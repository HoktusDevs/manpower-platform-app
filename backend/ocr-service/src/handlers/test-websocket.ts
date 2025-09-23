import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const testWebSocket = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Testing WebSocket connection...');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        message: 'WebSocket test endpoint is working',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error: any) {
    console.error('Error in testWebSocket handler:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};
