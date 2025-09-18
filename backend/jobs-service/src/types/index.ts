import { Job } from '../models/Job';

export interface CreateJobInput {
  title: string;
  description: string;
  companyName: string;
  companyId?: string;
  location: string;
  salary?: string;
  employmentType: string;
  experienceLevel: string;
  requirements?: string;
  folderId: string;        // Carpeta destino donde se auto-creará la carpeta del job
}

export interface UpdateJobInput {
  jobId: string;
  title?: string;
  description?: string;
  companyName?: string;
  companyId?: string;
  location?: string;
  salary?: string;
  employmentType?: string;
  experienceLevel?: string;
  requirements?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';
}

export interface JobResponse {
  success: boolean;
  message: string;
  job?: Job;
  jobs?: Job[];
}

export interface JobQuery {
  jobId?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';
  folderId?: string;
  companyName?: string;
  location?: string;
  experienceLevel?: string;
  employmentType?: string;
  limit?: number;
  nextToken?: string;
}

export interface JobWithHierarchy {
  job: Job;
  folderPath: string[];
  companyHierarchy: string[];
}

// Folder service integration types
export interface FolderServiceCreateRequest {
  name: string;
  type: string;
  parentId: string;
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

// API Gateway event types
export interface APIGatewayProxyEventWithAuth {
  headers: { [name: string]: string | undefined };
  pathParameters: { [name: string]: string | undefined } | null;
  queryStringParameters: { [name: string]: string | undefined } | null;
  body: string | null;
  requestContext: {
    authorizer?: {
      claims: {
        sub: string;
        email: string;
        'custom:role': 'admin' | 'postulante';
        [key: string]: any;
      };
    };
  };
}