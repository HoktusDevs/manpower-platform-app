/**
 * Applications GraphQL Types
 * Types specific to application management
 */

export interface Application {
  userId: string;
  applicationId: string;
  jobId: string;  // Reference to JobPosting
  companyName: string;
  position: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW' | 'INTERVIEW_SCHEDULED' | 'HIRED';
  description?: string;
  salary?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  companyId?: string;
}

export interface CreateApplicationInput {
  jobId: string;  // Reference to JobPosting
  companyName: string;
  position: string;
  description?: string;
  salary?: string;
  location?: string;
  companyId?: string;
}

export interface ApplicationStats {
  totalApplications: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  inReviewCount: number;
  interviewScheduledCount: number;
  hiredCount: number;
}