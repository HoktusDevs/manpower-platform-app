import { User, UserResponse } from '../types';

export class UserService {
  private authServiceUrl: string;
  private internalApiKey: string;

  constructor() {
    this.authServiceUrl = process.env.AUTH_SERVICE_URL || 'https://7pptifb3zk.execute-api.us-east-1.amazonaws.com/dev';
    this.internalApiKey = process.env.INTERNAL_API_KEY || 'default-internal-key';
  }

  async getUserById(userId: string): Promise<UserResponse> {
    try {
      console.log(`UserService: Looking up user with ID: ${userId}`);
      
      const requestBody = {
        apiKey: this.internalApiKey,
        userId: userId
      };

      const response = await fetch(`${this.authServiceUrl}/auth/profile/internal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.log(`UserService: User not found for ID: ${userId}, status: ${response.status}`);
        return {
          success: false,
          message: 'User not found',
        };
      }

      const userData = await response.json();
      console.log(`UserService: User found: ${userData.user?.email}`);

      // Mapear la respuesta del auth-service al formato User
      const user: User = {
        userId: userData.user?.userId || userData.user?.cognitoSub || userId,
        email: userData.user?.email,
        firstName: userData.user?.firstName,
        lastName: userData.user?.lastName,
        fullName: userData.user?.fullName,
        createdAt: userData.user?.createdAt || new Date().toISOString(),
        updatedAt: userData.user?.updatedAt || new Date().toISOString()
      };

      return {
        success: true,
        message: 'User retrieved successfully',
        user,
      };
    } catch (error) {
      console.error('UserService: Error getting user by ID:', error);
      return {
        success: false,
        message: 'Failed to retrieve user',
      };
    }
  }

  async getUserByEmail(email: string): Promise<UserResponse> {
    try {
      console.log(`UserService: Looking up user with email: ${email}`);
      
      // Para búsqueda por email, necesitaríamos un endpoint diferente en auth-service
      // Por ahora, retornamos error ya que no tenemos ese endpoint
      console.log(`UserService: Email lookup not implemented, need auth-service endpoint`);
      return {
        success: false,
        message: 'Email lookup not implemented',
      };
    } catch (error) {
      console.error('UserService: Error getting user by email:', error);
      return {
        success: false,
        message: 'Failed to retrieve user',
      };
    }
  }

  generateFolderName(user: User): string {
    // Prioridad: fullName > firstName + lastName > email
    if (user.fullName) {
      return user.fullName;
    }
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    if (user.firstName) {
      return user.firstName;
    }
    
    // Fallback al email
    return user.email;
  }
}
