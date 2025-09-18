import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DiscoveryService } from '../services/discoveryService';
import { DiscoveryResponse } from '../types';

const discoveryService = new DiscoveryService();

const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  body: JSON.stringify(body),
});

export const getServices: APIGatewayProxyHandler = async (event) => {
  try {
    console.log('Starting service discovery...');

    const services = await discoveryService.discoverServices();
    const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;

    const response: DiscoveryResponse = {
      success: true,
      message: 'Services discovered successfully',
      services,
      timestamp: new Date().toISOString(),
      totalServices: Object.keys(services).length,
      healthyServices: healthyCount,
    };

    console.log(`Discovery completed: ${healthyCount}/${Object.keys(services).length} services healthy`);

    return createResponse(200, response);
  } catch (error) {
    console.error('Error in service discovery:', error);

    const errorResponse: DiscoveryResponse = {
      success: false,
      message: 'Failed to discover services',
      services: {},
      timestamp: new Date().toISOString(),
      totalServices: 0,
      healthyServices: 0,
    };

    return createResponse(500, errorResponse);
  }
};