import { AuthenticationDetails, CognitoUser, CognitoUserPool, CognitoUserSession, CognitoUserAttribute } from 'amazon-cognito-identity-js';
import type {
  User,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  CognitoConfig
} from '../types/auth';
import type { JWTPayload } from '../types/config';
import { AWS_CONFIG } from '../config/aws-config';

class CognitoAuthService {
  private userPool: CognitoUserPool | null = null;
  private currentUser: CognitoUser | null = null;

  /**
   * Initialize the Cognito service with configuration
   */
  initialize(config?: CognitoConfig): void {
    // Use AWS_CONFIG as default if no config provided
    const cognitoConfig = config || AWS_CONFIG.cognito;

    // Store configuration values directly in userPool initialization
    this.userPool = new CognitoUserPool({
      UserPoolId: cognitoConfig.userPoolId,
      ClientId: cognitoConfig.userPoolClientId,
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

    // Extract additional postulante data from request
    const extendedRequest = request as RegisterRequest & {
      phone?: string;
      rut?: string;
      address?: string;
      city?: string;
      dateOfBirth?: string;
      educationLevel?: string;
      workExperience?: string;
      skills?: string;
    };

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

    // Add postulante-specific attributes if this is a postulante registration
    if (role === 'postulante') {
      // Phone number (standard attribute)
      if (extendedRequest.phone) {
        attributeList.push(new CognitoUserAttribute({
          Name: 'phone_number',
          Value: extendedRequest.phone.startsWith('+') ? extendedRequest.phone : `+56${extendedRequest.phone}`,
        }));
      }

      // Address (standard attribute)
      if (extendedRequest.address && extendedRequest.city) {
        attributeList.push(new CognitoUserAttribute({
          Name: 'address',
          Value: `${extendedRequest.address}, ${extendedRequest.city}`,
        }));
      }

      // Birth date (standard attribute)
      if (extendedRequest.dateOfBirth) {
        attributeList.push(new CognitoUserAttribute({
          Name: 'birthdate',
          Value: extendedRequest.dateOfBirth,
        }));
      }

      // Custom attributes for postulante-specific data
      if (extendedRequest.rut) {
        attributeList.push(new CognitoUserAttribute({
          Name: 'custom:rut',
          Value: extendedRequest.rut,
        }));
      }

      if (extendedRequest.educationLevel) {
        attributeList.push(new CognitoUserAttribute({
          Name: 'custom:education_level',
          Value: extendedRequest.educationLevel,
        }));
      }

      if (extendedRequest.workExperience) {
        attributeList.push(new CognitoUserAttribute({
          Name: 'custom:work_experience',
          Value: extendedRequest.workExperience,
        }));
      }

      if (extendedRequest.skills) {
        attributeList.push(new CognitoUserAttribute({
          Name: 'custom:skills',
          Value: extendedRequest.skills,
        }));
      }
    }

    return new Promise((resolve) => {
      this.userPool!.signUp(email, password, attributeList, [], (err, result) => {
        if (err) {
          resolve({
            success: false,
            message: this.translateCognitoError(err.message),
          });
          return;
        }

        if (result?.user) {
          // Mantener localStorage solo como backup/cache para aplicaciones
          if (role === 'postulante') {
            const completeUserData = {
              nombre: fullName,
              email: email.toLowerCase(),
              telefono: extendedRequest.phone || '',
              rut: extendedRequest.rut || '',
              direccion: extendedRequest.address && extendedRequest.city
                ? `${extendedRequest.address}, ${extendedRequest.city}`.trim().replace(/^,\s*|,\s*$/g, '')
                : '',
              fechaNacimiento: extendedRequest.dateOfBirth || '',
              experiencia: extendedRequest.workExperience || '',
              educacion: extendedRequest.educationLevel || '',
              habilidades: extendedRequest.skills || '',
              motivacion: '' // Campo vacío para llenar en la aplicación
            };

            localStorage.setItem('userApplicationData', JSON.stringify(completeUserData));
            }

          // Don't return user data immediately after registration
          // This prevents token mismatch issues - user should login after registration
          resolve({
            success: true,
            message: 'Registration successful. Please login to continue.',
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
          } catch {
            resolve({
              success: false,
              message: 'Error parsing user information',
            });
          }
        },

        onFailure: (err) => {
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
      } catch {
        console.warn('Failed to sign out user');
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
        return false;
      }

      // Check for either access token or id token (we use id token for GraphQL)
      const accessToken = localStorage.getItem('cognito_access_token');
      const idToken = localStorage.getItem('cognito_id_token');
      
      if (!accessToken && !idToken) {
        return false;
      }
      
      // Use whichever token exists
      const tokenToCheck = accessToken || idToken;

      // Basic JWT validation (check if token is expired)
      const tokenPayload = this.parseJWT(tokenToCheck!);
      const now = Math.floor(Date.now() / 1000);
      
      if (tokenPayload.exp && tokenPayload.exp < now) {
        return false;
      }

      // Verify token belongs to current user
      // In Cognito, 'sub' is the user ID
      // Only check if both values exist to avoid false positives
      if (tokenPayload.sub && user.userId && tokenPayload.sub !== user.userId) {
        // Update user data with correct ID from token instead of clearing everything
        const updatedUser = { ...user, userId: tokenPayload.sub };
        this.setUserData(updatedUser);
        
        return true;
      }

      return true;
    } catch {
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
   * Refresh user session (simplified method for token renewal modal)
   */
  async refreshUserSession(): Promise<boolean> {
    try {
      const newToken = await this.refreshAccessToken();

      if (newToken) {
        return true;
      }

      return false;
    } catch {
      return false;
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

      this.currentUser.updateAttributes(attributeList, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Refresh the session to get updated tokens
        this.currentUser!.getSession((err: Error | null, session: CognitoUserSession | null) => {
          if (err) {
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
  async getValidAccessToken(isSessionRenewal: boolean = false): Promise<string | null> {
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
        } catch {
          console.warn('Failed to parse ID token');
        }
      }
      
      // If missing role claim, force logout immediately (but not during session renewal)
      if (!hasRoleClaim && !isSessionRenewal) {
        this.logout();
        localStorage.clear();
        window.location.href = '/login?reason=missing_role';
        return null;
      } else if (!hasRoleClaim && isSessionRenewal) {
        console.warn('Missing role claim during session renewal');
      }
      
      // If token is expired, try to refresh
      if (payload.exp <= now + 300) {
        return await this.refreshAccessToken();
      }

      return accessToken;
    } catch {
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

    // Get user data from localStorage to reconstruct CognitoUser
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    return new Promise((resolve) => {
      // Try to get current user from pool first
      let cognitoUser = this.userPool!.getCurrentUser();
      
      // If no current user, reconstruct from stored data
      if (!cognitoUser) {
        cognitoUser = new CognitoUser({
          Username: currentUser.email,
          Pool: this.userPool!,
        });
      }

      cognitoUser.getSession((err: Error | null, session: CognitoUserSession) => {
        if (err) {
          // If session is invalid, the refresh token might be expired
          if (err.message.includes('Refresh Token has expired') ||
              err.message.includes('NotAuthorizedException')) {
            console.warn('Refresh token has expired');
          }
          
          resolve(null);
          return;
        }

        if (session && session.isValid()) {
          this.currentUser = cognitoUser; // Update current user reference
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

  /**
   * Change password for authenticated user
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<AuthResponse> {
    if (!this.userPool) {
      throw new Error('Cognito not initialized');
    }

    return new Promise((resolve) => {
      // Get current user from pool
      let cognitoUser = this.userPool!.getCurrentUser();
      
      // If no current user in pool, try to reconstruct from stored data
      if (!cognitoUser) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
          resolve({
            success: false,
            message: 'No user logged in',
          });
          return;
        }

        cognitoUser = new CognitoUser({
          Username: currentUser.email,
          Pool: this.userPool!,
        });
      }

      // First get a valid session
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          resolve({
            success: false,
            message: 'Session expired. Please login again.',
          });
          return;
        }

        // Now change password
        cognitoUser!.changePassword(oldPassword, newPassword, (err) => {
          if (err) {
            resolve({
              success: false,
              message: this.translateCognitoError(err.message),
            });
            return;
          }

          resolve({
            success: true,
            message: 'Password changed successfully',
          });
        });
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

  /**
   * Get current user attributes from Cognito
   */
  async getUserAttributes(): Promise<{ [key: string]: string } | null> {
    if (!this.userPool) {
      return null;
    }

    const cognitoUser = this.userPool.getCurrentUser();
    if (!cognitoUser) {
      return null;
    }

    return new Promise((resolve) => {
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) {
          resolve(null);
          return;
        }

        cognitoUser.getUserAttributes((err, attributes) => {
          if (err || !attributes) {
            resolve(null);
            return;
          }

          const attrs: { [key: string]: string } = {};
          attributes.forEach(attr => {
            attrs[attr.getName()] = attr.getValue();
          });

          resolve(attrs);
        });
      });
    });
  }

  private translateCognitoError(error: string): string {
    const errorMap: { [key: string]: string } = {
      'User does not exist.': 'Usuario no encontrado',
      'Incorrect username or password.': 'Email o contraseña incorrectos',
      'User is not confirmed.': 'Usuario no verificado. Revisa tu email.',
      'Invalid verification code provided, please try again.': 'Código de verificación inválido',
      'Password attempts exceeded': 'Demasiados intentos. Intenta más tarde.',
      'UsernameExistsException': 'Un usuario con este email ya existe',
      'User already exists': 'Un usuario con este email ya existe',
      'InvalidPasswordException': 'La contraseña no cumple con los requisitos',
      'NotAuthorizedException': 'Contraseña actual incorrecta',
      'LimitExceededException': 'Demasiados intentos. Intenta más tarde.',
      'InvalidParameterException': 'Parámetros inválidos',
    };

    return errorMap[error] || 'Error de autenticación';
  }
}

export const cognitoAuthService = new CognitoAuthService();