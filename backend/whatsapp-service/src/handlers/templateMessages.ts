import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { EvolutionApiService } from '../services/evolutionApiService';
import { WhatsAppService } from '../services/whatsappService';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const evolutionConfig = {
  baseUrl: process.env.EVOLUTION_API_URL || 'https://whatsappchatbothardcoded-production.up.railway.app',
  apiKey: process.env.EVOLUTION_API_KEY || '',
  instanceName: ''
};

const evolutionApi = new EvolutionApiService(evolutionConfig);
const whatsappService = new WhatsAppService(
  docClient,
  evolutionApi,
  process.env.SESSIONS_TABLE || 'whatsapp-sessions'
);

/**
 * Enviar mensaje de plantilla
 */
export const sendTemplateMessage = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { 
      companyId, 
      to, 
      templateName, 
      templateParameters, 
      userName 
    } = body;

    if (!companyId || !to || !templateName || !templateParameters || !userName) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'companyId, to, templateName, templateParameters y userName son requeridos'
        })
      };
    }

    const result = await whatsappService.sendTemplateMessage(
      companyId,
      to,
      templateName,
      templateParameters,
      userName
    );

    return {
      statusCode: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error: any) {
    console.error('Error sending template message:', error);
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
