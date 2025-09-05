// Authentication types for Auth Service

export interface User {
  userId: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: 'admin' | 'postulante';
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
}

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

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
  expiresIn: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'postulante';
  iat: number;
  exp: number;
}

// Auth-specific error classes
export class AuthError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string = 'AUTH_ERROR', statusCode: number = 400) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AuthError {
  constructor(message: string, errors: string[] = []) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends AuthError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

// API Response Types - Precise typing for all API responses
export interface APIResponse {
  success: boolean;
  message: string;
  data?: AuthResponse | User[] | string;
  timestamp?: number;
  requestId?: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  details?: ValidationError[] | string[];
  statusCode?: number;
  timestamp?: number;
  requestId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Health check types
export interface HealthCheckData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  version: string;
  environment: 'development' | 'staging' | 'production';
  database: DatabaseStatus;
  memory: MemoryStatus;
}

export interface DatabaseStatus {
  connected: boolean;
  latency?: number;
}

export interface MemoryStatus {
  used: number;
  total: number;
  percentage: number;
}

// Lambda event types
export interface LambdaEventBody {
  action: 'register' | 'login' | 'refresh' | 'validate' | 'health';
  email?: string;
  password?: string;
  fullName?: string;
  role?: 'admin' | 'postulante';
  token?: string;
}