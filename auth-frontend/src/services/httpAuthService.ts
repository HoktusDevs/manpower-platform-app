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
import { API_ENDPOINTS } from '../config/api-config';
import { axiosInstance } from '../config/axios-config';
import { AxiosError } from 'axios';

class HttpAuthRepository implements AuthRepository {
  private accessToken: string | null = null;

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
            phone: request.telefono ? `+56${request.telefono.replace(/^\+56/, '')}` : '+56900000000',
            rut: request.ci || '00000000-0',
            dateOfBirth: '1990-01-01',
            address: 'Dirección no especificada',
            city: 'Ciudad no especificada',
            educationLevel: 'Media',
            workExperience: 'Sin experiencia laboral previa',
            skills: ['Habilidades básicas'],
          } as RegisterEmployeeRequest;

      const { data: response } = await axiosInstance.post<AuthServiceResponse>(endpoint, requestBody);

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
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        message: axiosError.response?.data?.message || axiosError.message || 'Registration failed',
      };
    }
  }

  async confirmSignUp(request: ConfirmSignUpRequest): Promise<AuthResponse> {
    try {
      const { data: response } = await axiosInstance.post<BasicResponse>(
        API_ENDPOINTS.AUTH.VERIFY_EMAIL,
        {
          email: request.email,
          code: request.confirmationCode,
        }
      );

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error) {
      console.error('Email confirmation error:', error);
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        message: axiosError.response?.data?.message || axiosError.message || 'Email confirmation failed',
      };
    }
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    try {
      const { data: response } = await axiosInstance.post<AuthServiceResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        request
      );

      const responseWithSessionKey = response as AuthServiceResponse & { sessionKey?: string };
      if (response.success && response.user && responseWithSessionKey.sessionKey) {
        const user = {
          sub: response.user.id,
          email: response.user.email,
          'custom:role': response.user.userType,
          email_verified: true,
        };

        return {
          success: true,
          user,
          message: response.message,
          sessionKey: responseWithSessionKey.sessionKey,
        };
      }

      return {
        success: false,
        message: response.message || 'Login failed - missing user data or token',
      };
    } catch (error) {
      console.error('Login error:', error);
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        message: axiosError.response?.data?.message || axiosError.message || 'Login failed',
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
      const { data: response } = await axiosInstance.post<BasicResponse>(
        API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
        {
          email: request.email,
        }
      );

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        message: axiosError.response?.data?.message || axiosError.message || 'Password reset request failed',
      };
    }
  }

  async resetPassword(request: ResetPasswordRequest): Promise<AuthResponse> {
    try {
      const { data: response } = await axiosInstance.post<BasicResponse>(
        API_ENDPOINTS.AUTH.RESET_PASSWORD,
        {
          email: request.email,
          code: request.confirmationCode,
          newPassword: request.newPassword,
        }
      );

      return {
        success: response.success,
        message: response.message,
      };
    } catch (error) {
      console.error('Reset password error:', error);
      const axiosError = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        message: axiosError.response?.data?.message || axiosError.message || 'Password reset failed',
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async changePassword(_request: ChangePasswordRequest): Promise<AuthResponse> {
    console.warn('changePassword: HTTP auth service does not support password change yet');
    return {
      success: false,
      message: 'Password change not supported by HTTP auth service',
    };
  }

  async refreshToken(): Promise<boolean> {
    try {
      const { data: response } = await axiosInstance.post<RefreshTokenResponse>(
        API_ENDPOINTS.AUTH.REFRESH
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