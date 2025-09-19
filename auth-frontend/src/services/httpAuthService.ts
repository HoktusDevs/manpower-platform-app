import type { AuthRepository } from '../types/repositories';
import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  ConfirmSignUpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  User,
} from '../types/auth';
import type {
  RegisterAdminRequest,
  RegisterEmployeeRequest,
  AuthServiceResponse,
  RefreshTokenResponse,
  BasicResponse,
} from '../types/auth-service';
import { API_CONFIG, API_ENDPOINTS } from '../config/api-config';

class HttpAuthRepository implements AuthRepository {
  private readonly baseUrl = API_CONFIG.AUTH_SERVICE_URL;
  private readonly timeout = API_CONFIG.TIMEOUT;
  private accessToken: string | null = null;

  private async makeRequest<T>(
    endpoint: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: object;
      requiresAuth?: boolean;
    }
  ): Promise<T> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (options.requiresAuth && this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : null,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`HTTP request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async register(request: RegisterRequest): Promise<AuthResponse> {
    try {
      const endpoint = request.role === 'admin'
        ? API_ENDPOINTS.AUTH.REGISTER_ADMIN
        : API_ENDPOINTS.AUTH.REGISTER_POSTULANTE;

      const requestBody = request.role === 'admin'
        ? {
            email: request.email,
            password: request.password,
            confirmPassword: request.password,
          } as RegisterAdminRequest
        : {
            email: request.email,
            password: request.password,
            confirmPassword: request.password,
            fullName: request.given_name || 'Usuario',
            phone: request.telefono || '000000000',
            rut: request.ci || '00000000-0',
            dateOfBirth: '1990-01-01',
            address: 'Dirección no especificada',
            city: 'Ciudad no especificada',
            educationLevel: 'Educación Media',
            workExperience: 'Sin experiencia laboral previa',
            skills: ['Habilidades básicas'],
          } as RegisterEmployeeRequest;

      const response = await this.makeRequest<AuthServiceResponse>(endpoint, {
        method: 'POST',
        body: requestBody,
      });

      if (response.user) {
        const authResponse: AuthResponse = {
          success: response.success,
          requiresConfirmation: false,
          message: response.message,
          user: {
            sub: response.user.id,
            email: response.user.email,
            'custom:role': response.user.userType,
            email_verified: true,
          },
        };

        if (response.tokens?.accessToken) {
          authResponse.accessToken = response.tokens.accessToken;
        }

        return authResponse;
      }

      return {
        success: response.success,
        requiresConfirmation: false,
        message: response.message,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  async confirmSignUp(request: ConfirmSignUpRequest): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest<BasicResponse>(API_ENDPOINTS.AUTH.VERIFY_EMAIL, {
        method: 'POST',
        body: {
          email: request.email,
          code: request.confirmationCode,
        },
      });

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error) {
      console.error('Email confirmation error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Email confirmation failed',
      };
    }
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest<AuthServiceResponse>(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        body: request,
      });

      if (response.success && response.tokens?.accessToken) {
        this.accessToken = response.tokens.accessToken;
        localStorage.setItem('accessToken', response.tokens.accessToken);

        if (response.user) {
          const user = {
            sub: response.user.id,
            email: response.user.email,
            'custom:role': response.user.userType,
            email_verified: true,
          };
          localStorage.setItem('user', JSON.stringify(user));
        }
      }

      if (response.user) {
        const authResponse: AuthResponse = {
          success: response.success,
          user: {
            sub: response.user.id,
            email: response.user.email,
            'custom:role': response.user.userType,
            email_verified: true,
          },
          message: response.message,
        };

        if (response.tokens?.accessToken) {
          authResponse.accessToken = response.tokens.accessToken;
        }

        return authResponse;
      }

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      this.accessToken = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        return null;
      }

      const user = JSON.parse(userStr);
      return user as User;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch {
      return false;
    }
  }

  async forgotPassword(request: ForgotPasswordRequest): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest<BasicResponse>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        method: 'POST',
        body: {
          email: request.email,
        },
      });

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Password reset request failed',
      };
    }
  }

  async resetPassword(request: ResetPasswordRequest): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest<BasicResponse>(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        method: 'POST',
        body: {
          email: request.email,
          code: request.confirmationCode,
          newPassword: request.newPassword,
        },
      });

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Password reset failed',
      };
    }
  }

  async changePassword(_request: ChangePasswordRequest): Promise<AuthResponse> {
    console.warn('changePassword: HTTP auth service does not support password change yet');
    return {
      success: false,
      message: 'Password change not supported by HTTP auth service',
    };
  }

  async refreshToken(): Promise<boolean> {
    try {
      const response = await this.makeRequest<RefreshTokenResponse>(
        API_ENDPOINTS.AUTH.REFRESH,
        {
          method: 'POST',
          requiresAuth: true,
        }
      );

      if (response.success && response.data?.accessToken) {
        this.accessToken = response.data.accessToken;
        localStorage.setItem('accessToken', response.data.accessToken);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      if (this.accessToken) {
        return this.accessToken;
      }

      const token = localStorage.getItem('accessToken');
      if (token) {
        this.accessToken = token;
        return token;
      }

      return null;
    } catch {
      return null;
    }
  }
}

export const httpAuthRepository = new HttpAuthRepository();