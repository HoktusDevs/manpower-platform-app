/**
 * Shared Token Service for cross-frontend authentication
 * This service manages JWT tokens and user sessions across different frontends
 */

export interface User {
  sub: string;
  email: string;
  'custom:role': string;
  email_verified: boolean;
}

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
const EXPIRES_KEY = 'tokenExpiresAt';

export class TokenService {
  private static instance: TokenService;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Load tokens from localStorage
   */
  private loadFromStorage(): void {
    try {
      this.accessToken = localStorage.getItem(TOKEN_KEY);
      this.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error loading tokens from storage:', error);
    }
  }

  /**
   * Store tokens in localStorage
   */
  setTokens(tokenData: TokenData): void {
    try {
      this.accessToken = tokenData.accessToken;
      localStorage.setItem(TOKEN_KEY, tokenData.accessToken);

      if (tokenData.refreshToken) {
        this.refreshToken = tokenData.refreshToken;
        localStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refreshToken);
      }

      if (tokenData.expiresAt) {
        localStorage.setItem(EXPIRES_KEY, tokenData.expiresAt.toString());
      }
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      this.accessToken = localStorage.getItem(TOKEN_KEY);
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Get current refresh token
   */
  getRefreshToken(): string | null {
    if (this.refreshToken) {
      return this.refreshToken;
    }

    try {
      this.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      return this.refreshToken;
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Store user data
   */
  setUser(user: User): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  }

  /**
   * Get current user data
   */
  getUser(): User | null {
    try {
      const userStr = localStorage.getItem(USER_KEY);
      if (!userStr) {
        return null;
      }
      return JSON.parse(userStr) as User;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const user = this.getUser();
    return !!(token && user);
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    try {
      const expiresAt = localStorage.getItem(EXPIRES_KEY);
      if (!expiresAt) {
        return false; // If no expiration time, assume valid
      }
      return Date.now() > parseInt(expiresAt);
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return false;
    }
  }

  /**
   * Clear all authentication data
   */
  clearAuth(): void {
    try {
      this.accessToken = null;
      this.refreshToken = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  /**
   * Get authorization header for API requests
   */
  getAuthHeader(): Record<string, string> {
    const token = this.getAccessToken();
    if (!token) {
      return {};
    }
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Refresh access token using refresh token
   * This method should be called by the auth service
   */
  async refreshAccessToken(authServiceUrl: string): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      const accessToken = this.getAccessToken();

      if (!refreshToken && !accessToken) {
        return false;
      }

      const response = await fetch(`${authServiceUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          refreshToken: refreshToken
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data?.accessToken) {
        this.setTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken || refreshToken,
          expiresAt: data.data.expiresAt
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Logout and redirect to auth frontend
   */
  logout(): void {
    this.clearAuth();

    // Redirect to auth frontend
    const authFrontendUrl = 'http://manpower-auth-frontend-dev.s3-website-us-east-1.amazonaws.com'; // auth-frontend S3 URL
    window.location.replace(`${authFrontendUrl}/login`);
  }
}

// Export singleton instance
export const tokenService = TokenService.getInstance();