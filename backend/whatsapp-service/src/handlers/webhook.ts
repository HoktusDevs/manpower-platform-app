import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { EvolutionApiService } from '../services/evolutionApiService';
import { WhatsAppService } from '../services/whatsappService';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const evolutionConfig = {
  baseUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
  apiKey: process.env.EVOLUTION_API_KEY || 'change-me',
  instanceName: ''
};

const evolutionApi = new EvolutionApiService(evolutionConfig);
const whatsappService = new WhatsAppService(
  docClient,
  evolutionApi,
  process.env.SESSIONS_TABLE || 'whatsapp-sessions'
);

/**
 * Procesar webhook de Evolution API
 */
export const processWebhook = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Verificar que el webhook viene de Evolution API
    const apiKey = event.headers['apikey'] || event.headers['Api-Key'];
    if (apiKey !== process.env.EVOLUTION_API_KEY) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'API Key inválida'
        })
      };
    }

    // Procesar el webhook
    await whatsappService.processWebhook(body);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Webhook procesado correctamente'
      })
    };
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Error interno del servidor'
      })
    };
  }
};

/**
 * Configurar webhook para una sesión
 */
export const setWebhook = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { sessionId, webhookUrl } = body;

    if (!sessionId || !webhookUrl) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'sessionId y webhookUrl son requeridos'
        })
      };
    }

    const session = await whatsappService.getSession(sessionId);
    if (!session) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Sesión no encontrada'
        })
      };
    }

    const result = await evolutionApi.setWebhook(session.instanceName, webhookUrl);

    return {
      statusCode: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error: any) {
    console.error('Error setting webhook:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Error interno del servidor'
      })
    };
  }
};
