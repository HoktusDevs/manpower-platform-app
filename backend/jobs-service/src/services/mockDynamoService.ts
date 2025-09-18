import { Job, JobModel } from '../models/Job';
import { JobQuery } from '../types';

export class MockDynamoService {
  private jobs: Map<string, Job> = new Map();

  async createJob(job: JobModel): Promise<Job> {
    console.log('MockDynamoService: createJob called');
    const jobData = job.toJSON();
    this.jobs.set(jobData.jobId, jobData);
    return jobData;
  }

  async getJob(jobId: string): Promise<Job | null> {
    console.log('MockDynamoService: getJob called');
    return this.jobs.get(jobId) || null;
  }

  async updateJob(jobId: string, updates: Partial<Job>): Promise<Job | null> {
    console.log('MockDynamoService: updateJob called');
    const existing = this.jobs.get(jobId);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.jobs.set(jobId, updated);
    return updated;
  }

  async deleteJob(jobId: string): Promise<void> {
    console.log('MockDynamoService: deleteJob called');
    this.jobs.delete(jobId);
  }

  async getJobsByStatus(status: string, limit?: number): Promise<Job[]> {
    console.log('MockDynamoService: getJobsByStatus called');
    return Array.from(this.jobs.values())
      .filter(job => job.status === status && job.isActive)
      .slice(0, limit || 50);
  }

  async getJobsByFolder(folderId: string, limit?: number): Promise<Job[]> {
    console.log('MockDynamoService: getJobsByFolder called');
    return Array.from(this.jobs.values())
      .filter(job => job.folderId === folderId && job.isActive)
      .slice(0, limit || 50);
  }

  async getPublishedJobs(limit?: number, nextToken?: string): Promise<{ jobs: Job[], nextToken?: string }> {
    console.log('MockDynamoService: getPublishedJobs called');
    const publishedJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'PUBLISHED' && job.isActive);

    return {
      jobs: publishedJobs.slice(0, limit || 50),
      nextToken: undefined
    };
  }

  async queryJobs(query: JobQuery): Promise<{ jobs: Job[], nextToken?: string }> {
    console.log('MockDynamoService: queryJobs called');
    let filteredJobs = Array.from(this.jobs.values())
      .filter(job => job.isActive);

    if (query.status) {
      filteredJobs = filteredJobs.filter(job => job.status === query.status);
    }

    if (query.folderId) {
      filteredJobs = filteredJobs.filter(job => job.folderId === query.folderId);
    }

    if (query.companyName) {
      filteredJobs = filteredJobs.filter(job =>
        job.companyName.toLowerCase().includes(query.companyName!.toLowerCase())
      );
    }

    if (query.location) {
      filteredJobs = filteredJobs.filter(job =>
        job.location.toLowerCase().includes(query.location!.toLowerCase())
      );
    }

    if (query.experienceLevel) {
      filteredJobs = filteredJobs.filter(job => job.experienceLevel === query.experienceLevel);
    }

    if (query.employmentType) {
      filteredJobs = filteredJobs.filter(job => job.employmentType === query.employmentType);
    }

    return {
      jobs: filteredJobs.slice(0, query.limit || 50),
      nextToken: undefined
    };
  }

  async batchDeleteJobs(jobIds: string[]): Promise<string[]> {
    console.log('MockDynamoService: batchDeleteJobs called');
    const deletedJobs: string[] = [];

    for (const jobId of jobIds) {
      if (this.jobs.has(jobId)) {
        this.jobs.delete(jobId);
        deletedJobs.push(jobId);
      }
    }

    return deletedJobs;
  }
}