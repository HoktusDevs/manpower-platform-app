// Auth Service - Conecta dinámicamente con el backend
import type { 
  User, 
  RegisterRequest, 
  LoginRequest, 
  AuthResponse,
  // CustomUser 
} from '../types/auth';
import type { HealthCheckResponse } from '../types/config';
// import { migrationService } from './migrationService';

// Legacy interface for internal service usage (supports legacy employee role)
interface InternalUser {
  userId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'postulante' | 'employee';
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
}

class AuthService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    // URL dinámica del microservicio
    this.baseUrl = import.meta.env.VITE_AUTH_API_URL || 'https://2119kl9bk4.execute-api.us-east-1.amazonaws.com/dev';
    this.token = localStorage.getItem('auth_token');
  }

  // Convert internal user to unified user type
  private convertInternalUser(internalUser: InternalUser): User {
    return {
      userId: internalUser.userId,
      email: internalUser.email,
      fullName: internalUser.fullName,
      role: internalUser.role === 'employee' ? 'postulante' : internalUser.role, // Map employee to postulante
      createdAt: internalUser.createdAt,
      updatedAt: internalUser.updatedAt,
      isActive: internalUser.isActive,
      emailVerified: internalUser.emailVerified,
      lastLoginAt: internalUser.lastLoginAt,
    };
  }

  // Convert unified user to internal user type
  private convertToInternalUser(user: User): InternalUser {
    return {
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      role: user.role as 'admin' | 'postulante', // Unified type only supports admin/postulante
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
      isActive: user.isActive ?? true,
      emailVerified: user.emailVerified ?? false,
      lastLoginAt: user.lastLoginAt,
    };
  }

  // Headers con JWT automático
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Manejo dinámico de respuestas
  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();
    
    if (!response.ok) {
      // Construir mensaje de error más detallado
      let errorMessage = data.message || data.error || `HTTP error! status: ${response.status}`;
      
      // Si hay detalles de validación, agregarlos
      if (data.details && data.details.validationErrors && Array.isArray(data.details.validationErrors)) {
        errorMessage = data.details.validationErrors.join(', ');
      }
      
      throw new Error(errorMessage);
    }
    
    return data;
  }

  // Registro de usuario
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(userData),
      });

      const result = await this.handleResponse<AuthResponse>(response);
      
      if (result.success && result.data?.token) {
        this.setToken(result.data.token);
      }
      
      return result;
    } catch (error) {
      throw new Error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Login de usuario
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(credentials),
      });

      const result = await this.handleResponse<AuthResponse>(response);
      
      if (result.success && result.data?.token) {
        this.setToken(result.data.token);
      }
      
      return result;
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Health check del servicio
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Logout
  logout(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }

  // Verificar si está autenticado
  isAuthenticated(): boolean {
    return !!this.token && !this.isTokenExpired();
  }

  // Obtener usuario actual
  getCurrentUser(): User | null {
    const userData = localStorage.getItem('user_data');
    if (!userData) return null;
    
    try {
      const internalUser: InternalUser = JSON.parse(userData);
      return this.convertInternalUser(internalUser);
    } catch {
      return null;
    }
  }

  // Gestión de tokens
  private setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return this.token;
  }

  private isTokenExpired(): boolean {
    if (!this.token) return true;
    
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  // Guardar datos del usuario
  setUserData(user: User): void {
    const internalUser = this.convertToInternalUser(user);
    localStorage.setItem('user_data', JSON.stringify(internalUser));
  }
}

export const authService = new AuthService();