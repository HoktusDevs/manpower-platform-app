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
    // TODO: Implementar user-service backend
    this.baseUrl = '';
  }

  /**
   * Obtener perfil del usuario actual
   */
  async getProfile(): Promise<UserResponse> {
    try {
      console.log('UserService: Servicio de usuario no implementado');
      
      return {
        success: false,
        message: 'Servicio de usuario no está disponible. Por favor, implemente el user-service backend.',
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
  async updateProfile(profileData: UserProfileData): Promise<UserResponse> {
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
