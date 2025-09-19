import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

interface SessionData {
  cognitoSub: string;
  email: string;
  userType: 'admin' | 'postulante';
  tokens: {
    accessToken: string;
    refreshToken: string;
    idToken: string;
    expiresIn: number;
  };
  createdAt: number;
  expiresAt: number;
}

// File-based storage for Lambda persistence (use Redis in production)
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const SESSION_FILE = '/tmp/sessions.json';

class FileSessionStore {
  private getStore(): Map<string, SessionData> {
    try {
      if (existsSync(SESSION_FILE)) {
        const data = readFileSync(SESSION_FILE, 'utf8');
        const sessions = JSON.parse(data);
        return new Map(Object.entries(sessions));
      }
    } catch (error) {
      console.log('Error reading session file:', error);
    }
    return new Map();
  }

  private saveStore(store: Map<string, SessionData>) {
    try {
      const data = Object.fromEntries(store);
      writeFileSync(SESSION_FILE, JSON.stringify(data), 'utf8');
    } catch (error) {
      console.log('Error writing session file:', error);
    }
  }

  set(key: string, value: SessionData) {
    const store = this.getStore();
    store.set(key, value);
    this.saveStore(store);
  }

  get(key: string): SessionData | undefined {
    const store = this.getStore();
    return store.get(key);
  }

  delete(key: string): boolean {
    const store = this.getStore();
    const result = store.delete(key);
    this.saveStore(store);
    return result;
  }

  entries(): IterableIterator<[string, SessionData]> {
    const store = this.getStore();
    return store.entries();
  }
}

const sessionStore = new FileSessionStore();

// Session expires in 30 minutes
const SESSION_EXPIRY_MS = 30 * 60 * 1000;

// Secret key for signing session tokens (use environment variable in production)
const SESSION_SECRET = process.env.SESSION_SECRET || 'super-secret-session-key-change-in-production';

export class SessionService {
  /**
   * Generate a cryptographically secure session key and store session data
   */
  static createSession(cognitoSub: string, email: string, userType: 'admin' | 'postulante', tokens: SessionData['tokens']): string {
    const now = Date.now();
    const sessionId = randomBytes(16).toString('hex');

    // Create signed session token
    const payload = {
      sessionId,
      cognitoSub,
      email,
      userType,
      iat: now,
      exp: now + SESSION_EXPIRY_MS,
    };

    const sessionData: SessionData = {
      cognitoSub,
      email,
      userType,
      tokens,
      createdAt: now,
      expiresAt: now + SESSION_EXPIRY_MS,
    };

    // Store session data using sessionId
    sessionStore.set(sessionId, sessionData);

    // Create cryptographically signed session key
    const sessionKey = this.signSessionToken(payload);

    // Clean up expired sessions
    this.cleanupExpiredSessions();

    console.log(`Created secure session key for user: ${email}`);
    return sessionKey;
  }

  /**
   * Exchange session key for user data and tokens (with cryptographic verification)
   */
  static exchangeSession(sessionKey: string): { user: { id: string; email: string; userType: 'admin' | 'postulante'; cognitoSub: string }, tokens: SessionData['tokens'] } | null {
    try {
      // Verify and decode the session token
      const payload = this.verifySessionToken(sessionKey);
      if (!payload) {
        console.log('Invalid session token signature');
        return null;
      }

      // Check token expiration
      if (Date.now() > payload.exp) {
        console.log('Session token expired');
        return null;
      }

      // Get session data from store
      const sessionData = sessionStore.get(payload.sessionId);
      if (!sessionData) {
        console.log(`Session data not found for sessionId: ${payload.sessionId}`);
        return null;
      }

      // Double-check expiration from stored data
      if (Date.now() > sessionData.expiresAt) {
        console.log('Stored session expired');
        sessionStore.delete(payload.sessionId);
        return null;
      }

      // Verify payload matches stored data
      if (sessionData.cognitoSub !== payload.cognitoSub ||
          sessionData.email !== payload.email ||
          sessionData.userType !== payload.userType) {
        console.log('Session payload mismatch');
        sessionStore.delete(payload.sessionId);
        return null;
      }

      // Delete the session after use (one-time use)
      sessionStore.delete(payload.sessionId);

      console.log(`Successfully exchanged session for user: ${sessionData.email}`);

      return {
        user: {
          id: sessionData.cognitoSub,
          email: sessionData.email,
          userType: sessionData.userType,
          cognitoSub: sessionData.cognitoSub,
        },
        tokens: sessionData.tokens,
      };
    } catch (error) {
      console.error('Error exchanging session:', error);
      return null;
    }
  }

  /**
   * Clean up expired sessions
   */
  private static cleanupExpiredSessions(): void {
    const now = Date.now();
    const store = (sessionStore as any).getStore();
    for (const [key, session] of store.entries()) {
      if (now > session.expiresAt) {
        sessionStore.delete(key);
      }
    }
  }

  /**
   * Sign a session token using HMAC-SHA256
   */
  private static signSessionToken(payload: any): string {
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', SESSION_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    return `${payloadBase64}.${signature}`;
  }

  /**
   * Verify and decode a session token
   */
  private static verifySessionToken(token: string): any | null {
    try {
      const [payloadBase64, signature] = token.split('.');
      if (!payloadBase64 || !signature) {
        return null;
      }

      // Verify signature
      const expectedSignature = createHmac('sha256', SESSION_SECRET)
        .update(payloadBase64)
        .digest('base64url');

      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
      }

      // Decode payload
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString());
      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get session store stats (for debugging)
   */
  static getStats(): { totalSessions: number; activeSessions: number } {
    this.cleanupExpiredSessions();
    const store = (sessionStore as any).getStore();
    return {
      totalSessions: store.size,
      activeSessions: store.size,
    };
  }
}