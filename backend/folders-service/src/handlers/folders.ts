import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { FolderService } from '../services/folderService';
import { CreateFolderInput, UpdateFolderInput, InternalCreateFolderRequest } from '../types';
import { extractUserFromEvent } from '../../shared/mockAuth';

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

    // Only admins can create folders
    if (userRole !== 'admin') {
      return createResponse(403, {
        success: false,
        message: 'Only administrators can create folders',
      });
    }

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

    // Only admins can update folders
    if (userRole !== 'admin') {
      return createResponse(403, {
        success: false,
        message: 'Only administrators can update folders',
      });
    }

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

    // Only admins can delete folders
    if (userRole !== 'admin') {
      return createResponse(403, {
        success: false,
        message: 'Only administrators can delete folders',
      });
    }

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

    // Only admins can delete folders
    if (userRole !== 'admin') {
      return createResponse(403, {
        success: false,
        message: 'Only administrators can delete folders',
      });
    }

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