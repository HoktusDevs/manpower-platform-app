import axios, { AxiosInstance } from 'axios';
import { EvolutionApiConfig, SendMessageRequest, WhatsAppMessage, WhatsAppSession } from '../types';

export class EvolutionApiService {
  private client: AxiosInstance;
  private config: EvolutionApiConfig;

  constructor(config: EvolutionApiConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Crear una nueva instancia de WhatsApp
   * Nota: El servicio de Railway ya está configurado, no necesitamos crear instancias
   */
  async createInstance(instanceName: string): Promise<{ success: boolean; qrCode?: string; error?: string }> {
    // El servicio de Railway ya está funcionando, no necesitamos crear instancias
    return { success: true };
  }

  /**
   * Obtener el estado de una instancia
   * Nota: El servicio de Railway siempre está conectado
   */
  async getInstanceStatus(instanceName: string): Promise<{ connected: boolean; qrCode?: string }> {
    // El servicio de Railway siempre está conectado
    return { connected: true };
  }

  /**
   * Enviar mensaje de texto usando el servicio de Railway
   */
  async sendTextMessage(instanceName: string, to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await this.client.post('/whatsapp/send_message', {
        phone_user: to,
        message: message
      });

      if (response.data.success) {
        return {
          success: true,
          messageId: `msg_${Date.now()}` // Generar ID único
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Error enviando mensaje'
        };
      }
    } catch (error: any) {
      console.error('Error sending text message:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  /**
   * Enviar mensaje con media usando el servicio de Railway
   * Nota: El servicio de Railway no soporta media directamente, usamos mensaje de texto
   */
  async sendMediaMessage(
    instanceName: string, 
    to: string, 
    mediaUrl: string, 
    type: 'image' | 'document' | 'audio' | 'video',
    caption?: string,
    fileName?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Enviar como mensaje de texto con enlace al media
      const message = caption || `Archivo ${fileName || type}: ${mediaUrl}`;
      
      const response = await this.client.post('/whatsapp/send_message', {
        phone_user: to,
        message: message
      });

      if (response.data.success) {
        return {
          success: true,
          messageId: `media_${Date.now()}` // Generar ID único
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Error enviando media'
        };
      }
    } catch (error: any) {
      console.error('Error sending media message:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  /**
   * Enviar mensaje de plantilla usando el servicio de Railway
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    templateParameters: Array<{ type: string; text: string }>,
    userName: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await this.client.post('/whatsapp/send_template_message', {
        data: {
          userData: {
            phone: to,
            name_user: userName
          },
          messageData: {
            template_name: templateName,
            template_parameters: templateParameters,
            template_type: "normal"
          }
        }
      });

      if (response.data.success) {
        return {
          success: true,
          messageId: response.data.response?.messages?.[0]?.id || `template_${Date.now()}`
        };
      } else {
        return {
          success: false,
          error: response.data.response?.message || 'Error enviando plantilla'
        };
      }
    } catch (error: any) {
      console.error('Error sending template message:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  /**
   * Eliminar una instancia
   * Nota: El servicio de Railway no necesita eliminación
   */
  async deleteInstance(instanceName: string): Promise<{ success: boolean; error?: string }> {
    // El servicio de Railway no necesita eliminación
    return { success: true };
  }

  /**
   * Configurar webhook para recibir mensajes
   * Nota: El servicio de Railway maneja webhooks internamente
   */
  async setWebhook(instanceName: string, webhookUrl: string): Promise<{ success: boolean; error?: string }> {
    // El servicio de Railway maneja webhooks internamente
    return { success: true };
  }

  /**
   * Obtener información de la instancia
   * Nota: El servicio de Railway siempre está disponible
   */
  async getInstanceInfo(instanceName: string): Promise<any> {
    // El servicio de Railway siempre está disponible
    return {
      instanceName: instanceName,
      status: 'connected',
      provider: 'railway'
    };
  }
}
