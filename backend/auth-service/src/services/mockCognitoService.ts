import { v4 as uuidv4 } from 'uuid';
import { RegisterAdminInput, RegisterEmployeeInput, LoginInput, CognitoUser } from '../types';

interface MockUser {
  cognitoSub: string;
  email: string;
  password: string;
  userType: 'admin' | 'postulante';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  attributes?: {
    [key: string]: any;
  };
}

export class MockCognitoService {
  private users: Map<string, MockUser> = new Map();

  constructor() {
    console.log('🧪 Using Mock Cognito Service for local development');
  }

  async registerAdmin(input: RegisterAdminInput): Promise<CognitoUser> {
    try {
      if (input.password !== input.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (this.users.has(input.email)) {
        throw new Error('User already exists');
      }

      const cognitoSub = uuidv4();
      const mockUser: MockUser = {
        cognitoSub,
        email: input.email,
        password: input.password,
        userType: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.users.set(input.email, mockUser);

      return {
        cognitoSub: mockUser.cognitoSub,
        email: mockUser.email,
        userType: mockUser.userType,
        isActive: mockUser.isActive,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };
    } catch (error: any) {
      console.error('Error registering admin:', error);
      throw new Error(error.message || 'Failed to register admin');
    }
  }

  async registerEmployee(input: RegisterEmployeeInput): Promise<CognitoUser> {
    try {
      if (input.password !== input.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (this.users.has(input.email)) {
        throw new Error('User already exists');
      }

      const cognitoSub = uuidv4();
      const mockUser: MockUser = {
        cognitoSub,
        email: input.email,
        password: input.password,
        userType: 'postulante',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attributes: {
          fullName: input.fullName,
          phone: input.phone,
          rut: input.rut,
          dateOfBirth: input.dateOfBirth,
          address: input.address,
          city: input.city,
          educationLevel: input.educationLevel,
          workExperience: input.workExperience,
          skills: JSON.stringify(input.skills),
        },
      };

      this.users.set(input.email, mockUser);

      return {
        cognitoSub: mockUser.cognitoSub,
        email: mockUser.email,
        userType: mockUser.userType,
        isActive: mockUser.isActive,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        attributes: mockUser.attributes,
      };
    } catch (error: any) {
      console.error('Error registering employee:', error);
      throw new Error(error.message || 'Failed to register employee');
    }
  }

  async login(input: LoginInput): Promise<{ user: CognitoUser; tokens: any }> {
    try {
      const mockUser = this.users.get(input.email);

      if (!mockUser || mockUser.password !== input.password) {
        throw new Error('Invalid email or password');
      }

      if (!mockUser.isActive) {
        throw new Error('User account is disabled');
      }

      const userInfo: CognitoUser = {
        cognitoSub: mockUser.cognitoSub,
        email: mockUser.email,
        userType: mockUser.userType,
        isActive: mockUser.isActive,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        attributes: mockUser.attributes,
      };

      // Generate mock JWT tokens
      const mockTokens = {
        accessToken: `mock-access-token-${mockUser.cognitoSub}`,
        refreshToken: `mock-refresh-token-${mockUser.cognitoSub}`,
        idToken: `mock-id-token-${mockUser.cognitoSub}`,
        expiresIn: 3600,
      };

      return {
        user: userInfo,
        tokens: mockTokens,
      };
    } catch (error: any) {
      console.error('Error during login:', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  async getUser(email: string): Promise<CognitoUser> {
    try {
      const mockUser = this.users.get(email);

      if (!mockUser) {
        throw new Error('User not found');
      }

      return {
        cognitoSub: mockUser.cognitoSub,
        email: mockUser.email,
        userType: mockUser.userType,
        isActive: mockUser.isActive,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        attributes: mockUser.attributes,
      };
    } catch (error: any) {
      console.error('Error getting user:', error);
      throw new Error(error.message || 'Failed to get user');
    }
  }

  async refreshToken(refreshToken: string): Promise<any> {
    try {
      // Extract user ID from mock refresh token
      const userId = refreshToken.replace('mock-refresh-token-', '');

      // Find user by cognitoSub
      const mockUser = Array.from(this.users.values()).find(u => u.cognitoSub === userId);

      if (!mockUser) {
        throw new Error('Invalid refresh token');
      }

      // Generate new mock tokens
      return {
        accessToken: `mock-access-token-${mockUser.cognitoSub}`,
        idToken: `mock-id-token-${mockUser.cognitoSub}`,
        expiresIn: 3600,
      };
    } catch (error: any) {
      console.error('Error refreshing token:', error);
      throw new Error(error.message || 'Failed to refresh token');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const mockUser = this.users.get(email);

      if (!mockUser) {
        // Don't reveal if user exists or not
        console.log(`Mock: Would send password reset email to ${email}`);
        return;
      }

      console.log(`Mock: Password reset code sent to ${email}: 123456`);
    } catch (error: any) {
      console.error('Error sending forgot password:', error);
      throw new Error(error.message || 'Failed to send forgot password email');
    }
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    try {
      const mockUser = this.users.get(email);

      if (!mockUser) {
        throw new Error('User not found');
      }

      if (code !== '123456') {
        throw new Error('Invalid verification code');
      }

      mockUser.password = newPassword;
      mockUser.updatedAt = new Date().toISOString();
      this.users.set(email, mockUser);

      console.log(`Mock: Password reset successfully for ${email}`);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      throw new Error(error.message || 'Failed to reset password');
    }
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    try {
      const mockUser = this.users.get(email);

      if (!mockUser) {
        throw new Error('User not found');
      }

      if (code !== '123456') {
        throw new Error('Invalid verification code');
      }

      console.log(`Mock: Email verified successfully for ${email}`);
    } catch (error: any) {
      console.error('Error verifying email:', error);
      throw new Error(error.message || 'Failed to verify email');
    }
  }

  async resendVerificationCode(email: string): Promise<void> {
    try {
      const mockUser = this.users.get(email);

      if (!mockUser) {
        throw new Error('User not found');
      }

      console.log(`Mock: Verification code resent to ${email}: 123456`);
    } catch (error: any) {
      console.error('Error resending verification code:', error);
      throw new Error(error.message || 'Failed to resend verification code');
    }
  }

  async deleteUser(email: string): Promise<void> {
    try {
      if (!this.users.has(email)) {
        throw new Error('User not found');
      }

      this.users.delete(email);
      console.log(`Mock: User ${email} deleted successfully`);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      throw new Error(error.message || 'Failed to delete user');
    }
  }

  async updateUserAttributes(email: string, attributes: { [key: string]: string }): Promise<void> {
    try {
      const mockUser = this.users.get(email);

      if (!mockUser) {
        throw new Error('User not found');
      }

      if (!mockUser.attributes) {
        mockUser.attributes = {};
      }

      Object.assign(mockUser.attributes, attributes);
      mockUser.updatedAt = new Date().toISOString();
      this.users.set(email, mockUser);

      console.log(`Mock: User attributes updated for ${email}`);
    } catch (error: any) {
      console.error('Error updating user attributes:', error);
      throw new Error(error.message || 'Failed to update user attributes');
    }
  }

  // Helper method to list all users (for debugging)
  getAllUsers(): CognitoUser[] {
    return Array.from(this.users.values()).map(user => ({
      cognitoSub: user.cognitoSub,
      email: user.email,
      userType: user.userType,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      attributes: user.attributes,
    }));
  }
}