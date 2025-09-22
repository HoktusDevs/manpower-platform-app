/**
 * Jobs Service para applicant-frontend
 * Servicio para comunicarse con el jobs-service backend
 */

import type { JobPosting } from '../types';

export interface JobsResponse {
  success: boolean;
  message: string;
  jobs?: JobPosting[];
  nextToken?: string;
}

class JobsService {
  private baseUrl: string;

  constructor() {
    // Configurar URL del jobs-service
    this.baseUrl = 'https://pa3itplx4f.execute-api.us-east-1.amazonaws.com/dev';
    console.log('JobsService: Base URL configurada:', this.baseUrl);
  }

  /**
   * Obtener todos los jobs (mismo endpoint que admin-frontend)
   */
  async getAllJobs(limit?: number, nextToken?: string): Promise<JobsResponse> {
    try {
      const url = `${this.baseUrl}/jobs`;
      console.log('JobsService: Obteniendo todos los jobs desde', url);
      
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (nextToken) params.append('nextToken', nextToken);

      const fullUrl = `${url}?${params}`;
      console.log('JobsService: URL completa:', fullUrl);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('JobsService: Status de respuesta:', response.status);
      console.log('JobsService: Headers de respuesta:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('JobsService: Error response body:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      console.log('JobsService: Respuesta recibida', data);
      
      return data;
    } catch (error) {
      console.error('JobsService: Error obteniendo jobs:', error);
      return {
        success: false,
        message: `Error al obtener empleos del servidor: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      };
    }
  }

  /**
   * Obtener un job específico
   */
  async getJob(jobId: string): Promise<JobsResponse> {
    try {
      console.log('JobsService: Obteniendo job específico', jobId);
      
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
      console.log('JobsService: Job obtenido', data);
      
      return data;
    } catch (error) {
      console.error('JobsService: Error obteniendo job:', error);
      return {
        success: false,
        message: 'Error al obtener el empleo del servidor',
      };
    }
  }

  /**
   * Verificar salud del servicio
   */
  async checkHealth(): Promise<boolean> {
    try {
      console.log('JobsService: Verificando salud del servicio en', `${this.baseUrl}/health`);
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      });

      console.log('JobsService: Health check status:', response.status);
      return response.ok;
    } catch (error) {
      console.error('JobsService: Error verificando salud del servicio:', error);
      return false;
    }
  }

}

// Exportar instancia singleton
export const jobsService = new JobsService();
