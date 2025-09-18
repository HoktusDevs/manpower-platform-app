import { v4 as uuidv4 } from 'uuid';
import { Job, JobModel } from '../models/Job';
import { MockDynamoService } from './mockDynamoService';
import { FoldersServiceClient } from './foldersServiceClient';
import { CreateJobInput, UpdateJobInput, JobResponse, JobQuery } from '../types';

export class JobService {
  private dynamoService: MockDynamoService;
  private foldersClient: FoldersServiceClient;

  constructor() {
    console.log('JobService: Environment STAGE =', process.env.STAGE);
    const isLocal = process.env.STAGE === 'local';
    if (isLocal) {
      console.log('JobService: Using MockDynamoService for local development');
      this.dynamoService = new MockDynamoService();
    } else {
      console.log('JobService: Using real DynamoService for production');
      // TODO: Implement real DynamoService when needed
      this.dynamoService = new MockDynamoService();
    }

    this.foldersClient = new FoldersServiceClient();
  }

  async createJob(input: CreateJobInput, userId: string): Promise<JobResponse> {
    try {
      // Generate unique job ID
      const jobId = uuidv4();

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
        folderId: input.folderId,
        createdBy: userId,
        status: 'DRAFT' // Always start as draft
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

      // Generate folder name for this job
      const jobFolderName = jobModel.generateJobFolderName();

      // Create dedicated folder for this job
      const folderResult = await this.foldersClient.createJobFolder(
        jobFolderName,
        input.folderId,
        userId
      );

      if (folderResult.success && folderResult.folder) {
        // Update job with the created folder ID
        const updatedJob = await this.dynamoService.updateJob(jobId, {
          jobFolderId: folderResult.folder.folderId
        });

        return {
          success: true,
          message: 'Job created successfully with dedicated folder',
          job: updatedJob || createdJob,
        };
      } else {
        // Job was created but folder creation failed
        console.warn('Job created but folder creation failed:', folderResult.message);
        return {
          success: true,
          message: 'Job created successfully (folder creation pending)',
          job: createdJob,
        };
      }
    } catch (error) {
      console.error('Error in createJob:', error);
      return {
        success: false,
        message: 'Internal server error while creating job',
      };
    }
  }

  async getJob(jobId: string): Promise<JobResponse> {
    try {
      const job = await this.dynamoService.getJob(jobId);

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

  async updateJob(input: UpdateJobInput): Promise<JobResponse> {
    try {
      const { jobId, ...updates } = input;

      // If status is being updated, validate the transition
      if (updates.status) {
        const existingJob = await this.dynamoService.getJob(jobId);
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

      const updatedJob = await this.dynamoService.updateJob(jobId, updates);

      if (!updatedJob) {
        return {
          success: false,
          message: 'Job not found or update failed',
        };
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

  async deleteJob(jobId: string): Promise<JobResponse> {
    try {
      const job = await this.dynamoService.getJob(jobId);
      if (!job) {
        return {
          success: false,
          message: 'Job not found',
        };
      }

      // Soft delete by setting isActive to false
      const updatedJob = await this.dynamoService.updateJob(jobId, {
        isActive: false,
        status: 'CLOSED'
      });

      return {
        success: true,
        message: 'Job deleted successfully',
        job: updatedJob,
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