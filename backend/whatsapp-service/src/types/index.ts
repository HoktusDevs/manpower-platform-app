export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: number;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    url?: string;
  };
}

export interface WhatsAppSession {
  sessionId: string;
  instanceName: string;
  status: 'connected' | 'disconnected' | 'connecting';
  qrCode?: string;
  createdAt: number;
  lastActivity: number;
  companyId: string;
}

export interface SendMessageRequest {
  to: string;
  message: string;
  type?: 'text' | 'image' | 'document' | 'audio' | 'video';
  mediaUrl?: string;
  fileName?: string;
  companyId: string;
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WebhookPayload {
  event: 'message' | 'status' | 'session';
  data: {
    sessionId: string;
    message?: WhatsAppMessage;
    status?: string;
    qrCode?: string;
  };
}

export interface EvolutionApiConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
}
