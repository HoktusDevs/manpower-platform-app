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
    this.baseUrl = 'https://7pptifb3zk.execute-api.us-east-1.amazonaws.com/dev';
  }

  /**
   * Obtener perfil del usuario actual desde auth-service
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

      const response = await fetch(`${this.baseUrl}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Error al obtener perfil del usuario',
        };
      }

      if (data.success && data.user) {
        // Mapear datos del auth-service a UserProfileData
        const userProfile: UserProfileData = {
          nombre: data.user.fullName || data.user.email?.split('@')[0] || '',
          apellido: '', // No disponible en auth-service
          rut: data.user.rut || '',
          email: data.user.email || '',
          telefono: data.user.phone || '',
          direccion: data.user.address || '',
          fechaNacimiento: data.user.dateOfBirth || '',
          educacionNivel: data.user.educationLevel || '',
          experienciaLaboral: data.user.workExperience || '',
          habilidades: data.user.skills || '',
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
      return {
        success: false,
        message: `Error al obtener perfil del usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      };
    }
  }

  /**
   * Actualizar perfil del usuario
   */
  async updateProfile(): Promise<UserResponse> {
    try {
      console.log('UserService: Servicio de usuario no implementado');
      
      return {
        success: false,
        message: 'Servicio de usuario no está disponible. Por favor, implemente el user-service backend.',
      };
    } catch (error) {
      console.error('UserService: Error actualizando perfil:', error);
      return {
        success: false,
        message: `Error al actualizar perfil del usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      };
    }
  }

  /**
   * Verificar salud del servicio
   */
  async checkHealth(): Promise<boolean> {
    try {
      console.log('UserService: Servicio de usuario no implementado');
      return false;
    } catch (error) {
      console.error('UserService: Error verificando salud del servicio:', error);
      return false;
    }
  }
}

// Exportar instancia singleton
export const userService = new UserService();
