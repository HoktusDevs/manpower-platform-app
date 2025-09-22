/**
 * Applications Service para applicant-frontend
 * Servicio para gestionar aplicaciones de postulantes
 */

export interface Application {
  userId: string;
  applicationId: string;
  jobId: string;
  companyName: string;
  position: string;
  status: 'PENDING' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED';
  description?: string;
  salary?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  companyId?: string;
}

export interface ApplicationResponse {
  success: boolean;
  message: string;
  application?: Application;
  applications?: Application[];
  nextToken?: string;
}

export interface CreateApplicationRequest {
  jobId: string;
  description?: string;
  documents?: File[];
}

class ApplicationsService {
  private baseUrl: string;

  constructor() {
    // Configurar URL del applications-service (usando API Gateway)
    this.baseUrl = 'https://8lmunkvdd5.execute-api.us-east-1.amazonaws.com/dev';
    console.log('ApplicationsService: Base URL configurada:', this.baseUrl);
  }

  /**
   * Obtener aplicaciones del usuario actual
   */
  async getMyApplications(limit?: number, nextToken?: string): Promise<ApplicationResponse> {
    try {
      console.log('ApplicationsService: Obteniendo aplicaciones del usuario');
      
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (nextToken) params.append('nextToken', nextToken);

      const response = await fetch(`${this.baseUrl}/applications/my`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Agregar token de autorización cuando esté implementado
          // 'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('ApplicationsService: Aplicaciones obtenidas', data);
      
      return data;
    } catch (error) {
      console.error('ApplicationsService: Error obteniendo aplicaciones:', error);
      return {
        success: false,
        message: 'Error al obtener aplicaciones del servidor',
      };
    }
  }

  /**
   * Crear nueva aplicación
   */
  async createApplication(request: CreateApplicationRequest): Promise<ApplicationResponse> {
    try {
      console.log('ApplicationsService: Creando nueva aplicación', request.jobId);
      
      const response = await fetch(`${this.baseUrl}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Agregar token de autorización cuando esté implementado
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('ApplicationsService: Aplicación creada', data);
      
      return data;
    } catch (error) {
      console.error('ApplicationsService: Error creando aplicación:', error);
      return {
        success: false,
        message: 'Error al crear aplicación en el servidor',
      };
    }
  }

  /**
   * Eliminar aplicación
   */
  async deleteApplication(applicationId: string): Promise<ApplicationResponse> {
    try {
      console.log('ApplicationsService: Eliminando aplicación', applicationId);
      
      const response = await fetch(`${this.baseUrl}/applications/${applicationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Agregar token de autorización cuando esté implementado
          // 'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('ApplicationsService: Aplicación eliminada', data);
      
      return data;
    } catch (error) {
      console.error('ApplicationsService: Error eliminando aplicación:', error);
      return {
        success: false,
        message: 'Error al eliminar aplicación del servidor',
      };
    }
  }

  /**
   * Verificar si ya existe una aplicación para un job específico
   */
  async checkApplicationExists(jobId: string): Promise<ApplicationResponse> {
    try {
      console.log('ApplicationsService: Verificando si existe aplicación para job:', jobId);
      
      const response = await fetch(`${this.baseUrl}/applications/check/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Agregar token de autorización cuando esté implementado
          // 'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('ApplicationsService: Verificación de aplicación:', data);
      
      return data;
    } catch (error) {
      console.error('ApplicationsService: Error verificando aplicación:', error);
      return {
        success: false,
        message: 'Error al verificar aplicación existente',
      };
    }
  }

  /**
   * Verificar salud del servicio
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      });

      return response.ok;
    } catch (error) {
      console.error('ApplicationsService: Error verificando salud del servicio:', error);
      return false;
    }
  }
}

// Exportar instancia singleton
export const applicationsService = new ApplicationsService();
