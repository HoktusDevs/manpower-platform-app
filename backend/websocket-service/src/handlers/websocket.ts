import { APIGatewayProxyHandler, APIGatewayProxyEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'manpower-websocket-connections-dev';

// Helper function to send message to WebSocket connection
const sendMessageToConnection = async (connectionId: string, data: any, event: APIGatewayProxyEvent) => {
  const { domainName, stage } = event.requestContext;
  const endpoint = `https://${domainName}/${stage}`;

  const apiGatewayClient = new ApiGatewayManagementApiClient({
    endpoint,
    region: process.env.AWS_REGION || 'us-east-1'
  });

  try {
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(data)
    });

    await apiGatewayClient.send(command);
    console.log('📤 Message sent successfully to connection:', connectionId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send message to connection:', connectionId, error);
    return false;
  }
};

// Extract user info from JWT token
const extractUserFromEvent = (event: APIGatewayProxyEvent) => {
  try {
    // Get authorization from query parameters (WebSocket doesn't support headers in connection)
    const token = event.queryStringParameters?.token;

    if (!token) {
      console.warn('No token provided in query parameters');
      return null;
    }

    // Decode JWT token (without verification for now - add proper verification in production)
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
    return null;
  }
};

const createResponse = (statusCode: number, body?: any) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  },
  body: body ? JSON.stringify(body) : ''
});

/**
 * Handle WebSocket connection
 */
export const connectHandler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent, context: Context) => {
  console.log('🔌 WebSocket connection initiated');
  console.log('Connection ID:', event.requestContext.connectionId);

  const connectionId = event.requestContext.connectionId!;
  const connectedAt = new Date().toISOString();

  try {
    // Try to extract user info from token (optional)
    const userInfo = extractUserFromEvent(event);

    // Generate anonymous user if no token provided
    const userId = userInfo?.userId || `anonymous-${connectionId}`;
    const email = userInfo?.email || 'anonymous@example.com';
    const role = userInfo?.role || 'guest';

    console.log('👤 User connecting:', userId, email);

    // Store connection in DynamoDB
    const connectionData = {
      connectionId,
      userId,
      email,
      role,
      connectedAt,
      ttl: Math.floor(Date.now() / 1000) + (2 * 60 * 60), // 2 hours TTL
      lastActivity: connectedAt
    };

    const command = new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: connectionData
    });

    await docClient.send(command);

    console.log('✅ Connection stored successfully');

    // Note: Cannot send messages during connection handler
    // The welcome message will be sent when client sends first message
    console.log('📨 Connection established, welcome message will be sent on first client message');

    return createResponse(200, { message: 'Connected successfully' });

  } catch (error) {
    console.error('❌ Error in connectHandler:', error);
    return createResponse(500, {
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle WebSocket disconnection
 */
export const disconnectHandler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent, context: Context) => {
  console.log('🔌 WebSocket disconnection initiated');
  console.log('Connection ID:', event.requestContext.connectionId);

  const connectionId = event.requestContext.connectionId!;

  try {
    // Get connection info before deleting
    const getCommand = new GetCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    });

    const connection = await docClient.send(getCommand);

    if (connection.Item) {
      console.log('👤 User disconnecting:', connection.Item.userId, connection.Item.email);
    }

    // Remove connection from DynamoDB
    const deleteCommand = new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    });

    await docClient.send(deleteCommand);

    console.log('✅ Connection removed successfully');
    return createResponse(200, { message: 'Disconnected successfully' });

  } catch (error) {
    console.error('❌ Error in disconnectHandler:', error);
    return createResponse(500, {
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle default WebSocket messages
 */
export const defaultHandler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent, context: Context) => {
  console.log('💬 WebSocket message received');
  console.log('Connection ID:', event.requestContext.connectionId);
  console.log('Body:', event.body);

  const connectionId = event.requestContext.connectionId!;

  try {
    let message;

    try {
      message = event.body ? JSON.parse(event.body) : {};
    } catch (parseError) {
      console.error('❌ Invalid JSON in message body');
      return createResponse(400, { message: 'Invalid JSON format' });
    }

    // Get connection info to check if this is first message
    const getCommand = new GetCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    });

    const connectionResult = await docClient.send(getCommand);
    const connection = connectionResult.Item;

    if (!connection) {
      console.error('❌ Connection not found:', connectionId);
      return createResponse(404, { message: 'Connection not found' });
    }

    // Check if this is the first message (no lastActivity update yet)
    const isFirstMessage = !connection.lastActivity || connection.lastActivity === connection.connectedAt;

    // Update last activity timestamp
    const updateCommand = new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: {
        ...connection,
        lastActivity: new Date().toISOString()
      }
    });

    await docClient.send(updateCommand);

    // Send welcome message if this is the first interaction
    if (isFirstMessage) {
      const welcomeMessage = {
        type: 'connection_established',
        data: {
          connectionId,
          userId: connection.userId,
          timestamp: new Date().toISOString(),
          message: 'WebSocket connection established successfully'
        }
      };

      console.log('📨 Sending delayed welcome message:', welcomeMessage);
      await sendMessageToConnection(connectionId, welcomeMessage, event);
    }

    // Handle different message types
    switch (message.action) {
      case 'initial_ping':
      case 'ping':
        const pongMessage = {
          type: 'pong',
          timestamp: new Date().toISOString()
        };
        await sendMessageToConnection(connectionId, pongMessage, event);
        return createResponse(200);

      case 'subscribe_folders':
        // Client wants to subscribe to folder updates
        console.log('📂 Client subscribed to folder updates');
        const subscribeMessage = {
          type: 'subscribed',
          topic: 'folders',
          message: 'Successfully subscribed to folder updates'
        };
        await sendMessageToConnection(connectionId, subscribeMessage, event);
        return createResponse(200);

      default:
        console.log('ℹ️ Unknown message action:', message.action);
        const ackMessage = {
          type: 'ack',
          message: 'Message received'
        };
        await sendMessageToConnection(connectionId, ackMessage, event);
        return createResponse(200);
    }

  } catch (error) {
    console.error('❌ Error in defaultHandler:', error);
    return createResponse(500, {
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};