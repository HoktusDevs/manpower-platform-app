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
      
      console.log('=== GUARDANDO DOCUMENTO EN DB ===');
      console.log('Platform Document ID:', doc.platformDocumentId);
      console.log('Owner User Name:', requestData.ownerUserName);
      console.log('Document Object:', JSON.stringify(document.toDynamoDB(), null, 2));
      console.log('=================================');
      
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
        
        // Use original S3 URL directly - Hoktus should handle S3 access
        const mappedDoc = {
          file_name: doc.fileName,
          file_url: doc.fileUrl, // Use original S3 URL directly
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

    console.log('=== DOCUMENTO ENCONTRADO EN DB ===');
    console.log('Document ID:', document.id);
    console.log('Owner User Name:', document.ownerUserName);
    console.log('Platform Document ID:', document.platformDocumentId);
    console.log('==================================');

    // Store Hoktus decision information
    document.setHoktusResult({
      final_decision: hoktusResult.final_decision,
      processing_status: hoktusResult.processing_status,
      document_type: hoktusResult.document_type,
      observations: hoktusResult.observations
    });

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

    // Notify WebSocket clients about the document update
    try {
      const { WebSocketService } = require('../services/webSocketService');
      const webSocketService = new WebSocketService();
      
      await webSocketService.notifyDocumentUpdate({
        documentId: hoktusResult.platform_document_id,
        status: document.status,
        ocrResult: document.ocrResult,
        error: document.error,
        hoktusDecision: document.hoktusDecision,
        hoktusProcessingStatus: document.hoktusProcessingStatus,
        documentType: document.documentType,
        observations: document.observations,
        timestamp: new Date().toISOString()
      });
      
      console.log('WebSocket notification sent for document:', hoktusResult.platform_document_id);
    } catch (wsError: any) {
      console.error('Error sending WebSocket notification:', wsError);
      // Don't fail the callback if WebSocket notification fails
    }

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

    // Return the original S3 URL directly - let Hoktus handle it
    const fileUrl = document.data.fileUrl;
    console.log('Returning original fileUrl:', fileUrl);

    // Redirect to the original S3 URL
    return {
      statusCode: 302,
      headers: {
        'Location': fileUrl,
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

// New endpoint to get real-time document status
export const getDocumentStatus = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const documentId = event.pathParameters?.documentId;

    if (!documentId) {
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
          error: 'Document ID is required'
        })
      };
    }

    const result = await ocrService.getDocumentByPlatformId(documentId);

    return {
      statusCode: result.success ? 200 : 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify(result)
    };

  } catch (error: any) {
    console.error('Error in getDocumentStatus handler:', error);
    
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

// New endpoint to get all documents by status
export const getDocumentsByStatus = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const status = event.queryStringParameters?.status || 'all';

    let result;
    if (status === 'all') {
      result = await ocrService.getAllDocuments();
    } else {
      result = await ocrService.getDocumentsByStatus(status);
    }

    return {
      statusCode: result.success ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify(result)
    };

  } catch (error: any) {
    console.error('Error in getDocumentsByStatus handler:', error);

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

export const deleteDocument = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'DELETE,OPTIONS,POST,GET,PUT'
      },
      body: ''
    };
  }

  try {
    console.log('Delete document request:', event.pathParameters);

    const documentId = event.pathParameters?.id;
    if (!documentId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'DELETE,OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify({
          success: false,
          error: 'Document ID is required'
        })
      };
    }

    const result = await ocrService.deleteDocument(documentId);

    return {
      statusCode: result.success ? 200 : 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'DELETE,OPTIONS,POST,GET,PUT'
      },
      body: JSON.stringify(result)
    };

  } catch (error: any) {
    console.error('Error in deleteDocument handler:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'DELETE,OPTIONS,POST,GET,PUT'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};

export const cleanupTestDocuments = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Cleaning up test documents with Usuario de Prueba');

    const documentsResponse = await ocrService.getAllDocuments();

    if (!documentsResponse.success || !documentsResponse.data) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'DELETE,OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify({
          success: false,
          error: 'Failed to get documents'
        })
      };
    }

    // Find all documents with "Usuario de Prueba"
    const testDocuments = documentsResponse.data.filter(doc =>
      doc.ownerUserName === 'Usuario de Prueba'
    );

    console.log(`Found ${testDocuments.length} documents with "Usuario de Prueba"`);

    const results = [];

    // Delete old test documents since they're test data
    for (const doc of testDocuments) {
      try {
        const deleteResult = await ocrService.deleteDocument(doc.id);
        results.push({
          documentId: doc.id,
          fileName: doc.fileName,
          action: 'deleted',
          success: deleteResult.success,
          error: deleteResult.error
        });
      } catch (error) {
        results.push({
          documentId: doc.id,
          fileName: doc.fileName,
          action: 'delete_failed',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'DELETE,OPTIONS,POST,GET,PUT'
      },
      body: JSON.stringify({
        success: true,
        message: `Processed ${testDocuments.length} test documents`,
        results
      })
    };

  } catch (error: any) {
    console.error('Error in cleanupTestDocuments handler:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'DELETE,OPTIONS,POST,GET,PUT'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};
