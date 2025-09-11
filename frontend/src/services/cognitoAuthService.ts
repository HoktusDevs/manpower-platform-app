import { AuthenticationDetails, CognitoUser, CognitoUserPool, CognitoUserSession, CognitoUserAttribute } from 'amazon-cognito-identity-js';
import type { 
  User, 
  RegisterRequest, 
  LoginRequest, 
  AuthResponse, 
  CognitoConfig 
} from '../types/auth';
import type { JWTPayload } from '../types/config';

class CognitoAuthService {
  private userPool: CognitoUserPool | null = null;
  private currentUser: CognitoUser | null = null;

  /**
   * Initialize the Cognito service with configuration
   */
  initialize(config: CognitoConfig): void {
    // Store configuration values directly in userPool initialization
    this.userPool = new CognitoUserPool({
      UserPoolId: config.userPoolId,
      ClientId: config.userPoolClientId,
    });

    // Skip Amplify configuration - let graphqlService handle it with complete config
    // This prevents configuration conflicts between cognitoAuthService and graphqlService
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

        newPasswordRequired: (/* _userAttributes */) => {
          // Handle new password required (for admin-created users)
          resolve({
            success: false,
            message: 'New password required. Please contact administrator.',
          });
        },

        mfaRequired: (/* _challengeName, _challengeParameters */) => {
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
    // Just clear the current user reference and let the parent handle localStorage
    if (this.currentUser) {
      try {
        this.currentUser.signOut();
      } catch (error) {
        console.warn('Error signing out current user:', error);
      }
      this.currentUser = null;
    }
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

      // Check for either access token or id token (we use id token for GraphQL)
      const accessToken = localStorage.getItem('cognito_access_token');
      const idToken = localStorage.getItem('cognito_id_token');
      
      if (!accessToken && !idToken) {
        console.warn('🚨 SECURITY: No tokens found');
        return false;
      }
      
      // Use whichever token exists
      const tokenToCheck = accessToken || idToken;

      // Basic JWT validation (check if token is expired)
      const tokenPayload = this.parseJWT(tokenToCheck!);
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
  private parseJWT(token: string): JWTPayload {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload) as JWTPayload;
    } catch {
      return {} as JWTPayload;
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
   * TEMPORARY: Update user role to admin (for development/testing)
   */
  async updateUserRole(newRole: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.currentUser) {
        reject(new Error('No user logged in'));
        return;
      }

      const attributeList = [
        new CognitoUserAttribute({
          Name: 'custom:role',
          Value: newRole,
        })
      ];

      this.currentUser.updateAttributes(attributeList, (err, result) => {
        if (err) {
          console.error('❌ Failed to update user role:', err);
          reject(err);
          return;
        }
        
        console.log('✅ User role updated successfully:', result);
        
        // Refresh the session to get updated tokens
        this.currentUser!.getSession((err: Error | null, session: CognitoUserSession | null) => {
          if (err) {
            console.error('❌ Failed to refresh session after role update:', err);
            reject(err);
            return;
          }
          
          if (session) {
            const idToken = session.getIdToken().getJwtToken();
            const accessToken = session.getAccessToken().getJwtToken();
            const refreshToken = session.getRefreshToken().getToken();
            
            // Update stored tokens
            localStorage.setItem('cognito_id_token', idToken);
            localStorage.setItem('cognito_access_token', accessToken);
            localStorage.setItem('cognito_refresh_token', refreshToken);
            
            console.log('✅ Session refreshed with new role');
            resolve(true);
          } else {
            reject(new Error('No session after refresh'));
          }
        });
      });
    });
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(): Promise<string | null> {
    const accessToken = localStorage.getItem('cognito_access_token');
    const idToken = localStorage.getItem('cognito_id_token');
    const refreshToken = localStorage.getItem('cognito_refresh_token');

    if (!accessToken || !refreshToken) {
      return null;
    }

    // Check if token is expired OR if it doesn't have custom:role claim
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Check ID token for custom:role claim
      let hasRoleClaim = false;
      if (idToken) {
        try {
          const idPayload = JSON.parse(atob(idToken.split('.')[1]));
          hasRoleClaim = Boolean(idPayload['custom:role']);
        } catch (e) {
          console.warn('Could not parse ID token for role check');
        }
      }
      
      // Force refresh if token is expired OR missing role claim
      if (payload.exp > now + 300 && hasRoleClaim) {
        return accessToken;
      }

      // Token is expired OR missing role claim, try to refresh
      console.log(hasRoleClaim ? '🔄 Token expired, refreshing...' : '🔄 Token missing role claim, refreshing...');
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
    console.log('🔄 Attempting to refresh access token...');
    
    if (!this.userPool) {
      console.error('❌ UserPool not initialized for token refresh');
      return null;
    }

    const refreshToken = localStorage.getItem('cognito_refresh_token');
    if (!refreshToken) {
      console.error('❌ No refresh token available');
      return null;
    }

    // Get user data from localStorage to reconstruct CognitoUser
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      console.error('❌ No user data found for token refresh');
      return null;
    }

    return new Promise((resolve) => {
      // Try to get current user from pool first
      let cognitoUser = this.userPool!.getCurrentUser();
      
      // If no current user, reconstruct from stored data
      if (!cognitoUser) {
        console.log('🔧 Reconstructing CognitoUser from stored data...');
        cognitoUser = new CognitoUser({
          Username: currentUser.email,
          Pool: this.userPool!,
        });
      }

      console.log('🔍 Calling cognitoUser.getSession()...');
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession) => {
        if (err) {
          console.error('❌ Error refreshing token:', err.message);
          
          // If session is invalid, the refresh token might be expired
          if (err.message.includes('Refresh Token has expired') || 
              err.message.includes('NotAuthorizedException')) {
            console.error('❌ Refresh token expired - need to re-authenticate');
          }
          
          resolve(null);
          return;
        }

        if (session && session.isValid()) {
          console.log('✅ Session refreshed successfully');
          this.currentUser = cognitoUser; // Update current user reference
          this.saveTokens(session);
          resolve(session.getAccessToken().getJwtToken());
        } else {
          console.error('❌ Invalid session after refresh');
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
      cognitoUser.confirmRegistration(code, true, (err, /* _result */) => {
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

  /**
   * Get current ID token
   */
  getIdToken(): string | null {
    return localStorage.getItem('cognito_id_token');
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('cognito_access_token');
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