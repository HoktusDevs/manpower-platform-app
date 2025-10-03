import { apiClient } from '../lib/axios';
import { AxiosError } from 'axios';
import type { Application } from '../types';

export interface CreateApplicationRequest {
  jobIds: string[];
  description?: string;
  documents?: string[];
}

export interface ApplicationResponse {
  success: boolean;
  message: string;
  application?: Application;
  applications?: Application[];
  nextToken?: string;
}

export interface ApplicationExistsResponse {
  success: boolean;
  exists: boolean;
  applicationId?: string;
  message?: string;
}

class ApplicationsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://b1lbhzwg97.execute-api.us-east-1.amazonaws.com/dev';
  }

  /**
   * Crear aplicaciones para múltiples trabajos
   */
  async createApplications(request: CreateApplicationRequest): Promise<ApplicationResponse> {
    try {
      const { data } = await apiClient.post<ApplicationResponse>(
        `${this.baseUrl}/applications`,
        request
      );
      return data;
    } catch (error) {
      console.error('ApplicationsService: Error creando aplicaciones:', error);
      const axiosError = error as AxiosError<ApplicationResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Error de conexión al crear aplicaciones',
      };
    }
  }

  /**
   * Obtener mis aplicaciones
   */
  async getMyApplications(nextToken?: string): Promise<ApplicationResponse> {
    try {
      const params = nextToken ? { nextToken } : {};
      const { data } = await apiClient.get<ApplicationResponse>(
        `${this.baseUrl}/applications/my-applications`,
        { params }
      );
      return data;
    } catch (error) {
      console.error('ApplicationsService: Error obteniendo aplicaciones:', error);
      const axiosError = error as AxiosError<ApplicationResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Error de conexión al obtener aplicaciones',
      };
    }
  }

  /**
   * Obtener una aplicación por ID
   */
  async getApplication(applicationId: string): Promise<ApplicationResponse> {
    try {
      const { data } = await apiClient.get<ApplicationResponse>(
        `${this.baseUrl}/applications/${applicationId}`
      );
      return data;
    } catch (error) {
      console.error('ApplicationsService: Error obteniendo aplicación:', error);
      const axiosError = error as AxiosError<ApplicationResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Error de conexión al obtener aplicación',
      };
    }
  }

  /**
   * Eliminar una aplicación
   */
  async deleteApplication(applicationId: string): Promise<ApplicationResponse> {
    try {
      const { data} = await apiClient.delete<ApplicationResponse>(
        `${this.baseUrl}/applications/${applicationId}`
      );
      return data;
    } catch (error) {
      console.error('ApplicationsService: Error eliminando aplicación:', error);
      const axiosError = error as AxiosError<ApplicationResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Error de conexión al eliminar aplicación',
      };
    }
  }

  /**
   * Actualizar una aplicación
   */
  async updateApplication(
    applicationId: string,
    updates: Partial<Application>
  ): Promise<ApplicationResponse> {
    try {
      const { data } = await apiClient.put<ApplicationResponse>(
        `${this.baseUrl}/applications/${applicationId}`,
        updates
      );
      return data;
    } catch (error) {
      console.error('ApplicationsService: Error actualizando aplicación:', error);
      const axiosError = error as AxiosError<ApplicationResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Error de conexión al actualizar aplicación',
      };
    }
  }

  /**
   * Verificar si existe una aplicación para un trabajo
   */
  async checkApplicationExists(jobId: string): Promise<ApplicationExistsResponse> {
    try {
      const { data } = await apiClient.get<ApplicationExistsResponse>(
        `${this.baseUrl}/applications/check/${jobId}`
      );
      return data;
    } catch (error) {
      console.error('ApplicationsService: Error verificando aplicación:', error);
      const axiosError = error as AxiosError<ApplicationExistsResponse>;
      return {
        success: false,
        exists: false,
        message: axiosError.response?.data?.message || 'Error de conexión al verificar aplicación',
      };
    }
  }
}

export const applicationsService = new ApplicationsService();
