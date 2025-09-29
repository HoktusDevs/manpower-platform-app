import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { parseMultipartFormData } from '../utils/multipartParser';
import { notifyWebSocket } from '../services/websocketNotifier';
import { saveToFilesService } from '../services/filesServiceIntegration';

// Initialize AWS clients
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const S3_BUCKET = process.env.S3_BUCKET || 'manpower-documents-dev';
const FOLDERS_TABLE = process.env.FOLDERS_TABLE || 'manpower-folders-dev';

// File upload statuses
type FileStatus = 'APPROVED' | 'REJECTED' | 'PENDING';

interface UploadRequest {
  folderName: string;
  status: FileStatus;
  explanation?: string;
  file: {
    name: string;
    type: string;
    data: Buffer;
  };
}

const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

/**
 * Find folder by name using folders API (more reliable)
 */
const findFolderByName = async (folderName: string): Promise<any | null> => {
  try {
    console.log(`🔍 Searching for folder with name: "${folderName}"`);

    // Use folders API instead of direct DynamoDB access
    const foldersApiUrl = process.env.FOLDERS_API_URL || 'https://83upriwf35.execute-api.us-east-1.amazonaws.com/dev';
    const systemToken = process.env.SYSTEM_AUTH_TOKEN;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (systemToken) {
      headers['Authorization'] = `Bearer ${systemToken}`;
    }

    const response = await fetch(`${foldersApiUrl}/folders`, { headers });

    if (!response.ok) {
      console.error(`❌ Folders API returned ${response.status}`);
      return null;
    }

    const data = await response.json() as any;
    const folders = data.folders || [];

    console.log(`📂 Total folders found: ${folders.length}`);
    console.log(`📂 Looking for exact match: "${folderName}"`);
    console.log(`📂 Available folder names: ${folders.map((f: any) => `"${f.name}"`).join(', ')}`);

    const folder = folders.find((f: any) => f.name === folderName && f.isActive !== false);

    if (folder) {
      console.log(`✅ Found folder: ${folder.name} (${folder.folderId})`);
      return folder;
    }

    console.log(`❌ Folder "${folderName}" not found in ${folders.length} folders`);
    console.log(`Available folders: ${folders.map((f: any) => f.name).join(', ')}`);
    return null;
  } catch (error) {
    console.error('❌ Error finding folder by name:', error);
    return null;
  }
};

/**
 * Upload file to S3
 */
const uploadToS3 = async (fileName: string, fileData: Buffer, contentType: string): Promise<string> => {
  const key = `uploads/${Date.now()}_${fileName}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: fileData,
    ContentType: contentType,
    Metadata: {
      uploadedAt: new Date().toISOString(),
      service: 'file-upload-service'
    }
  });

  await s3Client.send(command);
  console.log(`✅ File uploaded to S3: ${key}`);

  return `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
};

/**
 * Main file upload handler
 */
export const uploadFileHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('📤 File upload request received');

  try {
    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'OK' });
    }

    // Parse multipart form data
    const uploadData = await parseMultipartFormData(event);
    if (!uploadData) {
      return createResponse(400, {
        success: false,
        message: 'Invalid multipart form data'
      });
    }

    const { folderName, status, explanation, file } = uploadData;

    // Validate required fields
    if (!folderName || !status || !file) {
      return createResponse(400, {
        success: false,
        message: 'Missing required fields: folderName, status, file'
      });
    }

    // Validate status
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return createResponse(400, {
        success: false,
        message: 'Invalid status. Must be APPROVED, REJECTED, or PENDING'
      });
    }

    // Validate explanation for REJECTED status
    if (status === 'REJECTED' && !explanation) {
      return createResponse(400, {
        success: false,
        message: 'Explanation is required when status is REJECTED'
      });
    }

    // Find folder by name
    const folder = await findFolderByName(folderName);
    if (!folder) {
      return createResponse(404, {
        success: false,
        message: `Folder "${folderName}" not found`
      });
    }

    // Upload file to S3
    const fileUrl = await uploadToS3(file.name, file.data, file.type);

    // Create file document data (matching exact format from files service)
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const now = new Date().toISOString();
    const s3Key = `uploads/${Date.now()}_${file.name}`;

    const fileDocument = {
      // Core identifiers
      documentId,
      folderId: folder.folderId,
      userId: 'test-user-123',

      // File info
      fileName: file.name,
      originalName: file.name,
      fileType: file.type,
      fileExtension: '.' + file.name.split('.').pop(),
      fileSize: file.data.length,
      documentType: 'file',

      // Storage info
      s3Bucket: S3_BUCKET,
      s3Key,
      fileUrl,

      // Status and processing
      status: 'completed',
      hoktusDecision: status,
      hoktusProcessingStatus: 'COMPLETED',

      // Processing results (matching existing format)
      processingResult: {
        contentAnalysis: {
          document_legibility: 'good',
          text_quality: 'high',
          has_text: true,
          confidence_score: 1.0
        },
        validationResults: {
          content_quality_valid: true,
          file_format_valid: true,
          file_size_valid: true,
          user_authorized: true
        },
        observations: explanation ? [{
          type: status === 'REJECTED' ? 'error' : 'success',
          message: explanation || `File uploaded with status: ${status}`,
          severity: status === 'REJECTED' ? 'warning' : 'info'
        }] : [{
          type: 'success',
          message: 'Archivo procesado exitosamente via API',
          severity: 'info'
        }],
        processedAt: now,
        fileType: file.type.includes('pdf') ? 'PDF' : 'IMAGE',
        processingTime: 0.1,
        status: 'completed'
      },

      // Metadata
      isActive: true,
      isPublic: false,
      tags: [],
      uploadedAt: now,
      createdAt: now,
      updatedAt: now
    };

    // Save to files service database
    await saveToFilesService(fileDocument);

    // Notify via WebSocket for real-time updates
    await notifyWebSocket('file_created', {
      fileId: documentId,
      folderId: folder.folderId,
      file: fileDocument
    });

    console.log(`✅ File uploaded successfully: ${file.name} → ${folderName} (${status})`);

    return createResponse(201, {
      success: true,
      message: 'File uploaded successfully',
      file: fileDocument
    });

  } catch (error) {
    console.error('❌ Error uploading file:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update document status handler
 */
export const updateDocumentStatusHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('📝 Document status update request received');

  try {
    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'OK' });
    }

    // Parse JSON body
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required'
      });
    }

    const updateData = JSON.parse(event.body);
    const { documentId, status, explanation } = updateData;

    // Validate required fields
    if (!documentId || !status) {
      return createResponse(400, {
        success: false,
        message: 'Missing required fields: documentId, status'
      });
    }

    // Validate status
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return createResponse(400, {
        success: false,
        message: 'Invalid status. Must be APPROVED, REJECTED, or PENDING'
      });
    }

    // Validate explanation for REJECTED status
    if (status === 'REJECTED' && !explanation) {
      return createResponse(400, {
        success: false,
        message: 'Explanation is required when status is REJECTED'
      });
    }

    // Get the document from DynamoDB
    const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');

    const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
    const FILES_TABLE = process.env.FILES_TABLE || 'manpower-documents-dev';

    // Check if document exists
    const getCommand = new GetCommand({
      TableName: FILES_TABLE,
      Key: {
        documentId: documentId,
        userId: 'test-user-123'
      }
    });

    const getResult = await docClient.send(getCommand);

    if (!getResult.Item) {
      return createResponse(404, {
        success: false,
        message: `Document with ID "${documentId}" not found`
      });
    }

    // Update the document
    const now = new Date().toISOString();
    const updateCommand = new UpdateCommand({
      TableName: FILES_TABLE,
      Key: {
        documentId: documentId,
        userId: 'test-user-123'
      },
      UpdateExpression: 'SET hoktusDecision = :status, hoktusProcessingStatus = :processingStatus, updatedAt = :updatedAt' +
                        (explanation ? ', processingResult.observations = :observations' : ''),
      ExpressionAttributeValues: {
        ':status': status,
        ':processingStatus': 'COMPLETED',
        ':updatedAt': now,
        ...(explanation && {
          ':observations': [{
            type: status === 'REJECTED' ? 'error' : 'success',
            message: explanation,
            severity: status === 'REJECTED' ? 'warning' : 'info'
          }]
        })
      },
      ReturnValues: 'ALL_NEW'
    });

    const updateResult = await docClient.send(updateCommand);

    // Send WebSocket notification
    await notifyWebSocket('file_updated', {
      fileId: documentId,
      folderId: getResult.Item.folderId,
      file: updateResult.Attributes
    });

    console.log(`✅ Document status updated: ${documentId} → ${status}`);

    return createResponse(200, {
      success: true,
      message: 'Document status updated successfully',
      document: updateResult.Attributes
    });

  } catch (error) {
    console.error('❌ Error updating document status:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Health check handler
 */
export const healthCheckHandler: APIGatewayProxyHandler = async (): Promise<APIGatewayProxyResult> => {
  return createResponse(200, {
    success: true,
    message: 'File upload service is healthy',
    timestamp: new Date().toISOString(),
    service: 'file-upload-service',
    version: '1.0.0'
  });
};