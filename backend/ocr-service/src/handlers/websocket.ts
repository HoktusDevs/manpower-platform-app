import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { WebSocketService } from '../services/webSocketService';

const webSocketService = new WebSocketService();

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Sec-WebSocket-Protocol,Sec-WebSocket-Version,Sec-WebSocket-Key',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

export const connect = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResult> => {
  try {
    const connectionId = event.requestContext.connectionId;
    const routeKey = event.requestContext.routeKey;

    console.log(`Route: ${routeKey}, ConnectionId: ${connectionId}`);

    if (routeKey === '$connect') {
      console.log('New WebSocket connection established:', connectionId);
      // Store the connection in the WebSocket service
      await webSocketService.handleConnect(connectionId, null);
      return { statusCode: 200, body: 'Connected' };
    }

    if (routeKey === '$disconnect') {
      console.log('WebSocket connection closed:', connectionId);
      await webSocketService.handleDisconnect(connectionId);
      return { statusCode: 200, body: 'Disconnected' };
    }

    if (routeKey === '$default') {
      console.log('WebSocket message received:', event.body);
      if (event.body) {
        const message = JSON.parse(event.body);
        await webSocketService.handleMessage(connectionId, message);
      }
      return { statusCode: 200, body: 'Message received' };
    }

    return { statusCode: 200, body: 'OK' };

  } catch (error: any) {
    console.error('WebSocket error:', error);
    return { statusCode: 500, body: 'Error' };
  }
};

export const notifyDocumentUpdate = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('WebSocket notification request:', event.body);
    
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    const notificationData = JSON.parse(event.body);
    
    // Validate required fields
    if (!notificationData.documentId || !notificationData.status) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields: documentId and status' 
        })
      };
    }

    // Send notification to all connected clients
    await webSocketService.notifyDocumentUpdate(notificationData);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Notification sent successfully',
        documentId: notificationData.documentId
      })
    };

  } catch (error: any) {
    console.error('Error in notifyDocumentUpdate handler:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
