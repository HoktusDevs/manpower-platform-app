/**
 * Service for exchanging sessionKey for authentication tokens
 */

interface ExchangeSessionResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    userType: 'admin' | 'postulante';
    cognitoSub: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    idToken: string;
    expiresIn: number;
  };
}

export class SessionExchangeService {
  private static readonly AUTH_SERVICE_URL = 'https://7pptifb3zk.execute-api.us-east-1.amazonaws.com/dev';

  /**
   * Exchange sessionKey for authentication tokens
   */
  static async exchangeSessionKey(sessionKey: string): Promise<{ success: boolean; message: string; tokens?: { accessToken: string; refreshToken: string; idToken: string; expiresIn: number }; user?: { id: string; email: string; userType: string } }> {
    try {
      console.log('🔄 Exchanging sessionKey for tokens...');

      const response = await fetch(`${this.AUTH_SERVICE_URL}/auth/exchange-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionKey }),
      });

      const data: ExchangeSessionResponse = await response.json();


      if (!response.ok) {
        console.error('❌ Session exchange failed:', data.message);
        return {
          success: false,
          message: data.message || 'Session exchange failed',
        };
      }

      if (data.success && data.user && data.tokens) {
        // Store tokens in localStorage using same keys as useAuth
        localStorage.setItem('cognito_access_token', data.tokens.accessToken);
        localStorage.setItem('cognito_id_token', data.tokens.idToken);
        localStorage.setItem('user', JSON.stringify({
          sub: data.user.id,
          email: data.user.email,
          fullName: data.user.email.split('@')[0], // Use email prefix as fullName
          'custom:role': data.user.userType,
          email_verified: true,
        }));

        console.log('✅ Session exchanged successfully for user:', data.user.email);

        return {
          success: true,
          message: 'Session exchanged successfully',
          tokens: data.tokens,
          user: data.user,
        };
      }

      return {
        success: false,
        message: 'Invalid session response',
      };
    } catch (error) {
      console.error('❌ Error exchanging session:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Get sessionKey from URL parameters
   */
  static getSessionKeyFromURL(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionKey = urlParams.get('sessionKey');
    
    if (sessionKey) {
      // Clean up URL after getting sessionKey
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
      console.log('✨ URL cleaned, sessionKey extracted');
    }

    return sessionKey;
  }
}