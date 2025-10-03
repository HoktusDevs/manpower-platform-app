import { randomUUID } from 'crypto';
import { Application, ApplicationModel } from '../models/Application';
import { DynamoService } from './dynamoService';
import { FoldersServiceClient } from './foldersServiceClient';
import { UserService } from './userService';
import { CompanyService } from './companyService';
import { CreateApplicationInput, ApplicationResponse, ApplicationQuery } from '../types';

export class ApplicationService {
  private dynamoService: DynamoService;
  private foldersServiceClient: FoldersServiceClient;
  private userService: UserService;
  private companyService: CompanyService;

  constructor() {
    this.dynamoService = new DynamoService();
    this.foldersServiceClient = new FoldersServiceClient();
    this.userService = new UserService();
    this.companyService = new CompanyService();
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

          // Crear carpeta del postulante en folders-service y agregar folderId a la aplicación
          let applicantFolderId: string | undefined;
          try {
            // Obtener datos del job para conseguir el folderId
            const jobData = await this.dynamoService.getJobData(jobId);
            if (jobData && jobData.folderId && userEmail) {
              // El folderId del job YA ES la carpeta del cargo (no necesita búsqueda adicional)
              const jobFolderId = jobData.folderId;

              console.log(`📁 Creating applicant folder under job folder: ${jobFolderId} (${jobData.title})`);

              const folderResult = await this.foldersServiceClient.createApplicantFolder(
                userId, // Enviar el userId del postulante para que folders-service busque su nombre
                jobFolderId, // Usar la carpeta del cargo directamente
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

              if (folderResult.success && folderResult.folder?.folderId) {
                applicantFolderId = folderResult.folder.folderId;
                console.log(`✅ Carpeta del postulante creada exitosamente: ${applicantFolderId}`);
              } else {
                console.warn(`⚠️ Error creando carpeta del postulante: ${folderResult.message}`);
              }
            } else {
              console.warn(`⚠️ No se pudo crear carpeta del postulante: jobData=${!!jobData}, folderId=${jobData?.folderId}, userEmail=${userEmail}`);
            }
          } catch (folderError) {
            console.error(`❌ Error creando carpeta del postulante para job ${jobId}:`, folderError);
            // No fallar la aplicación por error en la carpeta
          }

          // Agregar folderId a la aplicación antes de pushear
          createdApplications.push({
            ...createdApplication,
            applicantFolderId
          });

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

  async deleteApplication(applicationId: string, userId?: string): Promise<ApplicationResponse> {
    try {
      // Verificar que la aplicación existe
      const application = await this.dynamoService.getApplication(applicationId);

      if (!application) {
        return {
          success: false,
          message: 'Aplicación no encontrada',
        };
      }

      // Si se proporciona userId, verificar permisos
      if (userId && application.userId !== userId) {
        return {
          success: false,
          message: 'No tienes permisos para eliminar esta aplicación',
        };
      }

      // Obtener datos del job para encontrar el admin userId (createdBy)
      let adminUserId = userId; // Default to current user
      try {
        const jobData = await this.dynamoService.getJobData(application.jobId);
        if (jobData && jobData.createdBy) {
          adminUserId = jobData.createdBy;
        }
      } catch (error) {
        console.warn('Could not get job data for admin userId, using current user:', error);
      }

      // Eliminar aplicación de la base de datos
      const deleted = await this.dynamoService.deleteApplication(applicationId);

      if (!deleted) {
        return {
          success: false,
          message: 'Error al eliminar la aplicación',
        };
      }

      // Intentar eliminar la carpeta del postulante (non-blocking)
      try {
        const jobData = await this.dynamoService.getJobData(application.jobId);

        if (jobData && jobData.folderId) {
          console.log(`🗑️ Attempting to delete folder for application: ${applicationId}`);
          const folderResult = await this.foldersServiceClient.deleteFolderByApplicationId(
            applicationId,
            jobData.folderId, // Pass the job folder ID
            adminUserId || 'system'
          );

          if (folderResult.success) {
            console.log(`✅ Folder deleted successfully for application: ${applicationId}`);
          } else {
            console.warn(`⚠️ Could not delete folder for application ${applicationId}: ${folderResult.message}`);
          }
        } else {
          console.warn(`⚠️ Could not delete folder: jobData not found or missing folderId for application ${applicationId}`);
        }
      } catch (folderError) {
        console.error(`❌ Error deleting folder for application ${applicationId}:`, folderError);
        // Don't fail the application deletion if folder deletion fails
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

  async updateApplication(applicationId: string, updateData: { status?: string; description?: string }): Promise<ApplicationResponse> {
    try {
      const result = await this.dynamoService.updateApplication(applicationId, updateData as Partial<Application>);
      
      if (result) {
        return {
          success: true,
          message: 'Aplicación actualizada exitosamente',
          application: result,
        };
      } else {
        return {
          success: false,
          message: 'Aplicación no encontrada',
        };
      }
    } catch (error) {
      console.error('Error in updateApplication:', error);
      return {
        success: false,
        message: 'Error interno del servidor al actualizar aplicación',
      };
    }
  }

  async getAllApplications(limit?: number, nextToken?: string): Promise<ApplicationResponse> {
    try {
      const result = await this.dynamoService.getAllApplications(limit, nextToken);

      // Obtener datos únicos para cruces
      const uniqueUserIds = [...new Set(result.applications.map(app => app.userId))];
      const uniqueJobIds = [...new Set(result.applications.map(app => app.jobId))];
      
      console.log('🔄 Enriching applications with user and company data...');
      console.log('👥 Unique users:', uniqueUserIds.length);
      console.log('💼 Unique jobs:', uniqueJobIds.length);

      // Obtener datos de usuarios y trabajos en paralelo
      const [usersMap, jobsMap] = await Promise.all([
        this.userService.getUsersByIds(uniqueUserIds),
        this.getJobsData(uniqueJobIds)
      ]);

      // Obtener datos de empresas desde las carpetas de los trabajos
      const folderIds = Array.from(jobsMap.values())
        .map(job => job.folderId)
        .filter(Boolean);
      
      const companiesMap = await this.companyService.getCompaniesFromFolders(folderIds);

      // Enriquecer aplicaciones con todos los datos
      const enrichedApplications = await Promise.all(
        result.applications.map(async (application) => {
          try {
            // Datos del usuario
            const userData = usersMap.get(application.userId);
            
            // Extraer nombre real de la descripción si está disponible
            const realUserName = this.extractUserNameFromDescription(application.description || '');
            
            // Datos del trabajo
            const jobData = jobsMap.get(application.jobId);
            
            // Datos de la empresa
            const companyData = jobData?.folderId ? companiesMap.get(jobData.folderId) : null;
            
            return {
              ...application,
              // Usuario: nombre real extraído de la descripción o fallback
              userName: realUserName || userData?.name || `Usuario-${application.userId.slice(-8)}`,
              userEmail: userData?.email || 'email@no-especificado.com',
              userRole: userData?.role || 'postulante',
              userRut: userData?.rut,
              userPhone: userData?.phone,
              userAddress: userData?.address,
              
              // Posición: datos del trabajo por jobId
              jobTitle: jobData?.title || 'Trabajo no encontrado',
              jobDescription: jobData?.description || 'No se pudo obtener información del trabajo',
              jobLocation: jobData?.location || 'No especificada',
              jobSalary: jobData?.salary || 'No especificada',
              jobEmploymentType: jobData?.employmentType || 'No especificado',
              jobExperienceLevel: jobData?.experienceLevel || 'No especificado',
              jobRequirements: jobData?.requirements || [],
              jobBenefits: jobData?.benefits || [],
              jobSkills: jobData?.skills || [],
              jobCreatedAt: jobData?.createdAt,
              jobUpdatedAt: jobData?.updatedAt,
              jobStatus: jobData?.status || 'UNKNOWN',
              
              // Empresa: carpeta padre por folderId
              companyName: companyData?.companyName || jobData?.companyName || 'Empresa no especificada',
              companyId: companyData?.companyId || jobData?.companyId,
              companyLocation: companyData?.location || jobData?.location,
              companyDescription: companyData?.description || jobData?.companyDescription,
              parentCompany: companyData?.parentCompany,
              
              // Metadatos adicionales
              folderId: jobData?.folderId,
              companyWebsite: jobData?.companyWebsite,
              companySize: jobData?.companySize,
              companyIndustry: jobData?.companyIndustry
            };
          } catch (error) {
            console.error(`Error enriching application ${application.applicationId}:`, error);
            return {
              ...application,
              userName: `Usuario-${application.userId.slice(-8)}`,
              userEmail: 'email@no-especificado.com',
              userRole: 'postulante',
              jobTitle: 'Error al obtener datos',
              jobDescription: 'Error al obtener información del trabajo',
              companyName: 'Error',
              jobLocation: 'Error',
              jobSalary: 'Error',
              jobEmploymentType: 'Error',
              jobExperienceLevel: 'Error',
              jobRequirements: [],
              jobBenefits: [],
              jobSkills: [],
              jobCreatedAt: null,
              jobUpdatedAt: null,
              jobStatus: 'ERROR'
            };
          }
        })
      );

      console.log(`✅ Enriched ${enrichedApplications.length} applications with user and company data`);

      return {
        success: true,
        applications: enrichedApplications,
        nextToken: result.nextToken,
        message: 'Todas las aplicaciones obtenidas exitosamente'
      };
    } catch (error) {
      console.error('Error in getAllApplications:', error);
      return {
        success: false,
        message: 'Error interno del servidor al obtener todas las aplicaciones',
      };
    }
  }

  async deleteApplications(applicationIds: string[]): Promise<ApplicationResponse> {
    try {
      console.log(`🗑️ Deleting ${applicationIds.length} applications`);
      
      const results = await Promise.allSettled(
        applicationIds.map(applicationId => 
          this.dynamoService.deleteApplication(applicationId) // Admin can delete any application
        )
      );

      console.log('📊 Delete results:', results);
      
      const successful = results.filter(result => result.status === 'fulfilled' && result.value === true).length;
      const failed = results.length - successful;
      
      console.log(`📈 Successful: ${successful}, Failed: ${failed}`);

      if (successful === 0) {
        return {
          success: false,
          message: 'No se pudieron eliminar las aplicaciones',
        };
      }

      return {
        success: true,
        message: `Se eliminaron ${successful} aplicaciones exitosamente${failed > 0 ? `, ${failed} fallaron` : ''}`,
      };
    } catch (error) {
      console.error('Error in deleteApplications:', error);
      return {
        success: false,
        message: 'Error interno del servidor al eliminar aplicaciones',
      };
    }
  }

  /**
   * Get jobs data for multiple job IDs
   */
  private async getJobsData(jobIds: string[]): Promise<Map<string, any>> {
    const jobsMap = new Map<string, any>();
    
    try {
      const promises = jobIds.map(jobId => 
        this.dynamoService.getJobData(jobId).then(jobData => ({ jobId, jobData }))
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(({ jobId, jobData }) => {
        if (jobData) {
          jobsMap.set(jobId, jobData);
        }
      });
    } catch (error) {
      console.error('Error getting jobs data:', error);
    }
    
    return jobsMap;
  }

  /**
   * Extract user name from application description
   * Format: "Aplicación de [nombre] ([email])"
   */
  private extractUserNameFromDescription(description: string): string | null {
    if (!description) return null;
    
    try {
      // Buscar patrón "Aplicación de [nombre] ([email])"
      const match = description.match(/Aplicación de ([^(]+)\s*\(/);
      if (match && match[1]) {
        return match[1].trim();
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting user name from description:', error);
      return null;
    }
  }
}
