import { apiClient } from '../lib/axios';
import { AxiosError } from 'axios';

/**
 * User Service para applicant-frontend
 * Servicio para gestionar datos de usuario y perfil
 */

export interface UserProfileData {
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  fechaNacimiento: string;
  educacionNivel: string;
  experienciaLaboral: string;
  habilidades: string;
}

export interface UserApplicationData {
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  educacion: string;
}

export interface UserResponse {
  success: boolean;
  message: string;
  user?: UserProfileData;
}

class UserService {
  private baseUrl: string;

  constructor() {
    // auth-service maneja el perfil de usuario en /auth/profile
    this.baseUrl = 'https://7pptifb3zk.execute-api.us-east-1.amazonaws.com/dev';
  }

  /**
   * Obtener perfil del usuario actual desde users-service
   */
  async getProfile(): Promise<UserResponse> {
    try {
      const idToken = localStorage.getItem('cognito_id_token');

      if (!idToken) {
        return {
          success: false,
          message: 'No hay token de identidad disponible',
        };
      }

      // Usar el ID token en el header Authorization
      // auth-service expone el perfil en /auth/profile
      const { data } = await apiClient.get<any>(`${this.baseUrl}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (data.success && data.user) {
        // Mapear datos del users-service a UserProfileData
        const userProfile: UserProfileData = {
          nombre: data.user.nombre || data.user.fullName || data.user.email?.split('@')[0] || '',
          apellido: data.user.apellido || '',
          rut: data.user.rut || '',
          email: data.user.email || '',
          telefono: data.user.telefono || data.user.phone || '',
          direccion: data.user.direccion || data.user.address || '',
          fechaNacimiento: data.user.fechaNacimiento || data.user.dateOfBirth || '',
          educacionNivel: data.user.educacionNivel || data.user.educationLevel || '',
          experienciaLaboral: data.user.experienciaLaboral || data.user.workExperience || '',
          habilidades: data.user.habilidades || data.user.skills || '',
        };

        return {
          success: true,
          message: 'Perfil obtenido exitosamente',
          user: userProfile,
        };
      }

      return {
        success: false,
        message: 'No se pudieron obtener los datos del usuario',
      };
    } catch (error) {
      console.error('UserService: Error obteniendo perfil:', error);
      const axiosError = error as AxiosError<UserResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Error al obtener perfil del usuario',
      };
    }
  }

  /**
   * Actualizar perfil del usuario
   */
  async updateProfile(profileData: Partial<UserProfileData>): Promise<UserResponse> {
    try {
      // auth-service no tiene endpoint de actualización de perfil todavía
      // TODO: Implementar endpoint PUT /auth/profile en auth-service
      const { data } = await apiClient.put<UserResponse>(
        `${this.baseUrl}/auth/profile`,
        profileData
      );
      return data;
    } catch (error) {
      console.error('UserService: Error actualizando perfil:', error);
      const axiosError = error as AxiosError<UserResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Error al actualizar perfil del usuario',
      };
    }
  }

  /**
   * Verificar salud del servicio
   */
  async checkHealth(): Promise<boolean> {
    try {
      await apiClient.get(`${this.baseUrl}/health`);
      return true;
    } catch (error) {
      console.error('UserService: Error verificando salud del servicio:', error);
      return false;
    }
  }
}

// Exportar instancia singleton
export const userService = new UserService();
