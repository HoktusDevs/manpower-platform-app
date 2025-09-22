import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { EvolutionApiService } from '../services/evolutionApiService';
import { WhatsAppService } from '../services/whatsappService';
import { SendMessageRequest } from '../types';

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
 * Enviar mensaje de WhatsApp
 */
export const sendMessage = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { to, message, type, mediaUrl, fileName, companyId } = body;

    if (!to || !message || !companyId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'to, message y companyId son requeridos'
        })
      };
    }

    const request: SendMessageRequest = {
      to,
      message,
      type: type || 'text',
      mediaUrl,
      fileName,
      companyId
    };

    const result = await whatsappService.sendMessage(request);

    return {
      statusCode: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error: any) {
    console.error('Error sending message:', error);
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
 * Enviar mensaje de texto
 */
export const sendTextMessage = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { to, message, companyId } = body;

    if (!to || !message || !companyId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'to, message y companyId son requeridos'
        })
      };
    }

    const request: SendMessageRequest = {
      to,
      message,
      type: 'text',
      companyId
    };

    const result = await whatsappService.sendMessage(request);

    return {
      statusCode: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error: any) {
    console.error('Error sending text message:', error);
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
 * Enviar mensaje con media
 */
export const sendMediaMessage = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { to, message, mediaUrl, type, fileName, companyId } = body;

    if (!to || !mediaUrl || !companyId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'to, mediaUrl y companyId son requeridos'
        })
      };
    }

    const request: SendMessageRequest = {
      to,
      message,
      type: type || 'image',
      mediaUrl,
      fileName,
      companyId
    };

    const result = await whatsappService.sendMessage(request);

    return {
      statusCode: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error: any) {
    console.error('Error sending media message:', error);
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
