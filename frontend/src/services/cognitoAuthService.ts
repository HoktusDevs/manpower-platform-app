import { AuthenticationDetails, CognitoUser, CognitoUserPool, CognitoUserSession, CognitoUserAttribute } from 'amazon-cognito-identity-js';
import type { 
  User, 
  RegisterRequest, 
  LoginRequest, 
  AuthResponse, 
  CognitoConfig 
} from '../types/auth';

class CognitoAuthService {
  private userPool: CognitoUserPool | null = null;
  private currentUser: CognitoUser | null = null;
  private config: CognitoConfig | null = null;

  /**
   * Initialize the Cognito service with configuration
   */
  initialize(config: CognitoConfig): void {
    this.config = config;
    this.userPool = new CognitoUserPool({
      UserPoolId: config.userPoolId,
      ClientId: config.userPoolClientId,
    });
  }

  /**
   * Register a new user
   */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    if (!this.userPool) {
      throw new Error('Cognito not initialized');
    }

    const { email, password, fullName, role } = request;
    const [firstName, ...lastNameParts] = fullName.trim().split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    const attributeList = [
      new CognitoUserAttribute({
        Name: 'email',
        Value: email.toLowerCase(),
      }),
      new CognitoUserAttribute({
        Name: 'given_name',
        Value: firstName,
      }),
      new CognitoUserAttribute({
        Name: 'family_name',
        Value: lastName,
      }),
      new CognitoUserAttribute({
        Name: 'custom:role',
        Value: role,
      }),
    ];

    return new Promise((resolve) => {
      this.userPool!.signUp(email, password, attributeList, [], (err, result) => {
        if (err) {
          console.error('Registration error:', err);
          resolve({
            success: false,
            message: this.translateCognitoError(err.message),
          });
          return;
        }

        if (result?.user) {
          // Auto-confirm in development (handled by Lambda trigger)
          resolve({
            success: true,
            message: 'Registration successful. Please check your email for verification.',
            data: {
              user: {
                userId: result.userSub,
                email: email.toLowerCase(),
                fullName,
                role,
                emailVerified: false,
              },
            },
          });
        }
      });
    });
  }

  /**
   * Login user
   */
  async login(request: LoginRequest): Promise<AuthResponse> {
    if (!this.userPool) {
      throw new Error('Cognito not initialized');
    }

    const { email, password } = request;
    const userData = {
      Username: email.toLowerCase(),
      Pool: this.userPool,
    };

    const cognitoUser = new CognitoUser(userData);
    const authenticationData = {
      Username: email.toLowerCase(),
      Password: password,
    };

    const authenticationDetails = new AuthenticationDetails(authenticationData);

    return new Promise((resolve) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: async (session: CognitoUserSession) => {
          this.currentUser = cognitoUser;
          
          try {
            const user = await this.getUserFromSession(session, cognitoUser);
            this.saveTokens(session);
            
            resolve({
              success: true,
              message: 'Login successful',
              data: {
                user,
                accessToken: session.getAccessToken().getJwtToken(),
                idToken: session.getIdToken().getJwtToken(),
                refreshToken: session.getRefreshToken().getToken(),
              },
            });
          } catch (error) {
            console.error('Error parsing user data:', error);
            resolve({
              success: false,
              message: 'Error parsing user information',
            });
          }
        },

        onFailure: (err) => {
          console.error('Login error:', err);
          resolve({
            success: false,
            message: this.translateCognitoError(err.message),
          });
        },

        newPasswordRequired: (userAttributes) => {
          // Handle new password required (for admin-created users)
          resolve({
            success: false,
            message: 'New password required. Please contact administrator.',
          });
        },

        mfaRequired: (challengeName, challengeParameters) => {
          // Handle MFA challenge
          resolve({
            success: false,
            message: 'MFA verification required. Feature coming soon.',
          });
        },
      });
    });
  }

  /**
   * Logout current user
   */
  logout(): void {
    if (this.currentUser) {
      this.currentUser.signOut();
      this.currentUser = null;
    }
    
    // Clear stored tokens
    localStorage.removeItem('cognito_access_token');
    localStorage.removeItem('cognito_id_token');
    localStorage.removeItem('cognito_refresh_token');
    localStorage.removeItem('cognito_user');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null && this.isTokenValid();
  }

  /**
   * SECURITY: Validate token is still valid and user has proper role access
   */
  isTokenValid(): boolean {
    try {
      const user = this.getCurrentUser();
      if (!user || !user.role) {
        console.warn('🚨 SECURITY: No user or role found');
        return false;
      }

      const accessToken = localStorage.getItem('cognito_access_token');
      if (!accessToken) {
        console.warn('🚨 SECURITY: No access token found');
        return false;
      }

      // Basic JWT validation (check if token is expired)
      const tokenPayload = this.parseJWT(accessToken);
      const now = Math.floor(Date.now() / 1000);
      
      if (tokenPayload.exp && tokenPayload.exp < now) {
        console.warn('🚨 SECURITY: Access token expired');
        return false;
      }

      // Verify token belongs to current user
      // In Cognito, username is the UUID, not the email
      if (tokenPayload.username && tokenPayload.username !== user.userId) {
        console.error('🚨 SECURITY: Token username mismatch');
        return false;
      }

      return true;
    } catch (error) {
      console.error('🚨 SECURITY: Token validation failed:', error);
      return false;
    }
  }

  /**
   * SECURITY: Parse JWT token (basic validation)
   */
  private parseJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    } catch {
      return {};
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem('cognito_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(): Promise<string | null> {
    const accessToken = localStorage.getItem('cognito_access_token');
    const refreshToken = localStorage.getItem('cognito_refresh_token');

    if (!accessToken || !refreshToken) {
      return null;
    }

    // Check if token is expired
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp > now + 300) { // 5 minutes buffer
        return accessToken;
      }

      // Token is expired, try to refresh
      return await this.refreshAccessToken();
    } catch (error) {
      console.error('Error checking token validity:', error);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<string | null> {
    if (!this.userPool) {
      return null;
    }

    const refreshToken = localStorage.getItem('cognito_refresh_token');
    if (!refreshToken) {
      return null;
    }

    return new Promise((resolve) => {
      const cognitoUser = this.userPool!.getCurrentUser();
      if (!cognitoUser) {
        resolve(null);
        return;
      }

      cognitoUser.getSession((err: any, session: CognitoUserSession) => {
        if (err) {
          console.error('Error refreshing token:', err);
          resolve(null);
          return;
        }

        if (session.isValid()) {
          this.saveTokens(session);
          resolve(session.getAccessToken().getJwtToken());
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Save user data
   */
  setUserData(user: User): void {
    localStorage.setItem('cognito_user', JSON.stringify(user));
  }

  /**
   * Confirm user registration with verification code
   */
  async confirmRegistration(email: string, code: string): Promise<AuthResponse> {
    if (!this.userPool) {
      throw new Error('Cognito not initialized');
    }

    const userData = {
      Username: email.toLowerCase(),
      Pool: this.userPool,
    };

    const cognitoUser = new CognitoUser(userData);

    return new Promise((resolve) => {
      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
          resolve({
            success: false,
            message: this.translateCognitoError(err.message),
          });
          return;
        }

        resolve({
          success: true,
          message: 'Email verified successfully',
        });
      });
    });
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<AuthResponse> {
    if (!this.userPool) {
      throw new Error('Cognito not initialized');
    }

    const userData = {
      Username: email.toLowerCase(),
      Pool: this.userPool,
    };

    const cognitoUser = new CognitoUser(userData);

    return new Promise((resolve) => {
      cognitoUser.forgotPassword({
        onSuccess: () => {
          resolve({
            success: true,
            message: 'Password reset code sent to your email',
          });
        },
        onFailure: (err) => {
          resolve({
            success: false,
            message: this.translateCognitoError(err.message),
          });
        },
      });
    });
  }

  /**
   * Confirm password reset with code
   */
  async confirmPassword(email: string, code: string, newPassword: string): Promise<AuthResponse> {
    if (!this.userPool) {
      throw new Error('Cognito not initialized');
    }

    const userData = {
      Username: email.toLowerCase(),
      Pool: this.userPool,
    };

    const cognitoUser = new CognitoUser(userData);

    return new Promise((resolve) => {
      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => {
          resolve({
            success: true,
            message: 'Password updated successfully',
          });
        },
        onFailure: (err) => {
          resolve({
            success: false,
            message: this.translateCognitoError(err.message),
          });
        },
      });
    });
  }

  // Private helper methods
  private async getUserFromSession(session: CognitoUserSession, cognitoUser: CognitoUser): Promise<User> {
    const idTokenPayload = session.getIdToken().decodePayload();
    
    return new Promise((resolve, reject) => {
      cognitoUser.getUserAttributes((err, attributes) => {
        if (err) {
          reject(err);
          return;
        }

        const attrs: { [key: string]: string } = {};
        attributes?.forEach(attr => {
          attrs[attr.getName()] = attr.getValue();
        });

        const user: User = {
          userId: idTokenPayload.sub,
          email: attrs.email,
          fullName: `${attrs.given_name} ${attrs.family_name}`.trim(),
          role: attrs['custom:role'] as 'admin' | 'postulante',
          emailVerified: attrs.email_verified === 'true',
          mfaEnabled: idTokenPayload['cognito:mfa_enabled'] === true,
        };

        this.setUserData(user);
        resolve(user);
      });
    });
  }

  private saveTokens(session: CognitoUserSession): void {
    localStorage.setItem('cognito_access_token', session.getAccessToken().getJwtToken());
    localStorage.setItem('cognito_id_token', session.getIdToken().getJwtToken());
    localStorage.setItem('cognito_refresh_token', session.getRefreshToken().getToken());
  }

  private translateCognitoError(error: string): string {
    const errorMap: { [key: string]: string } = {
      'User does not exist.': 'Usuario no encontrado',
      'Incorrect username or password.': 'Email o contraseña incorrectos',
      'User is not confirmed.': 'Usuario no verificado. Revisa tu email.',
      'Invalid verification code provided, please try again.': 'Código de verificación inválido',
      'Password attempts exceeded': 'Demasiados intentos. Intenta más tarde.',
      'UsernameExistsException': 'Un usuario con este email ya existe',
      'InvalidPasswordException': 'La contraseña no cumple con los requisitos',
    };

    return errorMap[error] || 'Error de autenticación';
  }
}

export const cognitoAuthService = new CognitoAuthService();