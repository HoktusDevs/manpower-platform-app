import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { EvolutionApiService } from '../services/evolutionApiService';
import { WhatsAppService } from '../services/whatsappService';
import { EvolutionApiConfig } from '../types';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const evolutionConfig: EvolutionApiConfig = {
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
 * Crear nueva sesión de WhatsApp
 */
export const createSession = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { companyId, instanceName } = body;

    if (!companyId || !instanceName) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'companyId e instanceName son requeridos'
        })
      };
    }

    const result = await whatsappService.createSession(companyId, instanceName);

    return {
      statusCode: result.success ? 201 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error: any) {
    console.error('Error creating session:', error);
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
 * Obtener sesión por ID de empresa
 */
export const getSessionByCompany = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const companyId = event.pathParameters?.companyId;

    if (!companyId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'companyId es requerido'
        })
      };
    }

    const session = await whatsappService.getSessionByCompany(companyId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        session
      })
    };
  } catch (error: any) {
    console.error('Error getting session:', error);
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
 * Obtener estado de sesión
 */
export const getSessionStatus = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionId = event.pathParameters?.sessionId;

    if (!sessionId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'sessionId es requerido'
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

    // Verificar estado en Evolution API
    const evolutionStatus = await evolutionApi.getInstanceStatus(session.instanceName);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        session: {
          ...session,
          connected: evolutionStatus.connected,
          qrCode: evolutionStatus.qrCode || session.qrCode
        }
      })
    };
  } catch (error: any) {
    console.error('Error getting session status:', error);
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
 * Eliminar sesión
 */
export const deleteSession = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionId = event.pathParameters?.sessionId;

    if (!sessionId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'sessionId es requerido'
        })
      };
    }

    const success = await whatsappService.deleteSession(sessionId);

    return {
      statusCode: success ? 200 : 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success,
        message: success ? 'Sesión eliminada correctamente' : 'Sesión no encontrada'
      })
    };
  } catch (error: any) {
    console.error('Error deleting session:', error);
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
