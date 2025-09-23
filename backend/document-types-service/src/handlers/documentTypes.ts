import { APIGatewayProxyHandler } from 'aws-lambda';
import { DocumentTypeService } from '../services/documentTypeService';
import { 
  CreateDocumentTypeInput, 
  UpdateDocumentTypeInput, 
  SearchDocumentTypesInput,
  CreateFromJobDocumentsInput 
} from '../types';

const documentTypeService = new DocumentTypeService();

// Helper function to create response
const createResponse = (statusCode: number, body: any) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent, X-User-Id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  },
  body: JSON.stringify(body),
});

// Helper function to extract user from event (mock for now)
const extractUserFromEvent = (event: any) => {
  // In a real implementation, this would extract user info from JWT token
  return {
    userId: 'admin-user-id',
    userRole: 'admin'
  };
};

// Get all document types
export const getAllDocumentTypes: APIGatewayProxyHandler = async (event) => {
  try {
    const result = await documentTypeService.getAllDocumentTypes();
    return createResponse(result.success ? 200 : 400, result);
  } catch (error) {
    console.error('Error in getAllDocumentTypes:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get document type by ID
export const getDocumentType: APIGatewayProxyHandler = async (event) => {
  try {
    const typeId = event.pathParameters?.typeId;

    if (!typeId) {
      return createResponse(400, {
        success: false,
        message: 'Type ID is required',
      });
    }

    const result = await documentTypeService.getDocumentType(typeId);
    return createResponse(result.success ? 200 : 404, result);
  } catch (error) {
    console.error('Error in getDocumentType:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Create document type
export const createDocumentType: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId } = extractUserFromEvent(event);

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: CreateDocumentTypeInput = {
      ...JSON.parse(event.body),
      createdBy: userId
    };

    // Validate required fields
    if (!input.name) {
      return createResponse(400, {
        success: false,
        message: 'Name is required',
      });
    }

    const result = await documentTypeService.createDocumentType(input);
    return createResponse(result.success ? 201 : 400, result);
  } catch (error) {
    console.error('Error in createDocumentType:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update document type
export const updateDocumentType: APIGatewayProxyHandler = async (event) => {
  try {
    const typeId = event.pathParameters?.typeId;

    if (!typeId) {
      return createResponse(400, {
        success: false,
        message: 'Type ID is required',
      });
    }

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const updateData = JSON.parse(event.body);
    const input: UpdateDocumentTypeInput = {
      typeId,
      ...updateData,
    };

    const result = await documentTypeService.updateDocumentType(input);
    return createResponse(result.success ? 200 : 404, result);
  } catch (error) {
    console.error('Error in updateDocumentType:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Delete document type
export const deleteDocumentType: APIGatewayProxyHandler = async (event) => {
  try {
    const typeId = event.pathParameters?.typeId;

    if (!typeId) {
      return createResponse(400, {
        success: false,
        message: 'Type ID is required',
      });
    }

    const result = await documentTypeService.deleteDocumentType(typeId);
    return createResponse(result.success ? 200 : 404, result);
  } catch (error) {
    console.error('Error in deleteDocumentType:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Search document types
export const searchDocumentTypes: APIGatewayProxyHandler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    
    const searchInput: SearchDocumentTypesInput = {
      query: queryParams.query,
      category: queryParams.category,
      limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
      sortBy: queryParams.sortBy as any,
      sortOrder: queryParams.sortOrder as any
    };

    const result = await documentTypeService.searchDocumentTypes(searchInput);
    return createResponse(result.success ? 200 : 400, result);
  } catch (error) {
    console.error('Error in searchDocumentTypes:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Create document types from job documents
export const createFromJobDocuments: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId } = extractUserFromEvent(event);

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: CreateFromJobDocumentsInput = {
      ...JSON.parse(event.body),
      createdBy: userId
    };

    // Validate required fields
    if (!input.documents || !Array.isArray(input.documents) || input.documents.length === 0) {
      return createResponse(400, {
        success: false,
        message: 'Documents array is required and must not be empty',
      });
    }

    const result = await documentTypeService.createFromJobDocuments(input);
    return createResponse(result.success ? 201 : 400, result);
  } catch (error) {
    console.error('Error in createFromJobDocuments:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Check which document types already exist
export const checkExistingDocumentTypes: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const { documentNames } = JSON.parse(event.body);

    if (!documentNames || !Array.isArray(documentNames)) {
      return createResponse(400, {
        success: false,
        message: 'Document names array is required',
      });
    }

    const result = await documentTypeService.checkExistingDocumentTypes(documentNames);
    return createResponse(200, {
      success: true,
      message: 'Document types check completed',
      ...result
    });
  } catch (error) {
    console.error('Error in checkExistingDocumentTypes:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Handle OPTIONS requests for CORS preflight
export const handleOptions: APIGatewayProxyHandler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent, X-User-Id',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    },
    body: ''
  };
};
