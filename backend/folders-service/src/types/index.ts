import { Folder } from '../models/Folder';

export interface CreateFolderInput {
  name: string;
  type: string;
  parentId?: string;
  metadata?: { [key: string]: any };
}

export interface UpdateFolderInput {
  folderId: string;
  name?: string;
  type?: string;
  metadata?: { [key: string]: any };
}

export interface FolderResponse {
  success: boolean;
  message: string;
  folder?: Folder & { path?: string; childrenCount?: number };
  folders?: (Folder & { path?: string; childrenCount?: number })[];
  nextToken?: string;
}

export interface FolderQuery {
  folderId?: string;
  userId: string;
  parentId?: string | null;
  name?: string;
  type?: string;
  limit?: number;
  nextToken?: string;
}

export interface FolderHierarchy {
  folder: Folder;
  children: FolderHierarchy[];
  path: string[];
  level: number;
}

export interface BreadcrumbItem {
  folderId: string;
  name: string;
  type: string;
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

// Internal API types for inter-service communication
export interface InternalCreateFolderRequest {
  apiKey: string;
  userId: string;
  folderData: CreateFolderInput;
}