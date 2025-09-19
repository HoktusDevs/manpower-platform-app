import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  ConfirmSignUpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  User,
} from './auth';

export interface AuthRepository {
  register(request: RegisterRequest): Promise<AuthResponse>;
  confirmSignUp(request: ConfirmSignUpRequest): Promise<AuthResponse>;
  login(request: LoginRequest): Promise<AuthResponse>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  isAuthenticated(): Promise<boolean>;
  forgotPassword(request: ForgotPasswordRequest): Promise<AuthResponse>;
  resetPassword(request: ResetPasswordRequest): Promise<AuthResponse>;
  changePassword(request: ChangePasswordRequest): Promise<AuthResponse>;
  refreshToken(): Promise<boolean>;
  getAccessToken(): Promise<string | null>;
}