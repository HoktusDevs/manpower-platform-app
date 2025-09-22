import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { OCRService } from '../services/ocrService';
import { ProcessDocumentsRequest, HoktusCallbackRequest } from '../types';

const ocrService = new OCRService();

export const processDocuments = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Processing documents request:', event.body);

    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Request body is required'
        })
      };
    }

    const requestData = JSON.parse(event.body);
    
    // Validate required fields
    if (!requestData.owner_user_name || !requestData.documents || !Array.isArray(requestData.documents)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: owner_user_name and documents array'
        })
      };
    }

    // Validate each document
    for (const doc of requestData.documents) {
      if (!doc.file_name || !doc.file_url || !doc.platform_document_id) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
          },
          body: JSON.stringify({
            success: false,
            error: 'Each document must have file_name, file_url, and platform_document_id'
          })
        };
      }
    }

    const result = await ocrService.processDocuments(
      requestData.owner_user_name,
      requestData.documents
    );

    return {
      statusCode: result.success ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(result)
    };

  } catch (error: any) {
    console.error('Error in processDocuments handler:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};

// Nuevo endpoint para el admin-frontend
export const processDocumentsFromAdmin = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Processing documents from admin:', event.body);

    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Request body is required'
        })
      };
    }

    const requestData = JSON.parse(event.body);
    
    // Validate required fields for admin format
    if (!requestData.ownerUserName || !requestData.documents || !Array.isArray(requestData.documents)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: ownerUserName and documents array'
        })
      };
    }

    // Validate each document
    for (const doc of requestData.documents) {
      if (!doc.fileName || !doc.fileUrl || !doc.platformDocumentId) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
          },
          body: JSON.stringify({
            success: false,
            error: 'Each document must have fileName, fileUrl, and platformDocumentId'
          })
        };
      }
    }

    // Transform admin format to Hoktus format
    console.log('=== TRANSFORMING TO HOKTUS FORMAT ===');
    console.log('requestData.documents:', JSON.stringify(requestData.documents, null, 2));
    
    // Save documents to database first so public endpoint can serve them
    const { DynamoService } = require('../services/dynamoService');
    const { OCRDocumentModel } = require('../models/OCRDocument');
    const dynamoService = new DynamoService();
    
    for (const doc of requestData.documents) {
      const document = new OCRDocumentModel({
        id: doc.platformDocumentId,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl, // Store original S3 URL
        platformDocumentId: doc.platformDocumentId,
        ownerUserName: requestData.ownerUserName,
        status: 'pending'
      });
      
      await dynamoService.saveDocument(document);
      console.log('Saved document to database:', doc.platformDocumentId);
    }
    
    const hoktusRequest = {
      owner_user_name: requestData.ownerUserName,
      url_response: 'https://xtspcl5cj6.execute-api.us-east-1.amazonaws.com/dev/api/ocr/callback',
      documents: requestData.documents.map((doc: any) => {
        console.log('Mapping document:', doc);
        console.log('doc.fileName:', doc.fileName);
        console.log('doc.fileUrl:', doc.fileUrl);
        console.log('doc.platformDocumentId:', doc.platformDocumentId);
        
        // Generate public URL for Hoktus to access
        const baseUrl = process.env.CALLBACK_BASE_URL || 'https://xtspcl5cj6.execute-api.us-east-1.amazonaws.com/dev';
        const publicUrl = `${baseUrl}/api/ocr/public-file/${doc.platformDocumentId}`;
        
        const mappedDoc = {
          file_name: doc.fileName,
          file_url: publicUrl, // Use public URL that serves S3 file
          platform_document_id: doc.platformDocumentId
        };
        
        console.log('Mapped document:', mappedDoc);
        return mappedDoc;
      })
    };

    console.log('=== PAYLOAD ENVIADO A HOKTUS ===');
    console.log('hoktusRequest:', JSON.stringify(hoktusRequest, null, 2));
    console.log('================================');

    // Send directly to Hoktus without going through OCRService
    try {
      const hoktusResponse = await ocrService.hoktusService.processDocuments(hoktusRequest);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: true,
          message: 'Documents sent to Hoktus successfully',
          requestId: hoktusResponse.requestId || 'unknown'
        })
      };
    } catch (error: any) {
      console.error('Error calling Hoktus:', error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: error.message || 'Failed to send documents to Hoktus'
        })
      };
    }

  } catch (error: any) {
    console.error('Error in processDocumentsFromAdmin handler:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};

export const callback = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('=== CALLBACK RECIBIDO DE HOKTUS ===');
    console.log('Body:', event.body);
    console.log('==================================');

    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Request body is required'
        })
      };
    }

    const hoktusResult = JSON.parse(event.body);
    
    // Validate required fields from Hoktus documentation
    if (!hoktusResult.platform_document_id) {
      console.error('Missing platform_document_id in callback');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Missing platform_document_id'
        })
      };
    }

    console.log('=== PROCESANDO RESULTADO DE HOKTUS ===');
    console.log('Platform Document ID:', hoktusResult.platform_document_id);
    console.log('Final Decision:', hoktusResult.final_decision);
    console.log('Document Type:', hoktusResult.document_type);
    console.log('Processing Status:', hoktusResult.processing_status);
    console.log('=====================================');

    // Get document from database
    const documentResult = await ocrService.getDocumentByPlatformId(hoktusResult.platform_document_id);
    
    if (!documentResult.success || !documentResult.data) {
      console.error('Document not found in database:', hoktusResult.platform_document_id);
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Document not found in database'
        })
      };
    }

    const document = documentResult.data;

    // Update document with Hoktus results
    if (hoktusResult.final_decision === 'APPROVED') {
      document.updateStatus('completed');
      document.setOCRResult({
        success: true,
        confidence: 95, // Default confidence
        extractedText: JSON.stringify(hoktusResult.data_structure),
        language: 'es',
        processingTime: 0,
        metadata: {
          format: hoktusResult.original_file_name?.split('.').pop() || 'pdf',
          size: 0
        },
        fields: hoktusResult.data_structure
      });
    } else if (hoktusResult.final_decision === 'REJECTED') {
      document.updateStatus('failed', 'Document rejected by Hoktus');
    } else if (hoktusResult.final_decision === 'MANUAL_REVIEW') {
      // MANUAL_REVIEW significa que el documento fue procesado pero necesita revisión manual
      document.updateStatus('completed');
      document.setOCRResult({
        success: true,
        confidence: 85, // Lower confidence for manual review
        extractedText: JSON.stringify(hoktusResult.data_structure),
        language: 'es',
        processingTime: 0,
        metadata: {
          format: hoktusResult.original_file_name?.split('.').pop() || 'pdf',
          size: 0
        } as any,
        fields: hoktusResult.data_structure
      });
    } else {
      document.updateStatus('failed', `Unknown decision: ${hoktusResult.final_decision}`);
    }

    // Save updated document
    const { DynamoService } = require('../services/dynamoService');
    const dynamoService = new DynamoService();
    await dynamoService.saveDocument(document);

    console.log('=== DOCUMENTO ACTUALIZADO ===');
    console.log('Status:', document.status);
    console.log('OCR Result:', document.ocrResult);
    console.log('=============================');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        message: 'Callback processed successfully',
        document_id: hoktusResult.platform_document_id,
        status: document.status
      })
    };

  } catch (error: any) {
    console.error('Error in callback handler:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};

// New endpoint to serve public files for Hoktus
export const getPublicFile = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const platformDocumentId = event.pathParameters?.platformDocumentId;

    if (!platformDocumentId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Platform document ID is required'
        })
      };
    }

    // Get document from database
    const document = await ocrService.getDocumentByPlatformId(platformDocumentId);
    
    if (!document.success || !document.data) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Document not found'
        })
      };
    }

    // Generate presigned URL for the file
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    
    const s3Client = new S3Client({ region: 'us-east-1' });
    
    // Extract S3 key from the file URL
    const fileUrl = document.data.fileUrl;
    const s3Key = fileUrl.includes('amazonaws.com') 
      ? fileUrl.split('amazonaws.com/')[1] 
      : fileUrl.split('/').pop();
    
    const command = new GetObjectCommand({
      Bucket: 'manpower-files-dev',
      Key: s3Key
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Redirect to the presigned URL
    return {
      statusCode: 302,
      headers: {
        'Location': presignedUrl,
        'Access-Control-Allow-Origin': '*'
      },
      body: ''
    };

  } catch (error: any) {
    console.error('Error in getPublicFile handler:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};
