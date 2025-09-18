import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DiscoveryService } from '../services/discoveryService';

const discoveryService = new DiscoveryService();

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
    const services = await discoveryService.discoverServices();
    const healthyServices = Object.values(services).filter(s => s.status === 'healthy');
    const totalServices = Object.values(services).length;

    const overallHealth = healthyServices.length === totalServices && totalServices > 0 ? 'healthy' : 'degraded';

    const response = {
      service: 'api-gateway-service',
      status: overallHealth,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      dependencies: Object.fromEntries(
        Object.entries(services).map(([name, service]) => [name, service.status])
      ),
      summary: {
        totalServices,
        healthyServices: healthyServices.length,
        unhealthyServices: totalServices - healthyServices.length,
      },
    };

    const statusCode = overallHealth === 'healthy' ? 200 : 503;
    return createResponse(statusCode, response);
  } catch (error) {
    console.error('Health check error:', error);

    const response = {
      service: 'api-gateway-service',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      error: 'Failed to check service health',
    };

    return createResponse(503, response);
  }
};