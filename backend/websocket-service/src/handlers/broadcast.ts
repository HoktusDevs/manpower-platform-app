import { Handler, APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Initialize clients
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'manpower-websocket-connections-dev';

// Interface for broadcast events
interface BroadcastEvent {
  action: 'folder_created' | 'folder_updated' | 'folder_deleted' | 'file_created' | 'file_updated' | 'file_deleted';
  data: {
    folderId?: string;
    fileId?: string;
    userId: string;
    eventType: 'INSERT' | 'MODIFY' | 'REMOVE';
    folder?: any;
    file?: any;
    timestamp: number;
  };
  targetUsers?: string[]; // Optional: specific users to target
}

/**
 * Broadcast message to all active WebSocket connections
 * Can be called directly, from other services via HTTP, or as Lambda function
 */
export const broadcastToConnections: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  console.log('📡 Broadcasting message to WebSocket connections');

  let broadcastEvent: BroadcastEvent;

  // Parse the event (HTTP request body or direct Lambda event)
  if (event.body) {
    // HTTP request
    try {
      broadcastEvent = JSON.parse(event.body);
    } catch (error) {
      console.error('❌ Invalid JSON in request body');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          message: 'Invalid JSON format'
        })
      };
    }
  } else {
    // Direct Lambda invocation
    broadcastEvent = event as any;
  }

  console.log('Broadcast event:', JSON.stringify(broadcastEvent, null, 2));

  // Initialize API Gateway Management API client
  const apiGatewayClient = new ApiGatewayManagementApiClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.WEBSOCKET_ENDPOINT
  });

  try {
    // Get all active connections
    const connections = await getActiveConnections(broadcastEvent.targetUsers);
    console.log(`📱 Found ${connections.length} active connections`);

    if (connections.length === 0) {
      console.log('ℹ️ No active connections to broadcast to');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No active connections',
          broadcastCount: 0
        })
      };
    }

    // Prepare message for broadcast
    const message = {
      type: 'realtime_update',
      action: broadcastEvent.action,
      data: broadcastEvent.data,
      timestamp: new Date().toISOString()
    };

    // Broadcast to all connections
    const broadcastPromises = connections.map(connection =>
      broadcastToConnection(apiGatewayClient, connection.connectionId, message)
    );

    const results = await Promise.allSettled(broadcastPromises);

    // Count successful broadcasts
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    console.log(`✅ Broadcast complete: ${successful} successful, ${failed} failed`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Broadcast completed',
        broadcastCount: successful,
        failedCount: failed,
        totalConnections: connections.length
      })
    };

  } catch (error) {
    console.error('❌ Error in broadcastToConnections:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: 'Broadcast failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

/**
 * Get all active WebSocket connections
 */
async function getActiveConnections(targetUsers?: string[]): Promise<any[]> {
  try {
    const scanCommand = new ScanCommand({
      TableName: CONNECTIONS_TABLE,
      // Only get connections that haven't expired
      FilterExpression: '#ttl > :now',
      ExpressionAttributeNames: {
        '#ttl': 'ttl'
      },
      ExpressionAttributeValues: {
        ':now': Math.floor(Date.now() / 1000)
      }
    });

    const result = await docClient.send(scanCommand);
    let connections = result.Items || [];

    // Filter by specific users if provided
    if (targetUsers && targetUsers.length > 0) {
      connections = connections.filter(conn =>
        targetUsers.includes(conn.userId)
      );
    }

    return connections;

  } catch (error) {
    console.error('❌ Error getting active connections:', error);
    return [];
  }
}

/**
 * Send message to a specific WebSocket connection
 */
async function broadcastToConnection(
  apiGatewayClient: ApiGatewayManagementApiClient,
  connectionId: string,
  message: any
): Promise<void> {
  try {
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(message)
    });

    await apiGatewayClient.send(command);
    console.log(`✅ Message sent to connection: ${connectionId}`);

  } catch (error: any) {
    console.error(`❌ Failed to send message to connection ${connectionId}:`, error);

    // If connection is stale, remove it from the database
    if (error.statusCode === 410) {
      console.log(`🧹 Removing stale connection: ${connectionId}`);
      try {
        const deleteCommand = new DeleteCommand({
          TableName: CONNECTIONS_TABLE,
          Key: { connectionId }
        });
        await docClient.send(deleteCommand);
      } catch (deleteError) {
        console.error('Error removing stale connection:', deleteError);
      }
    }

    throw error;
  }
}

/**
 * Health check for broadcast service
 */
export const healthCheck: APIGatewayProxyHandler = async () => {
  try {
    // Count active connections
    const connections = await getActiveConnections();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Broadcast service is healthy',
        activeConnections: connections.length,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Health check failed:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: 'Broadcast service is unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    };
  }
};