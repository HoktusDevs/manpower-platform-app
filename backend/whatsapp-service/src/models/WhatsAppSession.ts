import { WhatsAppSession } from '../types';

export class WhatsAppSessionModel {
  static create(sessionData: Omit<WhatsAppSession, 'createdAt' | 'lastActivity'>): WhatsAppSession {
    const now = Date.now();
    return {
      ...sessionData,
      createdAt: now,
      lastActivity: now
    };
  }

  static updateActivity(session: WhatsAppSession): WhatsAppSession {
    return {
      ...session,
      lastActivity: Date.now()
    };
  }

  static updateStatus(session: WhatsAppSession, status: WhatsAppSession['status']): WhatsAppSession {
    return {
      ...session,
      status,
      lastActivity: Date.now()
    };
  }

  static updateQrCode(session: WhatsAppSession, qrCode: string): WhatsAppSession {
    return {
      ...session,
      qrCode,
      lastActivity: Date.now()
    };
  }
}
