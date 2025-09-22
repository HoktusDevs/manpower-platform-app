import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { EvolutionApiService } from './evolutionApiService';
import { WhatsAppSession, SendMessageRequest, SendMessageResponse, WhatsAppMessage } from '../types';
import { WhatsAppSessionModel } from '../models/WhatsAppSession';

export class WhatsAppService {
  private dynamoClient: DynamoDBDocumentClient;
  private evolutionApi: EvolutionApiService;
  private sessionsTable: string;

  constructor(
    dynamoClient: DynamoDBDocumentClient,
    evolutionApi: EvolutionApiService,
    sessionsTable: string
  ) {
    this.dynamoClient = dynamoClient;
    this.evolutionApi = evolutionApi;
    this.sessionsTable = sessionsTable;
  }

  /**
   * Crear una nueva sesión de WhatsApp para una empresa
   * Nota: El servicio de Railway ya está configurado, solo creamos el registro
   */
  async createSession(companyId: string, instanceName: string): Promise<{ success: boolean; session?: WhatsAppSession; error?: string }> {
    try {
      // Verificar si ya existe una sesión para esta empresa
      const existingSession = await this.getSessionByCompany(companyId);
      if (existingSession) {
        return {
          success: false,
          error: 'Ya existe una sesión de WhatsApp para esta empresa'
        };
      }

      // El servicio de Railway ya está funcionando, solo creamos el registro
      const session = WhatsAppSessionModel.create({
        sessionId: instanceName,
        instanceName,
        status: 'connected', // Railway siempre está conectado
        companyId
      });

      await this.dynamoClient.send(new PutCommand({
        TableName: this.sessionsTable,
        Item: session
      }));

      return { success: true, session };
    } catch (error: any) {
      console.error('Error creating WhatsApp session:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener sesión por ID de empresa
   */
  async getSessionByCompany(companyId: string): Promise<WhatsAppSession | null> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.sessionsTable,
        IndexName: 'CompanyIdIndex',
        KeyConditionExpression: 'companyId = :companyId',
        ExpressionAttributeValues: {
          ':companyId': companyId
        }
      }));

      return result.Items?.[0] as WhatsAppSession || null;
    } catch (error: any) {
      console.error('Error getting session by company:', error);
      return null;
    }
  }

  /**
   * Obtener sesión por ID de sesión
   */
  async getSession(sessionId: string): Promise<WhatsAppSession | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: this.sessionsTable,
        Key: { sessionId }
      }));

      return result.Item as WhatsAppSession || null;
    } catch (error: any) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Actualizar estado de sesión
   */
  async updateSessionStatus(sessionId: string, status: WhatsAppSession['status']): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;

      const updatedSession = WhatsAppSessionModel.updateStatus(session, status);

      await this.dynamoClient.send(new PutCommand({
        TableName: this.sessionsTable,
        Item: updatedSession
      }));

      return true;
    } catch (error: any) {
      console.error('Error updating session status:', error);
      return false;
    }
  }

  /**
   * Enviar mensaje
   */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      // Obtener sesión de la empresa
      const session = await this.getSessionByCompany(request.companyId);
      if (!session) {
        return {
          success: false,
          error: 'No se encontró sesión de WhatsApp para esta empresa'
        };
      }

      if (session.status !== 'connected') {
        return {
          success: false,
          error: 'La sesión de WhatsApp no está conectada'
        };
      }

      let result;
      if (request.type === 'text' || !request.type) {
        result = await this.evolutionApi.sendTextMessage(
          session.instanceName,
          request.to,
          request.message
        );
      } else if (request.mediaUrl) {
        result = await this.evolutionApi.sendMediaMessage(
          session.instanceName,
          request.to,
          request.mediaUrl,
          request.type,
          request.message,
          request.fileName
        );
      } else {
        return {
          success: false,
          error: 'Tipo de mensaje no soportado o falta mediaUrl'
        };
      }

      if (result.success) {
        // Actualizar última actividad
        await this.updateSessionActivity(session.sessionId);
      }

      return result;
    } catch (error: any) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enviar mensaje de plantilla
   */
  async sendTemplateMessage(
    companyId: string,
    to: string,
    templateName: string,
    templateParameters: Array<{ type: string; text: string }>,
    userName: string
  ): Promise<SendMessageResponse> {
    try {
      // Obtener sesión de la empresa
      const session = await this.getSessionByCompany(companyId);
      if (!session) {
        return {
          success: false,
          error: 'No se encontró sesión de WhatsApp para esta empresa'
        };
      }

      if (session.status !== 'connected') {
        return {
          success: false,
          error: 'La sesión de WhatsApp no está conectada'
        };
      }

      const result = await this.evolutionApi.sendTemplateMessage(
        to,
        templateName,
        templateParameters,
        userName
      );

      if (result.success) {
        // Actualizar última actividad
        await this.updateSessionActivity(session.sessionId);
      }

      return result;
    } catch (error: any) {
      console.error('Error sending template message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Procesar webhook de Evolution API
   */
  async processWebhook(payload: any): Promise<void> {
    try {
      const { event, data } = payload;
      
      if (event === 'CONNECTION_UPDATE') {
        const { instance, state } = data;
        const session = await this.getSession(instance);
        if (session) {
          const newStatus = state === 'open' ? 'connected' : 'disconnected';
          await this.updateSessionStatus(session.sessionId, newStatus);
        }
      } else if (event === 'MESSAGES_UPSERT') {
        // Procesar mensaje recibido
        await this.processIncomingMessage(data);
      }
    } catch (error: any) {
      console.error('Error processing webhook:', error);
    }
  }

  /**
   * Procesar mensaje entrante
   */
  private async processIncomingMessage(data: any): Promise<void> {
    try {
      const { key, message } = data;
      const session = await this.getSession(key.remoteJid.split('@')[0]);
      
      if (session) {
        // Aquí puedes implementar lógica para procesar mensajes entrantes
        // Por ejemplo, guardar en base de datos, notificar a otros servicios, etc.
        console.log('Mensaje recibido:', message);
      }
    } catch (error: any) {
      console.error('Error processing incoming message:', error);
    }
  }

  /**
   * Actualizar actividad de sesión
   */
  private async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (session) {
        const updatedSession = WhatsAppSessionModel.updateActivity(session);
        await this.dynamoClient.send(new PutCommand({
          TableName: this.sessionsTable,
          Item: updatedSession
        }));
      }
    } catch (error: any) {
      console.error('Error updating session activity:', error);
    }
  }

  /**
   * Eliminar sesión
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;

      // Eliminar instancia de Evolution API
      await this.evolutionApi.deleteInstance(session.instanceName);

      // Eliminar sesión de DynamoDB
      await this.dynamoClient.send(new UpdateCommand({
        TableName: this.sessionsTable,
        Key: { sessionId },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': 'deleted'
        }
      }));

      return true;
    } catch (error: any) {
      console.error('Error deleting session:', error);
      return false;
    }
  }
}
