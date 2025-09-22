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
  // Campos completos del job
  title?: string;
  salary?: string;
  employmentType?: string;
  experienceLevel?: string;
  requirements?: string;
  folderId?: string;
  isActive?: boolean;
}

// Types for folders-service integration
export interface InternalCreateFolderRequest {
  apiKey: string;
  userId: string;
  folderData: CreateFolderInput;
}

export interface CreateFolderInput {
  name?: string; // Opcional cuando se usa applicantUserId
  applicantUserId?: string; // Para que folders-service busque el nombre del usuario
  type: string;
  parentId: string;
  metadata?: { [key: string]: any };
}

export interface FolderServiceResponse {
  success: boolean;
  message: string;
  folder?: {
    folderId: string;
    name: string;
    type: string;
    parentId: string;
    createdAt: string;
  };
}
