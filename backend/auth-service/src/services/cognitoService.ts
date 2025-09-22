import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand
} from '@aws-sdk/client-cognito-identity-provider';

import { RegisterAdminInput, RegisterEmployeeInput, LoginInput, CognitoUser } from '../types';
import { MockCognitoService } from './mockCognitoService';

export class CognitoService {
  private cognitoClient: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;
  private isLocal: boolean;

  constructor() {
    this.isLocal = process.env.STAGE === 'local';
    this.userPoolId = process.env.COGNITO_USER_POOL_ID || 'us-east-1_kQKPPUqRO';
    this.clientId = process.env.COGNITO_CLIENT_ID || 'test-client-id';

    const clientConfig: any = {
      region: process.env.AWS_REGION || 'us-east-1',
    };

    // Para desarrollo local, usar endpoint de LocalStack o mock
    if (this.isLocal) {
      clientConfig.endpoint = process.env.COGNITO_ENDPOINT || 'http://localhost:4566';
      clientConfig.credentials = {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      };
    }

    this.cognitoClient = new CognitoIdentityProviderClient(clientConfig);
  }

  async registerAdmin(input: RegisterAdminInput): Promise<CognitoUser> {
    try {
      if (input.password !== input.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: input.email,
        TemporaryPassword: input.password,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: input.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:role', Value: 'admin' },
        ],
      });

      const createResult = await this.cognitoClient.send(createUserCommand);

      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username: input.email,
        Password: input.password,
        Permanent: true,
      });

      await this.cognitoClient.send(setPasswordCommand);

      return {
        cognitoSub: createResult.User?.Username || '',
        email: input.email,
        userType: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: input.email,
        TemporaryPassword: input.password,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: input.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:role', Value: 'postulante' },
          { Name: 'name', Value: input.fullName },
          { Name: 'phone_number', Value: input.phone },
        ],
      });

      const createResult = await this.cognitoClient.send(createUserCommand);

      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username: input.email,
        Password: input.password,
        Permanent: true,
      });

      await this.cognitoClient.send(setPasswordCommand);

      return {
        cognitoSub: createResult.User?.Username || '',
        email: input.email,
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
    } catch (error: any) {
      console.error('Error registering employee:', error);
      throw new Error(error.message || 'Failed to register employee');
    }
  }

  async login(input: LoginInput): Promise<{ user: CognitoUser; tokens: any }> {
    try {
      const authCommand = new AdminInitiateAuthCommand({
        UserPoolId: this.userPoolId,
        ClientId: this.clientId,
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        AuthParameters: {
          USERNAME: input.email,
          PASSWORD: input.password,
        },
      });

      const authResult = await this.cognitoClient.send(authCommand);

      if (!authResult.AuthenticationResult) {
        throw new Error('Authentication failed');
      }

      const userInfo = await this.getUser(input.email);

      return {
        user: userInfo,
        tokens: {
          accessToken: authResult.AuthenticationResult.AccessToken,
          refreshToken: authResult.AuthenticationResult.RefreshToken,
          idToken: authResult.AuthenticationResult.IdToken,
          expiresIn: authResult.AuthenticationResult.ExpiresIn || 3600,
        },
      };
    } catch (error: any) {
      console.error('Error during login:', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  async getUser(email: string): Promise<CognitoUser> {
    try {
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });

      const result = await this.cognitoClient.send(getUserCommand);

      if (!result.UserAttributes) {
        throw new Error('User not found');
      }

      const attributes: { [key: string]: string } = {};
      result.UserAttributes.forEach(attr => {
        if (attr.Name && attr.Value) {
          attributes[attr.Name] = attr.Value;
        }
      });

      const userType = (attributes['custom:role'] as 'admin' | 'postulante') || 'postulante';
      console.log('🔍 DEBUG COGNITO: Email:', email, 'UserType detected:', userType, 'Raw custom:role:', attributes['custom:role']);

      const user: CognitoUser = {
        cognitoSub: result.Username || '',
        email: attributes.email || email,
        userType,
        isActive: result.Enabled || false,
        createdAt: result.UserCreateDate?.toISOString() || new Date().toISOString(),
        updatedAt: result.UserLastModifiedDate?.toISOString() || new Date().toISOString(),
      };

      if (userType === 'postulante') {
        user.attributes = {
          fullName: attributes.name,
          phone: attributes.phone_number,
          rut: attributes['custom:rut'],
          dateOfBirth: attributes['custom:dateOfBirth'],
          address: attributes.address,  // address es un atributo estándar, no custom
          city: attributes['custom:city'],
          educationLevel: attributes['custom:education_level'],
          workExperience: attributes['custom:work_experience'],
          skills: attributes['custom:skills'],
        };
      }

      return user;
    } catch (error: any) {
      console.error('Error getting user:', error);
      throw new Error(error.message || 'Failed to get user');
    }
  }

  async refreshToken(refreshToken: string): Promise<any> {
    try {
      const command = new AdminInitiateAuthCommand({
        UserPoolId: this.userPoolId,
        ClientId: this.clientId,
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });

      const result = await this.cognitoClient.send(command);

      if (!result.AuthenticationResult) {
        throw new Error('Failed to refresh token');
      }

      return {
        accessToken: result.AuthenticationResult.AccessToken,
        idToken: result.AuthenticationResult.IdToken,
        expiresIn: result.AuthenticationResult.ExpiresIn || 3600,
      };
    } catch (error: any) {
      console.error('Error refreshing token:', error);
      throw new Error(error.message || 'Failed to refresh token');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      console.error('Error sending forgot password:', error);
      throw new Error(error.message || 'Failed to send forgot password email');
    }
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      throw new Error(error.message || 'Failed to reset password');
    }
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      console.error('Error verifying email:', error);
      throw new Error(error.message || 'Failed to verify email');
    }
  }

  async resendVerificationCode(email: string): Promise<void> {
    try {
      const command = new ResendConfirmationCodeCommand({
        ClientId: this.clientId,
        Username: email,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      console.error('Error resending verification code:', error);
      throw new Error(error.message || 'Failed to resend verification code');
    }
  }

  async deleteUser(email: string): Promise<void> {
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      throw new Error(error.message || 'Failed to delete user');
    }
  }

  async updateUserAttributes(email: string, attributes: { [key: string]: string }): Promise<void> {
    try {
      const userAttributes = Object.entries(attributes).map(([name, value]) => ({
        Name: name,
        Value: value,
      }));

      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        UserAttributes: userAttributes,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      console.error('Error updating user attributes:', error);
      throw new Error(error.message || 'Failed to update user attributes');
    }
  }
}