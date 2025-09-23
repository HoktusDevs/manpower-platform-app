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
      console.log('JobsService: Obteniendo todos los jobs desde', `${this.baseUrl}/jobs`);
      
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
      console.log('JobsService: Respuesta recibida', data);
      
      return data;
    } catch (error) {
      console.error('JobsService: Error obteniendo jobs:', error);
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
      console.log('JobsService: Obteniendo jobs publicados desde', `${this.baseUrl}/jobs/published`);
      
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
      console.log('JobsService: Jobs publicados recibidos', data);
      
      return data;
    } catch (error) {
      console.error('JobsService: Error obteniendo jobs publicados:', error);
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
      console.log('JobsService: Obteniendo job', jobId, 'desde', `${this.baseUrl}/jobs/${jobId}`);
      
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
      console.log('JobsService: Job recibido', data);
      
      return data;
    } catch (error) {
      console.error('JobsService: Error obteniendo job:', error);
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
      console.log('JobsService: Creando job', input);
      
      const response = await fetch(`${this.baseUrl}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Agregar token de autorización cuando esté implementado
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('JobsService: Job creado', data);
      
      return data;
    } catch (error) {
      console.error('JobsService: Error creando job:', error);
      return {
        success: false,
        message: 'Error al crear el job en el servidor',
      };
    }
  }

  /**
   * Actualizar un job
   */
  async updateJob(input: UpdateJobInput): Promise<JobsResponse> {
    try {
      console.log('JobsService: Actualizando job', input);
      
      const response = await fetch(`${this.baseUrl}/jobs/${input.jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Agregar token de autorización cuando esté implementado
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('JobsService: Job actualizado', data);
      
      return data;
    } catch (error) {
      console.error('JobsService: Error actualizando job:', error);
      return {
        success: false,
        message: 'Error al actualizar el job en el servidor',
      };
    }
  }

  /**
   * Eliminar un job
   */
  async deleteJob(jobId: string): Promise<JobsResponse> {
    try {
      console.log('JobsService: Eliminando job', jobId);
      
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
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
      console.log('JobsService: Job eliminado', data);
      
      return data;
    } catch (error) {
      console.error('JobsService: Error eliminando job:', error);
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
      console.log('JobsService: Obteniendo jobs por carpeta', folderId);
      
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
      console.log('JobsService: Jobs por carpeta recibidos', data);
      
      return data;
    } catch (error) {
      console.error('JobsService: Error obteniendo jobs por carpeta:', error);
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
      console.error('JobsService: Error verificando salud del servicio:', error);
      return false;
    }
  }
}

// Exportar instancia singleton
export const jobsService = new JobsService();
