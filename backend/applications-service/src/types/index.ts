export interface ApplicationResponse {
  success: boolean;
  message: string;
  application?: Application;
  applications?: Application[];
  nextToken?: string;
}

export interface CreateApplicationInput {
  jobIds: string[];
  description?: string;
  documents?: string[];
}

export interface ApplicationQuery {
  userId?: string;
  jobId?: string;
  status?: string;
  limit?: number;
  nextToken?: string;
}

export interface Application {
  applicationId: string;
  userId: string;
  jobId: string;
  status: 'PENDING' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED';
  description?: string;
  createdAt: string;
  updatedAt: string;
  documents?: string[];
  // Campos enriquecidos del job
  jobTitle?: string;
  companyName?: string;
  location?: string;
}
