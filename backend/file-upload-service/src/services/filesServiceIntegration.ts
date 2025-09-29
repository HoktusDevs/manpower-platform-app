import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const FILES_TABLE = process.env.FILES_TABLE || 'manpower-documents-dev';
const FILES_API_URL = process.env.FILES_API_URL || 'https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev';

/**
 * Save file document to the files service database
 * This ensures compatibility with the existing files system
 */
export const saveToFilesService = async (fileDocument: any): Promise<void> => {
  try {
    // Method 1: Direct DynamoDB save (primary method)
    console.log(`💾 Saving file to DynamoDB table: ${FILES_TABLE}`);

    const command = new PutCommand({
      TableName: FILES_TABLE,
      Item: {
        ...fileDocument,
        // Ensure required fields for files service compatibility
        id: fileDocument.documentId,
        userId: fileDocument.userId || 'test-user-123',
        uploadSource: 'file-upload-service',
        version: '1.0'
      }
    });

    await docClient.send(command);
    console.log(`✅ File saved to DynamoDB: ${fileDocument.documentId}`);

    // Method 2: Also call files service API for additional processing (fallback)
    try {
      const response = await fetch(`${FILES_API_URL}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fileDocument)
      });

      if (response.ok) {
        console.log('✅ File also saved via Files Service API');
      } else {
        console.warn(`⚠️ Files Service API returned ${response.status} - using DynamoDB save only`);
      }
    } catch (apiError) {
      console.warn('⚠️ Files Service API unavailable - using DynamoDB save only:', apiError);
    }

  } catch (error) {
    console.error('❌ Error saving file to files service:', error);
    throw error;
  }
};

/**
 * Validate file document structure for compatibility
 */
export const validateFileDocument = (fileDocument: any): boolean => {
  const requiredFields = [
    'documentId',
    'folderId',
    'originalName',
    'fileType',
    'fileUrl',
    'status',
    'hoktusDecision'
  ];

  for (const field of requiredFields) {
    if (!fileDocument[field]) {
      console.error(`❌ Missing required field: ${field}`);
      return false;
    }
  }

  return true;
};