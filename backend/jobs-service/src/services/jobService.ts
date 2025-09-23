import { randomUUID } from 'crypto';
import { Job, JobModel } from '../models/Job';
import { DynamoService } from './dynamoService';
import { FoldersServiceClient } from './foldersServiceClient';
import { DocumentTypesServiceClient } from './documentTypesServiceClient';
import { CreateJobInput, UpdateJobInput, JobResponse, JobQuery } from '../types';

export class JobService {
  private dynamoService: DynamoService;
  private foldersClient: FoldersServiceClient;
  private documentTypesClient: DocumentTypesServiceClient;

  constructor() {
    console.log('JobService: Environment STAGE =', process.env.STAGE);
    console.log('JobService: Using real DynamoService for production');
    this.dynamoService = new DynamoService();

    this.foldersClient = new FoldersServiceClient();
    this.documentTypesClient = new DocumentTypesServiceClient();
  }

  async createJob(input: CreateJobInput, userId: string): Promise<JobResponse> {
    try {
      // Generate unique job ID
      const jobId = randomUUID();

      // Create job model
      const jobModel = new JobModel({
        jobId,
        title: input.title,
        description: input.description,
        companyName: input.companyName,
        companyId: input.companyId,
        location: input.location,
        salary: input.salary,
        employmentType: input.employmentType,
        experienceLevel: input.experienceLevel,
        requirements: input.requirements,
        benefits: input.benefits,
        schedule: input.schedule,
        expiresAt: input.expiresAt,
        folderId: input.folderId,
        createdBy: userId,
        status: input.status || 'DRAFT', // Use provided status or default to draft
        requiredDocuments: input.requiredDocuments
      });

      // Validate job data
      if (!jobModel.isValid()) {
        return {
          success: false,
          message: 'Invalid job data. Please check required fields.',
        };
      }

      // Create the job in database first
      const createdJob = await this.dynamoService.createJob(jobModel);

      // Process document types if requiredDocuments are provided
      if (input.requiredDocuments && input.requiredDocuments.length > 0) {
        try {
          console.log('Processing document types for job:', jobId);
          
          // Add timeout for document types processing (10 seconds)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('DocumentTypes service timeout')), 10000)
          );
          
          const documentTypesPromise = this.documentTypesClient.checkExistingDocumentTypes(input.requiredDocuments);
          
          // Race between document types processing and timeout
          const checkResult = await Promise.race([documentTypesPromise, timeoutPromise]);
          
          if (checkResult.new && checkResult.new.length > 0) {
            console.log(`Creating ${checkResult.new.length} new document types:`, checkResult.new);
            // Only create new document types
            const documentTypesResult = await this.documentTypesClient.createFromJobDocuments(
              checkResult.new,
              userId
            );
            
            if (documentTypesResult.success) {
              console.log('New document types created successfully:', documentTypesResult.message);
            } else {
              console.warn('Failed to create new document types:', documentTypesResult.message);
            }
          }
          
          if (checkResult.existing && checkResult.existing.length > 0) {
            console.log(`Found ${checkResult.existing.length} existing document types:`, checkResult.existing);
            // TODO: Increment usage count for existing types
            // This could be implemented as a separate endpoint or batch operation
          }
          
        } catch (error) {
          console.warn('Document types processing failed (non-blocking):', error);
          // Don't fail the job creation if document types processing fails
          // Job will be created successfully without document types integration
        }
      }

      // Job created successfully - folder creation is handled by frontend
      console.log('Job created successfully:', jobId);
      return {
        success: true,
        message: 'Job created successfully',
        job: createdJob,
      };
    } catch (error) {
      console.error('Error in createJob:', error);
      return {
        success: false,
        message: 'Internal server error while creating job',
      };
    }
  }

  async getJob(jobId: string, userId: string): Promise<JobResponse> {
    try {
      const job = await this.dynamoService.getJob(jobId, userId);

      if (!job) {
        return {
          success: false,
          message: 'Job not found',
        };
      }

      return {
        success: true,
        message: 'Job retrieved successfully',
        job,
      };
    } catch (error) {
      console.error('Error in getJob:', error);
      return {
        success: false,
        message: 'Internal server error while retrieving job',
      };
    }
  }

  async updateJob(input: UpdateJobInput, userId: string): Promise<JobResponse> {
    try {
      const { jobId, ...updates } = input;

      // If status is being updated, validate the transition
      if (updates.status) {
        const existingJob = await this.dynamoService.getJob(jobId, userId);
        if (!existingJob) {
          return {
            success: false,
            message: 'Job not found',
          };
        }

        const jobModel = new JobModel(existingJob);
        try {
          jobModel.updateStatus(updates.status);
        } catch (error) {
          return {
            success: false,
            message: (error as Error).message,
          };
        }
      }

      const updatedJob = await this.dynamoService.updateJob(jobId, userId, updates);

      if (!updatedJob) {
        return {
          success: false,
          message: 'Job not found or update failed',
        };
      }

      // Process document types if requiredDocuments are being updated
      if (updates.requiredDocuments && updates.requiredDocuments.length > 0) {
        try {
          console.log('Processing document types for job update:', jobId);
          
          // First, check which document types already exist
          const checkResult = await this.documentTypesClient.checkExistingDocumentTypes(updates.requiredDocuments);
          
          if (checkResult.new.length > 0) {
            console.log(`Creating ${checkResult.new.length} new document types:`, checkResult.new);
            // Only create new document types
            const documentTypesResult = await this.documentTypesClient.createFromJobDocuments(
              checkResult.new,
              userId
            );
            
            if (documentTypesResult.success) {
              console.log('New document types created successfully:', documentTypesResult.message);
            } else {
              console.warn('Failed to create new document types:', documentTypesResult.message);
            }
          }
          
          if (checkResult.existing.length > 0) {
            console.log(`Found ${checkResult.existing.length} existing document types:`, checkResult.existing);
            // TODO: Increment usage count for existing types
          }
          
        } catch (error) {
          console.error('Error processing document types (non-blocking):', error);
          // Don't fail the job update if document types processing fails
        }
      }

      return {
        success: true,
        message: 'Job updated successfully',
        job: updatedJob,
      };
    } catch (error) {
      console.error('Error in updateJob:', error);
      return {
        success: false,
        message: 'Internal server error while updating job',
      };
    }
  }

  async deleteJob(jobId: string, userId: string): Promise<JobResponse> {
    try {
      const job = await this.dynamoService.getJob(jobId, userId);
      if (!job) {
        return {
          success: false,
          message: 'Job not found',
        };
      }

      // Soft delete by setting isActive to false
      const updatedJob = await this.dynamoService.updateJob(jobId, userId, {
        isActive: false,
        status: 'CLOSED'
      });

      return {
        success: true,
        message: 'Job deleted successfully',
        job: updatedJob || undefined,
      };
    } catch (error) {
      console.error('Error in deleteJob:', error);
      return {
        success: false,
        message: 'Internal server error while deleting job',
      };
    }
  }

  async getAllJobs(limit?: number, nextToken?: string): Promise<JobResponse> {
    try {
      const result = await this.dynamoService.queryJobs({
        limit,
        nextToken
      });

      return {
        success: true,
        message: 'Jobs retrieved successfully',
        jobs: result.jobs,
      };
    } catch (error) {
      console.error('Error in getAllJobs:', error);
      return {
        success: false,
        message: 'Internal server error while retrieving jobs',
      };
    }
  }

  async getPublishedJobs(limit?: number, nextToken?: string): Promise<JobResponse> {
    try {
      const result = await this.dynamoService.getPublishedJobs(limit, nextToken);

      return {
        success: true,
        message: 'Published jobs retrieved successfully',
        jobs: result.jobs,
      };
    } catch (error) {
      console.error('Error in getPublishedJobs:', error);
      return {
        success: false,
        message: 'Internal server error while retrieving published jobs',
      };
    }
  }

  async getJobsByFolder(folderId: string, limit?: number): Promise<JobResponse> {
    try {
      const jobs = await this.dynamoService.getJobsByFolder(folderId, limit);

      return {
        success: true,
        message: 'Jobs by folder retrieved successfully',
        jobs,
      };
    } catch (error) {
      console.error('Error in getJobsByFolder:', error);
      return {
        success: false,
        message: 'Internal server error while retrieving jobs by folder',
      };
    }
  }

  async queryJobs(query: JobQuery): Promise<JobResponse> {
    try {
      const result = await this.dynamoService.queryJobs(query);

      return {
        success: true,
        message: 'Jobs query completed successfully',
        jobs: result.jobs,
      };
    } catch (error) {
      console.error('Error in queryJobs:', error);
      return {
        success: false,
        message: 'Internal server error while querying jobs',
      };
    }
  }
}