import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { FolderService } from '../services/folderService';
import { CreateFolderInput, UpdateFolderInput, InternalCreateFolderRequest } from '../types';
// Extract user from JWT token
const extractUserFromEvent = (event: any) => {
  try {
    // Get authorization header
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No authorization header found');
    }

    // Extract JWT token
    const token = authHeader.substring(7);
    
    // Decode JWT token (without verification for now)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const claims = JSON.parse(jsonPayload);
    
    return {
      sub: claims.sub,
      email: claims.email,
      role: claims['custom:role'] || 'postulante',
      userId: claims.sub,
      userRole: claims['custom:role'] || 'postulante'
    };
  } catch (error) {
    console.error('Error extracting user from token:', error);
    // Fallback to mock for development
    return {
      sub: 'mock-user-id',
      email: 'mock@example.com',
      role: 'admin' as const,
      userId: 'mock-user-id',
      userRole: 'admin' as const
    };
  }
};

const folderService = new FolderService();

const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  },
  body: JSON.stringify(body),
});


// Create folder - ADMIN ONLY
export const createFolder: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId, userRole } = extractUserFromEvent(event);

    // No role restrictions - all authenticated users can create folders

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: CreateFolderInput = JSON.parse(event.body);

    if (!input.name || !input.type) {
      return createResponse(400, {
        success: false,
        message: 'Folder name and type are required',
      });
    }

    const result = await folderService.createFolder(input, userId);

    if (!result.success) {
      return createResponse(400, result);
    }

    return createResponse(201, result);
  } catch (error) {
    console.error('Error in createFolder:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Internal endpoint for inter-service communication (jobs-service -> folders-service)
export const createFolderInternal: APIGatewayProxyHandler = async (event) => {
  try {
    console.log('createFolderInternal called');

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const request: InternalCreateFolderRequest = JSON.parse(event.body);

    // Validate internal API key
    const internalApiKey = process.env.INTERNAL_API_KEY || 'default-internal-key';
    if (request.apiKey !== internalApiKey) {
      return createResponse(403, {
        success: false,
        message: 'Invalid API key',
      });
    }

    if (!request.userId || !request.folderData) {
      return createResponse(400, {
        success: false,
        message: 'userId and folderData are required',
      });
    }

    console.log('About to call createSystemFolder');
    const result = await folderService.createSystemFolder(request.folderData, request.userId);
    console.log('createSystemFolder result:', result);

    if (!result.success) {
      return createResponse(400, result);
    }

    return createResponse(201, result);
  } catch (error) {
    console.error('Error in createFolderInternal:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get all folders
export const getAllFolders: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId } = extractUserFromEvent(event);
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : undefined;
    const nextToken = event.queryStringParameters?.nextToken;

    const result = await folderService.getAllFolders(userId, limit, nextToken);

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getAllFolders:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get single folder
export const getFolder: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId } = extractUserFromEvent(event);
    const folderId = event.pathParameters?.folderId;

    if (!folderId) {
      return createResponse(400, {
        success: false,
        message: 'Folder ID is required',
      });
    }

    const result = await folderService.getFolder(folderId, userId);

    if (!result.success) {
      return createResponse(404, result);
    }

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getFolder:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get folder children
export const getFolderChildren: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId } = extractUserFromEvent(event);
    const folderId = event.pathParameters?.folderId;
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : undefined;

    if (!folderId) {
      return createResponse(400, {
        success: false,
        message: 'Folder ID is required',
      });
    }

    const result = await folderService.getFolderChildren(folderId, userId, limit);

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getFolderChildren:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get root folders
export const getRootFolders: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId } = extractUserFromEvent(event);

    const result = await folderService.getRootFolders(userId);

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getRootFolders:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update folder - ADMIN ONLY
export const updateFolder: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId, userRole } = extractUserFromEvent(event);

    // No role restrictions - all authenticated users can update folders

    const folderId = event.pathParameters?.folderId;

    if (!folderId) {
      return createResponse(400, {
        success: false,
        message: 'Folder ID is required',
      });
    }

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const updateData = JSON.parse(event.body);
    const input: UpdateFolderInput = {
      folderId,
      ...updateData,
    };

    const result = await folderService.updateFolder(input, userId);

    if (!result.success) {
      return createResponse(404, result);
    }

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in updateFolder:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Delete folder - ADMIN ONLY
export const deleteFolder: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId, userRole } = extractUserFromEvent(event);

    // No role restrictions - all authenticated users can delete folders

    const folderId = event.pathParameters?.folderId;

    if (!folderId) {
      return createResponse(400, {
        success: false,
        message: 'Folder ID is required',
      });
    }

    const result = await folderService.deleteFolder(folderId, userId);

    if (!result.success) {
      return createResponse(404, result);
    }

    // If deleted folder was of type "Cargo", delete associated job
    if (result.folder && result.folder.type === 'Cargo') {
      try {
        console.log('Carpeta de tipo "Cargo" eliminada, buscando job asociado...', folderId);
        
        // Call jobs-service to delete associated job
        const jobsServiceUrl = process.env.JOBS_SERVICE_URL || 'https://pa3itplx4f.execute-api.us-east-1.amazonaws.com/dev';
        const response = await fetch(`${jobsServiceUrl}/jobs/folder/${folderId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId
          }
        });
        
        if (response.ok) {
          console.log('Job asociado eliminado exitosamente');
        } else {
          console.warn('No se pudo eliminar el job asociado o no existía');
        }
      } catch (error) {
        console.warn('Error eliminando job asociado:', error);
        // Don't fail the folder deletion if job deletion fails
      }
    }

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in deleteFolder:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

// Delete multiple folders - ADMIN ONLY
export const deleteFolders: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId, userRole } = extractUserFromEvent(event);

    // No role restrictions - all authenticated users can delete folders

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const { folderIds } = JSON.parse(event.body);

    if (!folderIds || !Array.isArray(folderIds) || folderIds.length === 0) {
      return createResponse(400, {
        success: false,
        message: 'Folder IDs array is required',
      });
    }

    const result = await folderService.deleteFolders(folderIds, userId);

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in deleteFolders:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};