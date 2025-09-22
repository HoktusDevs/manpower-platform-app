export interface CreateApplicationRequest {
  jobIds: string[];
  description?: string;
  documents?: string[];
}

export interface Application {
  applicationId: string;
  userId: string;
  jobId: string;
  status: 'PENDING' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED';
  description?: string;
  createdAt: string;
  updatedAt: string;
  documents?: string[];
  // Campos enriquecidos del job
  jobTitle?: string;
  companyName?: string;
  location?: string;
}

export interface ApplicationResponse {
  success: boolean;
  message: string;
  application?: Application;
  applications?: Application[];
  nextToken?: string;
}

class ApplicationsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://8lmunkvdd5.execute-api.us-east-1.amazonaws.com/dev';
  }

  /**
   * Crear aplicaciones para múltiples trabajos
   */
  async createApplications(request: CreateApplicationRequest): Promise<ApplicationResponse> {
    try {
      const accessToken = localStorage.getItem('cognito_access_token');
      
      if (!accessToken) {
        return {
          success: false,
          message: 'No hay token de acceso disponible',
        };
      }

      const response = await fetch(`${this.baseUrl}/applications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Error al crear aplicaciones',
        };
      }

      return data;
    } catch (error) {
      console.error('ApplicationsService: Error creando aplicaciones:', error);
      return {
        success: false,
        message: 'Error de conexión al crear aplicaciones',
      };
    }
  }

  /**
   * Obtener mis aplicaciones
   */
  async getMyApplications(): Promise<ApplicationResponse> {
    try {
      const accessToken = localStorage.getItem('cognito_access_token');
      
      if (!accessToken) {
        return {
          success: false,
          message: 'No hay token de acceso disponible',
        };
      }

      const response = await fetch(`${this.baseUrl}/applications/my`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Error al obtener aplicaciones',
        };
      }

      return data;
    } catch (error) {
      console.error('ApplicationsService: Error obteniendo aplicaciones:', error);
      return {
        success: false,
        message: 'Error de conexión al obtener aplicaciones',
      };
    }
  }

  /**
   * Eliminar una aplicación
   */
  async deleteApplication(applicationId: string): Promise<ApplicationResponse> {
    try {
      const accessToken = localStorage.getItem('cognito_access_token');
      
      if (!accessToken) {
        return {
          success: false,
          message: 'No hay token de acceso disponible',
        };
      }

      const response = await fetch(`${this.baseUrl}/applications/${applicationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Error al eliminar aplicación',
        };
      }

      return data;
    } catch (error) {
      console.error('ApplicationsService: Error eliminando aplicación:', error);
      return {
        success: false,
        message: 'Error de conexión al eliminar aplicación',
      };
    }
  }
}

export const applicationsService = new ApplicationsService();