import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { ConfigService } from '../services/configService';
import { ConfigResponse } from '../types';

const configService = new ConfigService();

const createResponse = (statusCode: number, body: any, contentType: string = 'application/json'): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

export const getFrontendConfig: APIGatewayProxyHandler = async (event) => {
  try {
    console.log('Generating frontend configuration...');

    const config = await configService.getFrontendConfig();

    // Check if requesting JavaScript format
    const isJsRequest = event.path?.endsWith('.js') ||
                       event.path?.endsWith('/config.js') ||
                       event.headers?.Accept?.includes('application/javascript') ||
                       event.queryStringParameters?.format === 'js';

    if (isJsRequest) {
      const jsConfig = configService.generateJavaScriptConfig(config);
      return createResponse(200, jsConfig, 'application/javascript; charset=utf-8');
    }

    // Return JSON format
    const response: ConfigResponse = {
      success: true,
      message: 'Frontend configuration retrieved successfully',
      config,
      timestamp: new Date().toISOString(),
    };

    console.log('Configuration generated successfully');

    return createResponse(200, response);
  } catch (error) {
    console.error('Error generating frontend config:', error);

    const errorResponse: ConfigResponse = {
      success: false,
      message: 'Failed to retrieve frontend configuration',
      timestamp: new Date().toISOString(),
    };

    return createResponse(500, errorResponse);
  }
};