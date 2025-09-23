export interface AuthUser {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  [key: string]: unknown;
}

export interface AuthSession {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number;
  user: AuthUser;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterUserData {
  email: string;
  password: string;
  given_name: string;
  family_name: string;
  phone_number?: string;
}

export interface AuthError {
  code: string;
  message: string;
  name: string;
}

export interface ForgotPasswordResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ResetPasswordData {
  username: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

export interface JWTPayload {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
  email_verified?: boolean;
  exp: number;
  iat: number;
  iss: string;
  aud: string;
  [key: string]: unknown;
}

export interface User {
  userId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'postulante';
  emailVerified: boolean;
  mfaEnabled?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  given_name: string;
  family_name: string;
  phone_number?: string;
  fullName?: string;
  role?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

export interface CognitoConfig {
  userPoolId: string;
  userPoolClientId: string;
  region: string;
  identityPoolId?: string;
}