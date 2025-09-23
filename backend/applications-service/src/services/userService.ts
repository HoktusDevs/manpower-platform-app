/**
 * User Service
 * Handles user data retrieval and enrichment from Cognito
 */

import { CognitoIdentityProviderClient, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

export interface UserData {
  userId: string;
  email: string;
  name?: string;
  role?: string;
  rut?: string;
  phone?: string;
  address?: string;
}

export class UserService {
  private cognitoClient: CognitoIdentityProviderClient;
  private userPoolId: string;

  constructor() {
    this.cognitoClient = new CognitoIdentityProviderClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    this.userPoolId = process.env.USER_POOL_ID || 'us-east-1_kQKPPUqRO';
  }

  /**
   * Get user data by userId from Cognito
   */
  async getUserById(userId: string): Promise<UserData | null> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: userId
      });

      const result = await this.cognitoClient.send(command);
      
      if (result.Username) {
        // Extraer atributos del usuario
        const attributes = result.UserAttributes || [];
        const getAttribute = (name: string) => 
          attributes.find(attr => attr.Name === name)?.Value || '';
        
        const givenName = getAttribute('given_name');
        const familyName = getAttribute('family_name');
        const fullName = `${givenName} ${familyName}`.trim() || getAttribute('name') || `Usuario-${userId.slice(-8)}`;
        
        return {
          userId: result.Username,
          email: getAttribute('email'),
          name: fullName,
          role: getAttribute('custom:role'),
          rut: getAttribute('custom:rut'),
          phone: getAttribute('phone_number'),
          address: getAttribute('address')
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user by ID from Cognito:', error);
      // Fallback: intentar extraer nombre de la descripción de aplicaciones
      return this.getUserFromApplications(userId);
    }
  }

  /**
   * Fallback: Get user data from application descriptions
   */
  private async getUserFromApplications(userId: string): Promise<UserData | null> {
    try {
      // Este es un fallback básico - en una implementación real,
      // podrías consultar la tabla de aplicaciones para extraer el nombre
      // del campo description que contiene "Aplicación de [nombre] ([email])"
      
      // Por ahora, devolvemos datos básicos
      return {
        userId: userId,
        email: 'email@no-especificado.com',
        name: `Usuario-${userId.slice(-8)}`,
        role: 'postulante'
      };
    } catch (error) {
      console.error('Error getting user from applications fallback:', error);
      return null;
    }
  }

  /**
   * Get multiple users by userIds from Cognito
   */
  async getUsersByIds(userIds: string[]): Promise<Map<string, UserData>> {
    const usersMap = new Map<string, UserData>();
    
    if (userIds.length === 0) {
      return usersMap;
    }

    try {
      // Get all users in parallel from Cognito
      const promises = userIds.map(userId => 
        this.getUserById(userId).then(user => ({ userId, user }))
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(({ userId, user }) => {
        if (user) {
          usersMap.set(userId, user);
        }
      });
      
      console.log(`✅ Retrieved ${usersMap.size} users from Cognito`);
    } catch (error) {
      console.error('Error getting users by IDs from Cognito:', error);
    }
    
    return usersMap;
  }
}
