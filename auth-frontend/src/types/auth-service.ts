export interface RegisterAdminRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterEmployeeRequest {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  rut: string;
  dateOfBirth: string;
  address: string;
  city: string;
  educationLevel: string;
  workExperience: string;
  skills: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface AuthServiceResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    userType: 'admin' | 'postulante';
    cognitoSub: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    idToken: string;
    expiresIn: number;
  };
}

export interface RefreshTokenResponse {
  success: boolean;
  data?: {
    accessToken: string;
  };
  message?: string;
}

export interface BasicResponse {
  success: boolean;
  message: string;
}