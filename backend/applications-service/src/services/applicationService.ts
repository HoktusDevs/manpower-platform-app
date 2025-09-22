import { randomUUID } from 'crypto';
import { Application, ApplicationModel } from '../models/Application';
import { DynamoService } from './dynamoService';
import { FoldersServiceClient } from './foldersServiceClient';
import { CreateApplicationInput, ApplicationResponse, ApplicationQuery } from '../types';

export class ApplicationService {
  private dynamoService: DynamoService;
  private foldersServiceClient: FoldersServiceClient;

  constructor() {
    this.dynamoService = new DynamoService();
    this.foldersServiceClient = new FoldersServiceClient();
  }

  async createApplication(input: CreateApplicationInput, userId: string, userEmail?: string): Promise<ApplicationResponse> {
    try {
      const createdApplications: Application[] = [];
      const errors: string[] = [];

      // Procesar cada jobId
      for (const jobId of input.jobIds) {
        try {
          // Generar ID compuesto: jobId_userId
          const applicationId = `${jobId}_${userId}`;
          
          // Verificar si ya existe una aplicación con este ID compuesto
          const existingApplication = await this.dynamoService.getApplication(applicationId);
          
          if (existingApplication) {
            errors.push(`Ya has postulado al trabajo ${jobId}`);
            continue;
          }

          // Crear modelo de aplicación
          const applicationModel = new ApplicationModel({
            applicationId,
            userId,
            jobId,
            status: 'PENDING',
            description: input.description,
            documents: input.documents || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          // Validar datos
          if (!applicationModel.isValid()) {
            errors.push(`Datos inválidos para el trabajo ${jobId}`);
            continue;
          }

          // Crear aplicación en la base de datos
          const createdApplication = await this.dynamoService.createApplication(applicationModel);
          createdApplications.push(createdApplication);

          // Crear carpeta del postulante en folders-service
          try {
            // Obtener datos del job para conseguir el folderId
            const jobData = await this.dynamoService.getJobData(jobId);
            if (jobData && jobData.folderId && userEmail) {
              // Buscar la carpeta del cargo específico
              const jobFolderId = await this.dynamoService.getJobFolderId(jobData.folderId, jobData.title, jobData.companyName, jobData.location);
              
              if (jobFolderId) {
                const folderResult = await this.foldersServiceClient.createApplicantFolder(
                  userId, // Enviar el userId del postulante para que folders-service busque su nombre
                  jobFolderId, // Usar la carpeta del cargo específico
                  jobData.createdBy, // Usar el createdBy del job (admin)
                  applicationId,
                  {
                    applicantEmail: userEmail,
                    jobTitle: jobData.title,
                    companyName: jobData.companyName,
                    location: jobData.location,
                    appliedAt: new Date().toISOString(),
                    applicationStatus: 'PENDING'
                  }
                );

                if (folderResult.success) {
                  console.log(`Carpeta del postulante creada exitosamente para userId: ${userId}`);
                } else {
                  console.warn(`Error creando carpeta del postulante: ${folderResult.message}`);
                }
              } else {
                console.warn(`No se pudo encontrar la carpeta del cargo para el job ${jobId}`);
              }
            } else {
              console.warn(`No se pudo crear carpeta del postulante: jobData=${!!jobData}, folderId=${jobData?.folderId}, userEmail=${userEmail}`);
            }
          } catch (folderError) {
            console.error(`Error creando carpeta del postulante para job ${jobId}:`, folderError);
            // No fallar la aplicación por error en la carpeta
          }

        } catch (error) {
          console.error(`Error creating application for job ${jobId}:`, error);
          errors.push(`Error al crear aplicación para el trabajo ${jobId}`);
        }
      }

      // Determinar respuesta basada en resultados
      if (createdApplications.length === 0) {
        return {
          success: false,
          message: `No se pudieron crear aplicaciones. Errores: ${errors.join(', ')}`,
        };
      }

      if (errors.length > 0) {
        return {
          success: true,
          message: `Se crearon ${createdApplications.length} aplicaciones exitosamente. Algunos trabajos no se pudieron procesar: ${errors.join(', ')}`,
          applications: createdApplications,
        };
      }

      return {
        success: true,
        message: `Se crearon ${createdApplications.length} aplicaciones exitosamente`,
        applications: createdApplications,
      };
    } catch (error) {
      console.error('Error in createApplication:', error);
      return {
        success: false,
        message: 'Error interno del servidor al crear aplicaciones',
      };
    }
  }

  async getMyApplications(userId: string, limit?: number, nextToken?: string): Promise<ApplicationResponse> {
    try {
      const result = await this.dynamoService.getApplicationsByUser(userId, limit, nextToken);

      // Enriquecer aplicaciones con datos del job desde DynamoDB
      const enrichedApplications = await Promise.all(
        result.applications.map(async (application) => {
          try {
            // Obtener datos del job directamente desde DynamoDB
            const jobData = await this.dynamoService.getJobData(application.jobId);
            
            if (jobData) {
              return {
                ...application,
                // Datos del job
                title: jobData.title,
                description: jobData.description,
                companyName: jobData.companyName,
                location: jobData.location,
                salary: jobData.salary,
                employmentType: jobData.employmentType,
                experienceLevel: jobData.experienceLevel,
                requirements: jobData.requirements,
                folderId: jobData.folderId,
                status: jobData.status,
                isActive: jobData.isActive,
                updatedAt: jobData.updatedAt,
                // Mantener campos de la aplicación
                jobTitle: jobData.title, // Para compatibilidad
              };
            }
          } catch (error) {
            console.warn(`Error obteniendo datos del job ${application.jobId}:`, error);
          }
          
          // Fallback si no se pueden obtener los datos del job
          return {
            ...application,
            title: 'Trabajo no encontrado',
            description: 'Descripción no disponible',
            companyName: 'Empresa no especificada',
            location: 'Ubicación no especificada',
            salary: undefined,
            employmentType: 'FULL_TIME',
            experienceLevel: 'ENTRY_LEVEL',
            requirements: 'No especificados',
            folderId: '',
            status: 'DRAFT',
            isActive: false,
            updatedAt: application.updatedAt,
            jobTitle: 'Trabajo no encontrado', // Para compatibilidad
          };
        })
      );

      return {
        success: true,
        message: 'Aplicaciones obtenidas exitosamente',
        applications: enrichedApplications,
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
      const deleted = await this.dynamoService.deleteApplication(applicationId, userId);
      
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
