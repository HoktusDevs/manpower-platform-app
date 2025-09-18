export interface JobPosting {
  jobId: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  employmentType: string;
  companyName: string;
  salary?: string | undefined;
  benefits?: string | undefined;
  experienceLevel: string;
}

export interface Application {
  userId: string;
  applicationId: string;
  jobId: string;
  companyName: string;
  position: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW' | 'INTERVIEW_SCHEDULED' | 'HIRED';
  description?: string | undefined;
  salary?: string | undefined;
  location?: string | undefined;
  createdAt: string;
  updatedAt: string;
  companyId?: string | undefined;
}

export interface User {
  sub: string;
  email: string;
  fullName?: string | undefined;
  role?: string | undefined;
  given_name?: string | undefined;
  family_name?: string | undefined;
}