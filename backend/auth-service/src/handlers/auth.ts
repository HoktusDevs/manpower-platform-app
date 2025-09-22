import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { AuthServiceFactory } from '../services/authServiceFactory';
import { DynamoSessionService } from '../services/dynamoSessionService';
import {
  RegisterAdminInput,
  RegisterEmployeeInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
  ExchangeSessionInput,
  AuthResponse,
  APIGatewayProxyEventWithAuth
} from '../types';

const cognitoService = AuthServiceFactory.create();

const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  },
  body: JSON.stringify(body),
});

const extractUserFromEvent = (event: APIGatewayProxyEventWithAuth): { userId: string; userRole: string; email: string } => {
  const claims = event.requestContext.authorizer?.claims;
  if (!claims) {
    throw new Error('Authorization claims not found');
  }

  return {
    userId: claims.sub,
    userRole: claims['custom:role'] || 'postulante',
    email: claims.email,
  };
};

export const registerAdmin: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: RegisterAdminInput = JSON.parse(event.body);

    if (!input.email || !input.password || !input.confirmPassword) {
      return createResponse(400, {
        success: false,
        message: 'Email, password, and confirmPassword are required',
      });
    }

    const user = await cognitoService.registerAdmin(input);

    const response: AuthResponse = {
      success: true,
      message: 'Admin registered successfully',
      user: {
        id: user.cognitoSub,
        email: user.email,
        userType: user.userType,
        cognitoSub: user.cognitoSub,
      },
    };

    return createResponse(201, response);
  } catch (error: any) {
    console.error('Error in registerAdmin:', error);

    const response: AuthResponse = {
      success: false,
      message: error.message || 'Failed to register admin',
    };

    return createResponse(400, response);
  }
};

export const registerEmployee: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: RegisterEmployeeInput = JSON.parse(event.body);

    const requiredFields = [
      'email', 'password', 'confirmPassword', 'fullName', 'phone', 'rut',
      'dateOfBirth', 'address', 'city', 'educationLevel', 'workExperience'
    ];

    for (const field of requiredFields) {
      if (!input[field as keyof RegisterEmployeeInput]) {
        return createResponse(400, {
          success: false,
          message: `${field} is required`,
        });
      }
    }

    if (!input.skills || !Array.isArray(input.skills)) {
      return createResponse(400, {
        success: false,
        message: 'Skills must be an array',
      });
    }

    const user = await cognitoService.registerEmployee(input);

    const response: AuthResponse = {
      success: true,
      message: 'Employee registered successfully',
      user: {
        id: user.cognitoSub,
        email: user.email,
        userType: user.userType,
        cognitoSub: user.cognitoSub,
      },
    };

    return createResponse(201, response);
  } catch (error: any) {
    console.error('Error in registerEmployee:', error);

    const response: AuthResponse = {
      success: false,
      message: error.message || 'Failed to register employee',
    };

    return createResponse(400, response);
  }
};

export const login: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: LoginInput = JSON.parse(event.body);

    if (!input.email || !input.password) {
      return createResponse(400, {
        success: false,
        message: 'Email and password are required',
      });
    }

    const { user, tokens } = await cognitoService.login(input);

    // Generate session key for frontend redirection
    const sessionKey = await DynamoSessionService.createSession(
      user.cognitoSub,
      user.email,
      user.userType,
      tokens
    );

    const response: AuthResponse = {
      success: true,
      message: 'Login successful',
      user: {
        id: user.cognitoSub,
        email: user.email,
        userType: user.userType,
        cognitoSub: user.cognitoSub,
      },
      sessionKey,
    };

    return createResponse(200, response);
  } catch (error: any) {
    console.error('Error in login:', error);

    const response: AuthResponse = {
      success: false,
      message: error.message || 'Login failed',
    };

    return createResponse(401, response);
  }
};

export const refreshToken: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: RefreshTokenInput = JSON.parse(event.body);

    if (!input.refreshToken) {
      return createResponse(400, {
        success: false,
        message: 'Refresh token is required',
      });
    }

    const tokens = await cognitoService.refreshToken(input.refreshToken);

    const response: AuthResponse = {
      success: true,
      message: 'Token refreshed successfully',
      tokens,
    };

    return createResponse(200, response);
  } catch (error: any) {
    console.error('Error in refreshToken:', error);

    const response: AuthResponse = {
      success: false,
      message: error.message || 'Failed to refresh token',
    };

    return createResponse(401, response);
  }
};

export const forgotPassword: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: ForgotPasswordInput = JSON.parse(event.body);

    if (!input.email) {
      return createResponse(400, {
        success: false,
        message: 'Email is required',
      });
    }

    await cognitoService.forgotPassword(input.email);

    const response: AuthResponse = {
      success: true,
      message: 'Password reset code sent to email',
    };

    return createResponse(200, response);
  } catch (error: any) {
    console.error('Error in forgotPassword:', error);

    const response: AuthResponse = {
      success: false,
      message: error.message || 'Failed to send password reset code',
    };

    return createResponse(400, response);
  }
};

export const resetPassword: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: ResetPasswordInput = JSON.parse(event.body);

    if (!input.email || !input.code || !input.newPassword) {
      return createResponse(400, {
        success: false,
        message: 'Email, code, and newPassword are required',
      });
    }

    await cognitoService.resetPassword(input.email, input.code, input.newPassword);

    const response: AuthResponse = {
      success: true,
      message: 'Password reset successfully',
    };

    return createResponse(200, response);
  } catch (error: any) {
    console.error('Error in resetPassword:', error);

    const response: AuthResponse = {
      success: false,
      message: error.message || 'Failed to reset password',
    };

    return createResponse(400, response);
  }
};

export const verifyEmail: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: VerifyEmailInput = JSON.parse(event.body);

    if (!input.email || !input.code) {
      return createResponse(400, {
        success: false,
        message: 'Email and code are required',
      });
    }

    await cognitoService.verifyEmail(input.email, input.code);

    const response: AuthResponse = {
      success: true,
      message: 'Email verified successfully',
    };

    return createResponse(200, response);
  } catch (error: any) {
    console.error('Error in verifyEmail:', error);

    const response: AuthResponse = {
      success: false,
      message: error.message || 'Failed to verify email',
    };

    return createResponse(400, response);
  }
};

export const getProfile = async (event: APIGatewayProxyEventWithAuth): Promise<APIGatewayProxyResult> => {
  try {
    // Extract email from Authorization header instead of claims
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createResponse(401, {
        success: false,
        message: 'Authorization header required',
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT token to get email
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const email = decoded.email;

    const user = await cognitoService.getUser(email);

    const response: AuthResponse = {
      success: true,
      message: 'Profile retrieved successfully',
      user: {
        id: user.cognitoSub,
        email: user.email,
        userType: user.userType,
        cognitoSub: user.cognitoSub,
        // Incluir atributos adicionales para postulantes
        ...(user.attributes && {
          fullName: user.attributes.fullName,
          phone: user.attributes.phone,
          rut: user.attributes.rut,
          address: user.attributes.address,
          city: user.attributes.city,
          educationLevel: user.attributes.educationLevel,
          workExperience: user.attributes.workExperience,
          skills: user.attributes.skills,
          dateOfBirth: user.attributes.dateOfBirth,
        }),
      },
    };

    return createResponse(200, response);
  } catch (error: any) {
    console.error('Error in getProfile:', error);

    const response: AuthResponse = {
      success: false,
      message: error.message || 'Failed to get profile',
    };

    return createResponse(400, response);
  }
};

export const exchangeSession: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: ExchangeSessionInput = JSON.parse(event.body);

    if (!input.sessionKey) {
      return createResponse(400, {
        success: false,
        message: 'Session key is required',
      });
    }

    console.log('🔄 Exchange session attempt for sessionKey:', input.sessionKey.substring(0, 20) + '...');

    const sessionData = await DynamoSessionService.exchangeSession(input.sessionKey);

    if (!sessionData) {
      console.log('❌ Session exchange failed - invalid or expired session key');
      return createResponse(401, {
        success: false,
        message: 'Invalid or expired session key',
      });
    }

    console.log('✅ Session exchange successful for user:', sessionData.user.email);

    const response: AuthResponse = {
      success: true,
      message: 'Session exchanged successfully',
      user: sessionData.user,
      tokens: sessionData.tokens,
    };

    return createResponse(200, response);
  } catch (error: any) {
    console.error('Error in exchangeSession:', error);

    const response: AuthResponse = {
      success: false,
      message: error.message || 'Failed to exchange session',
    };

    return createResponse(400, response);
  }
};

export const logout: APIGatewayProxyHandler = async (event) => {
  try {
    const response: AuthResponse = {
      success: true,
      message: 'Logout successful',
    };

    return createResponse(200, response);
  } catch (error: any) {
    console.error('Error in logout:', error);

    const response: AuthResponse = {
      success: false,
      message: 'Logout failed',
    };

    return createResponse(400, response);
  }
};

// Internal endpoint for inter-service communication (folders-service -> auth-service)
export const getProfileInternal: APIGatewayProxyHandler = async (event) => {
  try {
    console.log('getProfileInternal called');

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const request = JSON.parse(event.body);

    // Validate internal API key
    const internalApiKey = process.env.INTERNAL_API_KEY || 'default-internal-key';
    if (request.apiKey !== internalApiKey) {
      return createResponse(403, {
        success: false,
        message: 'Invalid API key',
      });
    }

    if (!request.userId) {
      return createResponse(400, {
        success: false,
        message: 'userId is required',
      });
    }

    console.log(`AuthService: Looking up user with ID: ${request.userId}`);

    // Buscar usuario por userId en Cognito
    const user = await cognitoService.getUserById(request.userId);

    if (!user) {
      console.log(`AuthService: User not found for ID: ${request.userId}`);
      return createResponse(404, {
        success: false,
        message: 'User not found',
      });
    }

    console.log(`AuthService: User found: ${user.email}`);

    const response: AuthResponse = {
      success: true,
      message: 'User profile retrieved successfully',
      user: {
        id: user.cognitoSub,
        email: user.email,
        userType: user.userType,
        cognitoSub: user.cognitoSub,
        userId: user.cognitoSub,
        // Incluir atributos adicionales para postulantes
        ...(user.attributes && {
          fullName: user.attributes.fullName,
          firstName: user.attributes.firstName,
          lastName: user.attributes.lastName,
          phone: user.attributes.phone,
          rut: user.attributes.rut,
          address: user.attributes.address,
          city: user.attributes.city,
          educationLevel: user.attributes.educationLevel,
          workExperience: user.attributes.workExperience,
          skills: user.attributes.skills,
          dateOfBirth: user.attributes.dateOfBirth,
          createdAt: user.attributes.createdAt,
          updatedAt: user.attributes.updatedAt,
        }),
      },
    };

    return createResponse(200, response);
  } catch (error: any) {
    console.error('Error in getProfileInternal:', error);

    const response: AuthResponse = {
      success: false,
      message: error.message || 'Failed to get user profile',
    };

    return createResponse(500, response);
  }
};