// Unified authentication types for both custom auth and Cognito

export interface BaseUser {
  userId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'postulante';
}

// Extended user interface for custom auth service (with additional fields)
export interface CustomUser extends BaseUser {
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  emailVerified?: boolean;
  lastLoginAt?: string;
}

// Cognito user interface (with different optional fields)
export interface CognitoUser extends BaseUser {
  emailVerified?: boolean;
  mfaEnabled?: boolean;
}

// Unified user type for the application
export type User = BaseUser & {
  // Optional fields that may be present from either system
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  lastLoginAt?: string;
  mfaEnabled?: boolean;
};

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'postulante';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse<T = User> {
  success: boolean;
  message?: string;
  data?: {
    user: T;
    token?: string;
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  };
}

// Auth system type
export type AuthSystem = 'cognito' | 'custom';

// Configuration for Cognito
export interface CognitoConfig {
  userPoolId: string;
  userPoolClientId: string;
  identityPoolId: string;
  region: string;
}