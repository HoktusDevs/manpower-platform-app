export interface User {
  sub: string;
  email: string;
  given_name?: string | undefined;
  family_name?: string | undefined;
  'custom:role'?: string | undefined;
  'custom:ci'?: string | undefined;
  'custom:telefono'?: string | undefined;
  email_verified: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  given_name?: string;
  family_name?: string;
  ci?: string;
  telefono?: string;
  role?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  accessToken?: string;
  sessionKey?: string;
  message?: string;
  requiresConfirmation?: boolean;
}

export interface ConfirmSignUpRequest {
  email: string;
  confirmationCode: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  confirmationCode: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (request: LoginRequest) => Promise<AuthResponse>;
  register: (request: RegisterRequest) => Promise<AuthResponse>;
  logout: () => void;
  confirmSignUp: (request: ConfirmSignUpRequest) => Promise<AuthResponse>;
  forgotPassword: (request: ForgotPasswordRequest) => Promise<AuthResponse>;
  resetPassword: (request: ResetPasswordRequest) => Promise<AuthResponse>;
  changePassword: (request: ChangePasswordRequest) => Promise<AuthResponse>;
  refreshToken: () => Promise<boolean>;
}