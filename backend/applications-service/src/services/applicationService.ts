import { randomUUID } from 'crypto';
import { Application, ApplicationModel } from '../models/Application';
import { DynamoService } from './dynamoService';
import { CreateApplicationInput, ApplicationResponse, ApplicationQuery } from '../types';

export class ApplicationService {
  private dynamoService: DynamoService;

  constructor() {
    this.dynamoService = new DynamoService();
  }

  async createApplication(input: CreateApplicationInput, userId: string): Promise<ApplicationResponse> {
    try {
      // Verificar si ya existe una aplicación para este usuario y job
      const existingApplication = await this.dynamoService.checkApplicationExists(userId, input.jobId);
      
      if (existingApplication) {
        return {
          success: false,
          message: 'Ya has postulado a este trabajo. No puedes postular al mismo trabajo más de una vez.',
        };
      }

      // Generar ID único para la aplicación
      const applicationId = randomUUID();

      // Crear modelo de aplicación
      const applicationModel = new ApplicationModel({
        applicationId,
        userId,
        jobId: input.jobId,
        status: 'PENDING',
        description: input.description,
        documents: input.documents || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Validar datos
      if (!applicationModel.isValid()) {
        return {
          success: false,
          message: 'Datos de aplicación inválidos. Por favor verifica los campos requeridos.',
        };
      }

      // Crear aplicación en la base de datos
      const createdApplication = await this.dynamoService.createApplication(applicationModel);

      return {
        success: true,
        message: 'Aplicación creada exitosamente',
        application: createdApplication,
      };
    } catch (error) {
      console.error('Error in createApplication:', error);
      return {
        success: false,
        message: 'Error interno del servidor al crear aplicación',
      };
    }
  }

  async getMyApplications(userId: string, limit?: number, nextToken?: string): Promise<ApplicationResponse> {
    try {
      const result = await this.dynamoService.getApplicationsByUser(userId, limit, nextToken);

      return {
        success: true,
        message: 'Aplicaciones obtenidas exitosamente',
        applications: result.applications,
        nextToken: result.nextToken,
      };
    } catch (error) {
      console.error('Error in getMyApplications:', error);
      return {
        success: false,
        message: 'Error interno del servidor al obtener aplicaciones',
      };
    }
  }

  async deleteApplication(applicationId: string, userId: string): Promise<ApplicationResponse> {
    try {
      // Verificar que la aplicación existe y pertenece al usuario
      const application = await this.dynamoService.getApplication(applicationId);
      
      if (!application) {
        return {
          success: false,
          message: 'Aplicación no encontrada',
        };
      }

      if (application.userId !== userId) {
        return {
          success: false,
          message: 'No tienes permisos para eliminar esta aplicación',
        };
      }

      // Eliminar aplicación
      const deleted = await this.dynamoService.deleteApplication(applicationId);
      
      if (!deleted) {
        return {
          success: false,
          message: 'Error al eliminar la aplicación',
        };
      }

      return {
        success: true,
        message: 'Aplicación eliminada exitosamente',
      };
    } catch (error) {
      console.error('Error in deleteApplication:', error);
      return {
        success: false,
        message: 'Error interno del servidor al eliminar aplicación',
      };
    }
  }

  async checkApplicationExists(userId: string, jobId: string): Promise<ApplicationResponse> {
    try {
      const application = await this.dynamoService.checkApplicationExists(userId, jobId);
      
      return {
        success: true,
        message: application ? 'Ya existe una aplicación para este trabajo' : 'No existe aplicación para este trabajo',
        application: application || undefined,
      };
    } catch (error) {
      console.error('Error in checkApplicationExists:', error);
      return {
        success: false,
        message: 'Error interno del servidor al verificar aplicación',
      };
    }
  }
}
