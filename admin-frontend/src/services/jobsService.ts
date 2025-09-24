/**
 * Jobs Service
 * Servicio para comunicarse con el jobs-service backend
 */

export interface JobPosting {
  jobId: string;
  title: string;
  description: string;
  companyName: string;
  companyId?: string;
  location: string;
  salary?: string;
  employmentType: string;
  experienceLevel: string;
  requirements?: string;
  benefits?: string;
  schedule?: string;
  expiresAt?: string;
  folderId: string;
  jobFolderId?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  requiredDocuments?: string[];
}

export interface JobsResponse {
  success: boolean;
  message: string;
  jobs?: JobPosting[];
}

export interface CreateJobInput {
  title: string;
  description: string;
  companyName: string;
  companyId?: string;
  location: string;
  salary?: string;
  employmentType: string;
  experienceLevel: string;
  requirements?: string;
  benefits?: string;
  schedule?: string;
  expiresAt?: string;
  folderId: string;
  requiredDocuments?: string[];
}

export interface UpdateJobInput {
  jobId: string;
  title?: string;
  description?: string;
  companyName?: string;
  companyId?: string;
  location?: string;
  salary?: string;
  employmentType?: string;
  experienceLevel?: string;
  requirements?: string;
  benefits?: string;
  schedule?: string;
  expiresAt?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';
  requiredDocuments?: string[];
}

class JobsService {
  private baseUrl: string;

  constructor() {
    // Configurar URL del jobs-service
    // Usar la URL de AWS API Gateway donde está desplegado
    this.baseUrl = import.meta.env.VITE_JOBS_SERVICE_URL || 'https://pa3itplx4f.execute-api.us-east-1.amazonaws.com/dev';
  }

  /**
   * Obtener todos los jobs (para admin)
   */
  async getAllJobs(): Promise<JobsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs`, {
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
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener jobs del servidor',
      };
    }
  }

  /**
   * Obtener jobs publicados (para postulantes)
   */
  async getPublishedJobs(): Promise<JobsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/published`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener jobs publicados del servidor',
      };
    }
  }

  /**
   * Obtener un job específico
   */
  async getJob(jobId: string): Promise<JobsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener el job del servidor',
      };
    }
  }

  /**
   * Crear un nuevo job
   */
  async createJob(input: CreateJobInput): Promise<JobsResponse> {
    try {
      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      let retries = 3;
      let lastError: Error | null = null;
      
      while (retries > 0) {
        try {
          const response = await fetch(`${this.baseUrl}/jobs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // TODO: Agregar token de autorización cuando esté implementado
              // 'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(input),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
          }

          const data = await response.json();
          return data;
        } catch (error) {
          lastError = error as Error;
          retries--;
          
          if (retries > 0 && !controller.signal.aborted) {
            console.log('Retrying job request, retries left:', retries, error);
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, 3 - retries) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            break;
          }
        }
      }
      
      // Handle final error
      if (controller.signal.aborted) {
        return {
          success: false,
          message: 'Request timeout - please try again',
        };
      }
      
      throw lastError || new Error('Unknown error');
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al crear el job en el servidor',
      };
    }
  }

  /**
   * Actualizar un job
   */
  async updateJob(input: UpdateJobInput): Promise<JobsResponse> {
    try {
      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      let retries = 3;
      let lastError: Error | null = null;
      
      while (retries > 0) {
        try {
          const url = this.baseUrl + '/jobs/' + input.jobId;
          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              // TODO: Agregar token de autorización cuando esté implementado
              // 'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(input),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
          }

          const data = await response.json();
          return data;
        } catch (error) {
          lastError = error as Error;
          retries--;
          
          if (retries > 0 && !controller.signal.aborted) {
            console.log('Retrying job request, retries left:', retries, error);
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, 3 - retries) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            break;
          }
        }
      }
      
      // Handle final error
      if (controller.signal.aborted) {
        return {
          success: false,
          message: 'Request timeout - please try again',
        };
      }
      
      throw lastError || new Error('Unknown error');
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al actualizar el job en el servidor',
      };
    }
  }

  /**
   * Eliminar un job
   */
  async deleteJob(jobId: string): Promise<JobsResponse> {
    console.log('🗑️ jobsService.deleteJob: Iniciando eliminación de job:', jobId);
    
    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Agregar token de autorización cuando esté implementado
          // 'Authorization': `Bearer ${token}`
        },
      });

      console.log('🗑️ jobsService.deleteJob: Response status:', response.status);
      console.log('🗑️ jobsService.deleteJob: Response ok:', response.ok);

      if (!response.ok) {
        console.error('🗑️ jobsService.deleteJob: HTTP error:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Si el backend no devuelve success, asumir que fue exitoso (200 OK)
      if (!data.success) {
        return {
          success: true,
          message: 'Job eliminado exitosamente',
          job: data
        };
      }
      
      return data;
    } catch (error) {
      console.error('🗑️ jobsService.deleteJob: Error en catch:', error);
      return {
        success: false,
        message: 'Error al eliminar el job del servidor',
      };
    }
  }

  /**
   * Obtener jobs por carpeta
   */
  async getJobsByFolder(folderId: string): Promise<JobsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/folder/${folderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener jobs por carpeta del servidor',
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
      return false;
    }
  }
}

// Exportar instancia singleton
export const jobsService = new JobsService();
