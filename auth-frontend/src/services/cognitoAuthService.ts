import { Amplify } from 'aws-amplify';
import {
  signUp,
  confirmSignUp,
  signIn,
  signOut,
  getCurrentUser,
  fetchUserAttributes,
  resetPassword,
  confirmResetPassword,
  updatePassword,
  fetchAuthSession,
  AuthError,
  type SignUpInput,
  type ConfirmSignUpInput,
  type SignInInput,
  type ResetPasswordInput,
  type ConfirmResetPasswordInput,
  type UpdatePasswordInput,
} from 'aws-amplify/auth';
import { awsConfig } from '../config/aws-config';
import type { AuthRepository } from '../types/repositories';
import type {
  User,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  ConfirmSignUpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from '../types/auth';

class CognitoAuthRepository implements AuthRepository {
  constructor() {
    Amplify.configure(awsConfig);
  }

  async register(request: RegisterRequest): Promise<AuthResponse> {
    try {
      const userAttributes: Record<string, string> = {
        email: request.email,
      };

      if (request.given_name) {
        userAttributes['given_name'] = request.given_name;
      }
      if (request.family_name) {
        userAttributes['family_name'] = request.family_name;
      }
      if (request.ci) {
        userAttributes['custom:ci'] = request.ci;
      }
      if (request.telefono) {
        userAttributes['custom:telefono'] = request.telefono;
      }
      if (request.role) {
        userAttributes['custom:role'] = request.role;
      }

      const signUpInput: SignUpInput = {
        username: request.email,
        password: request.password,
        options: {
          userAttributes,
        },
      };

      const result = await signUp(signUpInput);

      return {
        success: true,
        requiresConfirmation: !result.isSignUpComplete,
        message: result.isSignUpComplete
          ? 'Registration successful'
          : 'Please check your email for verification code',
      };
    } catch (_error) {
      console.error('Registration error:', _error);
      return {
        success: false,
        message: _error instanceof AuthError ? _error.message : 'Registration failed',
      };
    }
  }

  async confirmSignUp(request: ConfirmSignUpRequest): Promise<AuthResponse> {
    try {
      const confirmSignUpInput: ConfirmSignUpInput = {
        username: request.email,
        confirmationCode: request.confirmationCode,
      };

      await confirmSignUp(confirmSignUpInput);

      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (_error) {
      console.error('Confirmation error:', _error);
      return {
        success: false,
        message: _error instanceof AuthError ? _error.message : 'Confirmation failed',
      };
    }
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    try {
      const signInInput: SignInInput = {
        username: request.email,
        password: request.password,
      };

      const result = await signIn(signInInput);

      if (result.isSignedIn) {
        const user = await this.getCurrentUser();
        const session = await fetchAuthSession();

        return {
          success: true,
          user,
          accessToken: session.tokens?.accessToken?.toString(),
          message: 'Login successful',
        } as AuthResponse;
      } else {
        return {
          success: false,
          message: 'Login incomplete',
        };
      }
    } catch (_error) {
      console.error('Login error:', _error);
      return {
        success: false,
        message: _error instanceof AuthError ? _error.message : 'Login failed',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut();
    } catch (_error) {
      console.error('Logout error:', _error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();

      return {
        sub: currentUser.userId,
        email: attributes.email || '',
        given_name: attributes['given_name'],
        family_name: attributes['family_name'],
        'custom:role': attributes['custom:role'],
        'custom:ci': attributes['custom:ci'],
        'custom:telefono': attributes['custom:telefono'],
        email_verified: attributes['email_verified'] === 'true',
      };
    } catch {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      await getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  async forgotPassword(request: ForgotPasswordRequest): Promise<AuthResponse> {
    try {
      const resetPasswordInput: ResetPasswordInput = {
        username: request.email,
      };

      await resetPassword(resetPasswordInput);

      return {
        success: true,
        message: 'Password reset code sent to your email',
      };
    } catch (_error) {
      console.error('Forgot password error:', _error);
      return {
        success: false,
        message: _error instanceof AuthError ? _error.message : 'Failed to send reset code',
      };
    }
  }

  async resetPassword(request: ResetPasswordRequest): Promise<AuthResponse> {
    try {
      const confirmResetPasswordInput: ConfirmResetPasswordInput = {
        username: request.email,
        confirmationCode: request.confirmationCode,
        newPassword: request.newPassword,
      };

      await confirmResetPassword(confirmResetPasswordInput);

      return {
        success: true,
        message: 'Password reset successful',
      };
    } catch (_error) {
      console.error('Reset password error:', _error);
      return {
        success: false,
        message: _error instanceof AuthError ? _error.message : 'Password reset failed',
      };
    }
  }

  async changePassword(request: ChangePasswordRequest): Promise<AuthResponse> {
    try {
      const updatePasswordInput: UpdatePasswordInput = {
        oldPassword: request.oldPassword,
        newPassword: request.newPassword,
      };

      await updatePassword(updatePasswordInput);

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (_error) {
      console.error('Change password error:', _error);
      return {
        success: false,
        message: _error instanceof AuthError ? _error.message : 'Password change failed',
      };
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      return !!session.tokens?.accessToken;
    } catch (_error) {
      console.error('Token refresh error:', _error);
      return false;
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.accessToken?.toString() || null;
    } catch {
      return null;
    }
  }
}

export const cognitoAuthRepository = new CognitoAuthRepository();