/**
 * Job Postings GraphQL Types
 * Types specific to job posting management
 */

export interface JobPosting {
  jobId: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'FREELANCE' | 'INTERNSHIP' | 'TEMPORARY';
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'EXPIRED' | 'CLOSED';
  companyName: string;
  companyId?: string;
  salary?: string;
  benefits?: string;
  experienceLevel: 'ENTRY_LEVEL' | 'MID_LEVEL' | 'SENIOR_LEVEL' | 'EXECUTIVE' | 'INTERNSHIP';
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  applicationCount: number;
  folderId?: string;
}

export interface CreateJobPostingInput {
  title: string;
  description: string;
  requirements: string;
  location: string;
  employmentType: JobPosting['employmentType'];
  companyName: string;
  companyId?: string;
  salary?: string;
  benefits?: string;
  experienceLevel: JobPosting['experienceLevel'];
  expiresAt?: string;
  folderId?: string;
}

export interface UpdateJobPostingInput {
  jobId: string;
  title?: string;
  description?: string;
  requirements?: string;
  location?: string;
  employmentType?: JobPosting['employmentType'];
  companyName?: string;
  companyId?: string;
  salary?: string;
  benefits?: string;
  experienceLevel?: JobPosting['experienceLevel'];
  status?: JobPosting['status'];
  expiresAt?: string;
  folderId?: string;
}

export interface JobPostingStats {
  totalJobPostings: number;
  publishedCount: number;
  draftCount: number;
  pausedCount: number;
  expiredCount: number;
  closedCount: number;
  averageApplicationsPerJob?: number;
  totalApplications: number;
  topEmploymentTypes: Array<{
    employmentType: JobPosting['employmentType'];
    count: number;
    applicationCount: number;
  }>;
  topExperienceLevels: Array<{
    experienceLevel: JobPosting['experienceLevel'];
    count: number;
    applicationCount: number;
  }>;
}