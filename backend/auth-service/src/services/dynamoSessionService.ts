import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

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

// DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(dynamoClient);

// Session expires in 30 minutes
const SESSION_EXPIRY_MS = 30 * 60 * 1000;

// Secret key for signing session tokens
const SESSION_SECRET = process.env.SESSION_SECRET || 'super-secret-session-key-change-in-production';

export class DynamoSessionService {
  private static readonly TABLE_NAME = process.env.SESSIONS_TABLE || 'auth-sessions-dev';

  /**
   * Generate a cryptographically secure session key and store session data in DynamoDB
   */
  static async createSession(cognitoSub: string, email: string, userType: 'admin' | 'postulante', tokens: SessionData['tokens']): Promise<string> {
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

    // Store session data in DynamoDB
    await dynamo.send(new PutCommand({
      TableName: this.TABLE_NAME,
      Item: {
        sessionId,
        ...sessionData,
        ttl: Math.floor((now + SESSION_EXPIRY_MS) / 1000), // TTL in seconds for DynamoDB
      },
    }));

    // Create signed token
    const sessionKey = this.signSessionToken(payload);

    console.log(`✅ Created secure session in DynamoDB for user: ${email}`);
    return sessionKey;
  }

  /**
   * Exchange session key for user data and tokens (with cryptographic verification)
   */
  static async exchangeSession(sessionKey: string): Promise<{ user: { id: string; email: string; userType: 'admin' | 'postulante'; cognitoSub: string }, tokens: SessionData['tokens'] } | null> {
    try {
      // Verify and decode the session token
      const payload = this.verifySessionToken(sessionKey);
      if (!payload) {
        console.log('❌ Invalid session token signature');
        return null;
      }

      // Check token expiration
      if (Date.now() > payload.exp) {
        console.log('❌ Session token expired');
        return null;
      }

      // Get session data from DynamoDB
      const result = await dynamo.send(new GetCommand({
        TableName: this.TABLE_NAME,
        Key: { sessionId: payload.sessionId },
      }));

      const sessionData = result.Item as SessionData;
      if (!sessionData) {
        console.log(`❌ Session data not found in DynamoDB for sessionId: ${payload.sessionId}`);
        return null;
      }

      // Verify session data integrity
      if (sessionData.cognitoSub !== payload.cognitoSub ||
          sessionData.email !== payload.email ||
          sessionData.userType !== payload.userType) {
        console.log('❌ Session payload mismatch');
        await this.deleteSession(payload.sessionId);
        return null;
      }

      // Delete the session after use (one-time use)
      await this.deleteSession(payload.sessionId);

      console.log(`✅ Successfully exchanged session from DynamoDB for user: ${sessionData.email}`);

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
      console.error('❌ Error exchanging session:', error);
      return null;
    }
  }

  /**
   * Delete session from DynamoDB
   */
  private static async deleteSession(sessionId: string): Promise<void> {
    try {
      await dynamo.send(new DeleteCommand({
        TableName: this.TABLE_NAME,
        Key: { sessionId },
      }));
      console.log(`🗑️ Deleted session from DynamoDB: ${sessionId}`);
    } catch (error) {
      console.error('Error deleting session:', error);
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
      console.error('Error verifying session token:', error);
      return null;
    }
  }
}