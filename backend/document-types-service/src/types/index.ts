import { DocumentType } from '../models/DocumentType';

export interface CreateDocumentTypeInput {
  name: string;
  description?: string;
  category?: string;
  createdBy: string;
}

export interface UpdateDocumentTypeInput {
  typeId: string;
  name?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}

export interface DocumentTypeResponse {
  success: boolean;
  message: string;
  documentType?: DocumentType;
  documentTypes?: DocumentType[];
}

export interface SearchDocumentTypesInput {
  query?: string;
  category?: string;
  limit?: number;
  sortBy?: 'name' | 'usageCount' | 'lastUsedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateFromJobDocumentsInput {
  documents: string[];
  createdBy: string;
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
