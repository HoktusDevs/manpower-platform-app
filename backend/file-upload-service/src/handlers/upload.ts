import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { parseMultipartFormData } from '../utils/multipartParser';
import { notifyWebSocket } from '../services/websocketNotifier';
import { saveToFilesService } from '../services/filesServiceIntegration';
import { S3Service } from '../services/s3Service';
import busboy from 'busboy';

// Initialize AWS clients
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Service = new S3Service();

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

interface NewUploadRequest {
  folderId: string;
  fileName: string;
  fileType: string;
  file: {
    name: string;
    type: string;
    data: Buffer;
  };
}

interface NewParsedFormData {
  folderId?: string;
  fileName?: string;
  fileType?: string;
  file?: {
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
 * Parse multipart form data using busboy for new format (folderId)
 */
const parseMultipartWithBusboy = (event: APIGatewayProxyEvent): Promise<NewParsedFormData | null> => {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType?.includes('multipart/form-data')) {
      reject(new Error('Not multipart/form-data'));
      return;
    }

    console.log('🔍 Debug info:', {
      isBase64Encoded: event.isBase64Encoded,
      contentType,
      bodyLength: event.body?.length || 0
    });

    // Try both encodings to see which works
    let body: Buffer;
    try {
      if (event.isBase64Encoded) {
        body = Buffer.from(event.body || '', 'base64');
        console.log('📦 Using base64 decoding');
      } else {
        body = Buffer.from(event.body || '', 'binary');
        console.log('📦 Using binary decoding');
      }
    } catch (error) {
      console.error('❌ Encoding error:', error);
      reject(error);
      return;
    }

    const bb = busboy({ headers: { 'content-type': contentType } });
    const result: any = {};
    const files: any[] = [];

    bb.on('field', (name: string, value: string) => {
      console.log(`📝 Field received: ${name} = ${value}`);
      result[name] = value;
    });

    bb.on('file', (name: string, file: any, info: any) => {
      console.log(`📁 File received: ${name} = ${info.filename} (${info.mimeType})`);
      const chunks: Buffer[] = [];

      file.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      file.on('end', () => {
        files.push({
          name: info.filename,
          type: info.mimeType,
          data: Buffer.concat(chunks)
        });
        console.log(`✅ File processed: ${info.filename} (${Buffer.concat(chunks).length} bytes)`);
      });
    });

    bb.on('close', () => {
      if (files.length > 0) {
        result.file = files[0];
      }
      console.log('🎯 Final parsed result:', {
        folderId: result.folderId,
        fileName: result.fileName,
        fileType: result.fileType,
        fileCount: files.length
      });
      resolve(result);
    });

    bb.on('error', (error: Error) => {
      console.error('❌ Busboy error:', error);
      reject(error);
    });

    bb.write(body);
    bb.end();
  });
};

/**
 * Find folder by ID using folders API
 */
const findFolderById = async (folderId: string): Promise<any | null> => {
  try {
    console.log(`🔍 Searching for folder with ID: "${folderId}"`);

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
    console.log(`📂 Looking for ID: "${folderId}"`);

    const folder = folders.find((f: any) => f.folderId === folderId && f.isActive !== false);

    if (folder) {
      console.log(`✅ Found folder: ${folder.name} (${folder.folderId})`);
      return folder;
    }

    console.log(`❌ Folder with ID "${folderId}" not found in ${folders.length} folders`);
    return null;
  } catch (error) {
    console.error('❌ Error finding folder by ID:', error);
    return null;
  }
};

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
const uploadToS3 = async (fileName: string, fileData: Buffer, contentType: string): Promise<{ fileUrl: string; s3Key: string }> => {
  const key = `uploads/${Date.now()}_${fileName}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: fileData,
    ContentType: contentType,
    ContentDisposition: 'inline', // Para visualizar en navegador en lugar de descargar
    CacheControl: 'max-age=31536000', // Cache por 1 año
    Metadata: {
      uploadedAt: new Date().toISOString(),
      service: 'file-upload-service'
    }
  });

  await s3Client.send(command);
  console.log(`✅ File uploaded to S3: ${key}`);

  // Use direct public URL instead of presigned URL
  const publicUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;

  return { fileUrl: publicUrl, s3Key: key };
};

/**
 * Get presigned URL for direct upload to S3
 */
export const getUploadUrlHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('📤 Get upload URL request received');

  try {
    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'OK' });
    }

    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required'
      });
    }

    const { folderName, fileName, fileType, fileSize, status, explanation } = JSON.parse(event.body);

    // Validate required fields
    if (!folderName || !fileName || !fileType || !fileSize || !status) {
      return createResponse(400, {
        success: false,
        message: 'Missing required fields: folderName, fileName, fileType, fileSize, status'
      });
    }

    // Validate status
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return createResponse(400, {
        success: false,
        message: 'Invalid status. Must be APPROVED, REJECTED, or PENDING'
      });
    }

    // Validate file type and size
    if (!s3Service.isValidFileType(fileType)) {
      return createResponse(400, {
        success: false,
        message: 'Invalid file type'
      });
    }

    if (!s3Service.isValidFileSize(fileSize)) {
      return createResponse(400, {
        success: false,
        message: 'File size exceeds maximum allowed size'
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

    // Generate document ID
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Generate presigned URL using S3Service
    const presignedResult = await s3Service.generatePresignedUploadUrl({
      fileName,
      fileType,
      fileSize,
      documentId
    });

    // Create pending file document
    const now = new Date().toISOString();
    const fileDocument = {
      documentId,
      folderId: folder.folderId,
      userId: 'test-user-123',
      fileName,
      originalName: fileName,
      fileType,
      fileExtension: '.' + fileName.split('.').pop(),
      fileSize,
      documentType: 'file',
      s3Bucket: S3_BUCKET,
      s3Key: presignedResult.s3Key,
      fileUrl: `https://${S3_BUCKET}.s3.amazonaws.com/${presignedResult.s3Key}`,
      status: 'pending',
      hoktusDecision: status,
      hoktusProcessingStatus: 'PENDING',
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
          message: explanation,
          severity: status === 'REJECTED' ? 'warning' : 'info'
        }] : [{
          type: 'success',
          message: 'Archivo procesado exitosamente via API',
          severity: 'info'
        }],
        processedAt: now,
        fileType: fileType.includes('pdf') ? 'PDF' : 'IMAGE',
        processingTime: 0.1,
        status: 'pending'
      },
      isActive: true,
      isPublic: false,
      tags: [],
      uploadedAt: now,
      createdAt: now,
      updatedAt: now
    };

    // Save initial document to DynamoDB
    await saveToFilesService(fileDocument);

    return createResponse(200, {
      success: true,
      uploadUrl: presignedResult.uploadUrl,
      downloadUrl: presignedResult.downloadUrl,
      fileId: documentId,
      s3Key: presignedResult.s3Key,
      expiresIn: presignedResult.expiresIn,
      file: fileDocument
    });

  } catch (error) {
    console.error('❌ Error getting upload URL:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Confirm upload completion
 */
export const confirmUploadHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('✅ Confirm upload request received');

  try {
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required'
      });
    }

    const { fileId } = JSON.parse(event.body);

    if (!fileId) {
      return createResponse(400, {
        success: false,
        message: 'File ID is required'
      });
    }

    // This would typically check the file exists in S3 and update status
    // For now, just mark as completed and save to files service
    const now = new Date().toISOString();

    // Get file document (in a real implementation, this would come from your DB)
    // For now, create a completed document
    const fileDocument = {
      documentId: fileId,
      status: 'completed',
      hoktusProcessingStatus: 'COMPLETED',
      updatedAt: now,
      processingResult: {
        status: 'completed',
        processedAt: now
      }
    };

    await saveToFilesService(fileDocument);

    // Notify WebSocket - need to get folderId from somewhere
    // For now, use the test folder
    await notifyWebSocket('file_created', {
      fileId,
      folderId: 'a1037315-5264-4dea-841d-e17935815632', // Clemente Arriagada folder
      file: fileDocument
    });

    return createResponse(200, {
      success: true,
      message: 'Upload confirmed successfully',
      file: fileDocument
    });

  } catch (error) {
    console.error('❌ Error confirming upload:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Complete file upload handler - handles everything in one step:
 * 1. Receives file via multipart form data
 * 2. Generates presigned URL automatically
 * 3. Uploads file to S3 using presigned URL
 * 4. Saves metadata to DynamoDB
 * 5. Triggers WebSocket notification
 */
export const legacyUploadHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('📤 Complete file upload request received');

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

    // Validate file type and size using S3Service
    if (!s3Service.isValidFileType(file.type)) {
      return createResponse(400, {
        success: false,
        message: 'Invalid file type'
      });
    }

    if (!s3Service.isValidFileSize(file.data.length)) {
      return createResponse(400, {
        success: false,
        message: 'File size exceeds maximum allowed size'
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

    // Upload file directly to S3
    const { fileUrl, s3Key } = await uploadToS3(file.name, file.data, file.type);

    // Create file document data
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const now = new Date().toISOString();

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
 * New upload handler that accepts folderId directly (for frontend)
 * Handles multipart form data with: file, folderId, fileName, fileType
 */
export const uploadHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('📤 New upload request received (with folderId)');

  try {
    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'OK' });
    }

    // Parse multipart form data using busboy for new format
    const uploadData = await parseMultipartWithBusboy(event);
    if (!uploadData) {
      return createResponse(400, {
        success: false,
        message: 'Invalid multipart form data'
      });
    }

    const { folderId, fileName, fileType, file } = uploadData;

    console.log('📊 Upload data received:', {
      folderId,
      fileName,
      fileType,
      fileSize: file?.data?.length || 0
    });

    // Validate required fields
    if (!folderId || !file) {
      return createResponse(400, {
        success: false,
        message: 'Missing required fields: folderId, file'
      });
    }

    // Use fileName from form data or fall back to file.name
    const actualFileName = fileName || file.name;
    const actualFileType = fileType || file.type;

    console.log('🔍 Using file details:', {
      fileName: actualFileName,
      fileType: actualFileType,
      size: file.data.length
    });

    // Validate file type and size using S3Service
    if (!s3Service.isValidFileType(actualFileType)) {
      return createResponse(400, {
        success: false,
        message: 'Invalid file type'
      });
    }

    if (!s3Service.isValidFileSize(file.data.length)) {
      return createResponse(400, {
        success: false,
        message: 'File size exceeds maximum allowed size'
      });
    }

    // Find folder by ID
    const folder = await findFolderById(folderId);
    if (!folder) {
      return createResponse(404, {
        success: false,
        message: `Folder with ID "${folderId}" not found`
      });
    }

    console.log(`✅ Target folder found: ${folder.name} (${folder.folderId})`);

    // Upload file directly to S3
    const { fileUrl, s3Key } = await uploadToS3(actualFileName, file.data, actualFileType);

    // Create file document data
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const now = new Date().toISOString();

    const fileDocument = {
      // Core identifiers
      documentId,
      folderId: folder.folderId,
      userId: 'test-user-123',

      // File info
      fileName: actualFileName,
      originalName: actualFileName,
      fileType: actualFileType,
      fileExtension: '.' + actualFileName.split('.').pop(),
      fileSize: file.data.length,
      documentType: 'file',

      // Storage info
      s3Bucket: S3_BUCKET,
      s3Key,
      fileUrl,

      // Status and processing - default to PENDING for user review
      status: 'completed',
      hoktusDecision: 'PENDING',
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
        observations: [{
          type: 'success',
          message: 'Archivo subido exitosamente desde el frontend',
          severity: 'info'
        }],
        processedAt: now,
        fileType: actualFileType.includes('pdf') ? 'PDF' : 'IMAGE',
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

    console.log(`✅ File uploaded successfully: ${actualFileName} → ${folder.name} (${folder.folderId})`);

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