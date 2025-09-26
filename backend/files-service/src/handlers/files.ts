import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { FileService } from '../services/fileService';
import { UploadFileInput, UpdateFileInput, BulkUploadInput } from '../types';
import { extractUserFromEvent } from '../../shared/mockAuth';

const fileService = new FileService();

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


export const getAllFiles: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = 'test-user-123';
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : undefined;
    const nextToken = event.queryStringParameters?.nextToken;

    const result = await fileService.getAllFiles(userId, limit, nextToken);

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getAllFiles:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getFile: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = 'test-user-123';
    const fileId = event.pathParameters?.fileId;

    if (!fileId) {
      return createResponse(400, {
        success: false,
        message: 'File ID is required',
      });
    }

    const result = await fileService.getFile(fileId, userId);

    if (!result.success) {
      return createResponse(404, result);
    }

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getFile:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getFilesByFolder: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = 'test-user-123';
    const folderId = event.pathParameters?.folderId;
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : undefined;

    if (!folderId) {
      return createResponse(400, {
        success: false,
        message: 'Folder ID is required',
      });
    }

    const result = await fileService.getFilesByFolder(folderId, userId, limit);

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getFilesByFolder:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getUploadUrl: APIGatewayProxyHandler = async (event) => {
  try {
    console.log('getUploadUrl called with event:', JSON.stringify(event, null, 2));

    // Use hardcoded userId for quick testing - no JWT authentication
    const userId = 'test-user-123';
    console.log('Using test userId:', userId);

    if (!event.body) {
      console.log('No request body provided');
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: UploadFileInput = JSON.parse(event.body);
    console.log('Parsed input:', input);

    if (!input.folderId || !input.originalName || !input.fileType || !input.fileSize) {
      console.log('Missing required fields');
      return createResponse(400, {
        success: false,
        message: 'Missing required fields: folderId, originalName, fileType, fileSize',
      });
    }

    console.log('Calling fileService.getUploadUrl...');
    const result = await fileService.getUploadUrl(input, userId);
    console.log('FileService result:', result);

    if (!result.success) {
      return createResponse(400, result);
    }

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getUploadUrl:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const confirmUpload: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = 'test-user-123';

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const { fileId } = JSON.parse(event.body);

    if (!fileId) {
      return createResponse(400, {
        success: false,
        message: 'File ID is required',
      });
    }

    const result = await fileService.confirmUpload(fileId, userId);

    if (!result.success) {
      return createResponse(404, result);
    }

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in confirmUpload:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getBulkUploadUrls: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = 'test-user-123';

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const input: BulkUploadInput = JSON.parse(event.body);

    if (!input.folderId || !input.files || input.files.length === 0) {
      return createResponse(400, {
        success: false,
        message: 'Missing required fields: folderId, files array',
      });
    }

    const result = await fileService.getBulkUploadUrls(input, userId);

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getBulkUploadUrls:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

export const updateFile: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = 'test-user-123';
    const fileId = event.pathParameters?.fileId;

    if (!fileId) {
      return createResponse(400, {
        success: false,
        message: 'File ID is required',
      });
    }

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const updateData = JSON.parse(event.body);
    const input: UpdateFileInput = {
      fileId,
      ...updateData,
    };

    const result = await fileService.updateFile(input, userId);

    if (!result.success) {
      return createResponse(404, result);
    }

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in updateFile:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

export const deleteFile: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = 'test-user-123';
    const fileId = event.pathParameters?.fileId;

    if (!fileId) {
      return createResponse(400, {
        success: false,
        message: 'File ID is required',
      });
    }

    const result = await fileService.deleteFile(fileId, userId);

    if (!result.success) {
      return createResponse(404, result);
    }

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in deleteFile:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

export const deleteFiles: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = 'test-user-123';

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    const { fileIds } = JSON.parse(event.body);

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return createResponse(400, {
        success: false,
        message: 'File IDs array is required',
      });
    }

    const result = await fileService.deleteFiles(fileIds, userId);

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in deleteFiles:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getDownloadUrl: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = 'test-user-123';
    const fileId = event.pathParameters?.fileId;

    if (!fileId) {
      return createResponse(400, {
        success: false,
        message: 'File ID is required',
      });
    }

    const result = await fileService.getDownloadUrl(fileId, userId);

    if (!result.success) {
      return createResponse(404, result);
    }

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getDownloadUrl:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getPublicFile: APIGatewayProxyHandler = async (event) => {
  try {
    const fileId = event.pathParameters?.fileId;

    if (!fileId) {
      return createResponse(400, {
        success: false,
        message: 'File ID is required',
      });
    }

    const result = await fileService.getPublicFile(fileId);

    if (!result.success) {
      return createResponse(404, result);
    }

    return createResponse(200, result);
  } catch (error) {
    console.error('Error in getPublicFile:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};