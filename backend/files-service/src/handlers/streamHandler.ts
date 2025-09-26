import { DynamoDBStreamEvent, DynamoDBRecord, Context } from 'aws-lambda';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

// Types for stream events
interface FileStreamEvent {
  eventName: 'INSERT' | 'MODIFY' | 'REMOVE';
  dynamodb: {
    NewImage?: any;
    OldImage?: any;
    Keys?: any;
  };
  eventSourceARN: string;
  timestamp: number;
}

interface WebSocketMessage {
  action: 'file_created' | 'file_updated' | 'file_deleted';
  data: {
    fileId: string;
    userId: string;
    eventType: 'INSERT' | 'MODIFY' | 'REMOVE';
    file?: any;
    timestamp: number;
  };
}

/**
 * DynamoDB Stream Handler for Files/Documents Table
 * Processes real-time changes and broadcasts to WebSocket connections
 */
export const handleFilesStream = async (event: DynamoDBStreamEvent, context: Context) => {
  console.log('📡 DynamoDB Stream triggered for files table');
  console.log('Event records count:', event.Records.length);

  // Initialize API Gateway Management API client for WebSocket
  const apiGatewayClient = new ApiGatewayManagementApiClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.WEBSOCKET_ENDPOINT || undefined
  });

  try {
    // Process each record from the stream
    const processPromises = event.Records.map(async (record: DynamoDBRecord) => {
      try {
        await processStreamRecord(record, apiGatewayClient);
      } catch (error) {
        console.error('❌ Error processing stream record:', error);
        console.error('Record:', JSON.stringify(record, null, 2));
      }
    });

    await Promise.allSettled(processPromises);

    console.log('✅ All stream records processed');
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        processedRecords: event.Records.length,
        message: 'Stream records processed successfully'
      })
    };

  } catch (error) {
    console.error('❌ Error in handleFilesStream:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Error processing stream records',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

/**
 * Process individual DynamoDB stream record
 */
async function processStreamRecord(
  record: DynamoDBRecord,
  apiGatewayClient: ApiGatewayManagementApiClient
): Promise<void> {
  console.log('🔄 Processing stream record:', record.eventName);

  if (!record.dynamodb || !record.eventName) {
    console.warn('⚠️ Invalid stream record, skipping');
    return;
  }

  // Extract file data from DynamoDB format
  const newImage = record.dynamodb.NewImage ? unmarshallDynamoDBRecord(record.dynamodb.NewImage) : null;
  const oldImage = record.dynamodb.OldImage ? unmarshallDynamoDBRecord(record.dynamodb.OldImage) : null;
  const keys = record.dynamodb.Keys ? unmarshallDynamoDBRecord(record.dynamodb.Keys) : null;

  // Determine the file data to use
  const fileData = newImage || oldImage;

  if (!fileData || !fileData.documentId || !fileData.userId) {
    console.warn('⚠️ Missing required file data, skipping');
    console.log('Available file data keys:', Object.keys(fileData || {}));
    return;
  }

  // Create WebSocket message based on event type
  const webSocketMessage: WebSocketMessage = {
    action: getActionFromEventName(record.eventName),
    data: {
      fileId: fileData.documentId,
      userId: fileData.userId,
      eventType: record.eventName as 'INSERT' | 'MODIFY' | 'REMOVE',
      file: newImage,
      timestamp: Date.now()
    }
  };

  console.log('📤 Broadcasting WebSocket message:', {
    action: webSocketMessage.action,
    fileId: fileData.documentId,
    userId: fileData.userId
  });

  // Broadcast to WebSocket connections
  await broadcastToWebSocketConnections(webSocketMessage, apiGatewayClient);
}

/**
 * Convert DynamoDB event name to WebSocket action
 */
function getActionFromEventName(eventName: string): 'file_created' | 'file_updated' | 'file_deleted' {
  switch (eventName) {
    case 'INSERT':
      return 'file_created';
    case 'MODIFY':
      return 'file_updated';
    case 'REMOVE':
      return 'file_deleted';
    default:
      return 'file_updated';
  }
}

/**
 * Unmarshall DynamoDB record to regular JavaScript object
 */
function unmarshallDynamoDBRecord(record: any): any {
  const result: any = {};

  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'object' && value !== null) {
      // Handle DynamoDB attribute types
      if ('S' in value) result[key] = (value as any).S; // String
      else if ('N' in value) result[key] = Number((value as any).N); // Number
      else if ('BOOL' in value) result[key] = (value as any).BOOL; // Boolean
      else if ('NULL' in value) result[key] = null; // Null
      else if ('L' in value) result[key] = (value as any).L; // List
      else if ('M' in value) result[key] = unmarshallDynamoDBRecord((value as any).M); // Map
      else result[key] = value;
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Broadcast message to all active WebSocket connections via websocket-service
 */
async function broadcastToWebSocketConnections(
  message: WebSocketMessage,
  apiGatewayClient: ApiGatewayManagementApiClient
): Promise<void> {

  const websocketServiceUrl = process.env.WEBSOCKET_SERVICE_URL;

  if (!websocketServiceUrl) {
    console.log('📡 No WebSocket service URL configured, message will be logged only');
    console.log('Message:', JSON.stringify(message, null, 2));
    return;
  }

  try {
    // Call websocket-service broadcast endpoint
    const response = await fetch(`${websocketServiceUrl}/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.INTERNAL_API_KEY || 'default-internal-key'
      },
      body: JSON.stringify(message)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Message broadcast via websocket-service:', result);
    } else {
      console.error('❌ Failed to broadcast via websocket-service:', response.status, response.statusText);
    }

  } catch (error) {
    console.error('❌ Error calling websocket-service:', error);
    // Fallback: log the message that would be broadcast
    console.log('📡 WebSocket message (fallback log):', JSON.stringify(message, null, 2));
  }
}