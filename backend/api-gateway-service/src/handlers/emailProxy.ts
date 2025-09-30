import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import axios from 'axios';

const EMAIL_SERVICE_URL = 'https://ys0awkongk.execute-api.us-east-1.amazonaws.com/dev';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract path from proxy parameter
    const path = event.pathParameters?.proxy || '';
    const method = event.httpMethod;
    const targetUrl = `${EMAIL_SERVICE_URL}/${path}`;

    console.log(`Proxying ${method} request to: ${targetUrl}`);
    console.log('Event body type:', typeof event.body);
    console.log('Event body:', event.body);

    // Forward the request to email service
    let requestData;
    if (event.body) {
      try {
        requestData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (e) {
        console.error('Failed to parse body:', e);
        requestData = event.body;
      }
    }
    console.log('Request data:', JSON.stringify(requestData));

    const response = await axios({
      method: method as any,
      url: targetUrl,
      data: requestData,
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // Don't throw on any status code
    });

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
      body: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
    };
  } catch (error: any) {
    console.error('Proxy error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: 'Proxy error',
        error: error.message,
      }),
    };
  }
};
