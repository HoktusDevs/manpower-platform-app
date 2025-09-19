export interface RegisterAdminInput {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterEmployeeInput {
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

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
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
  sessionKey?: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  email: string;
  code: string;
  newPassword: string;
}

export interface VerifyEmailInput {
  email: string;
  code: string;
}

export interface ExchangeSessionInput {
  sessionKey: string;
}

export interface CognitoUser {
  cognitoSub: string;
  email: string;
  userType: 'admin' | 'postulante';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  attributes?: {
    fullName?: string;
    phone?: string;
    rut?: string;
    dateOfBirth?: string;
    address?: string;
    city?: string;
    educationLevel?: string;
    workExperience?: string;
    skills?: string;
  };
}

export interface APIGatewayProxyEventWithAuth {
  headers: { [name: string]: string | undefined };
  pathParameters: { [name: string]: string | undefined } | null;
  queryStringParameters: { [name: string]: string | undefined } | null;
  body: string | null;
  isBase64Encoded: boolean;
  requestContext: {
    authorizer?: {
      claims: {
        sub: string;
        email: string;
        'custom:role': 'admin' | 'postulante';
        [key: string]: any;
      };
    };
  };
}