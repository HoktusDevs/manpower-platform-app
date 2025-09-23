import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

interface ConnectionInfo {
  connectionId: string;
  userId?: string;
  connectedAt: string;
  lastActivity: string;
}

interface DocumentUpdateNotification {
  documentId: string;
  status: string;
  ocrResult?: any;
  error?: string;
  hoktusDecision?: string;
  hoktusProcessingStatus?: string;
  documentType?: string;
  observations?: any[];
  timestamp: string;
}

export class WebSocketService {
  private apiGateway: ApiGatewayManagementApiClient;
  private dynamoClient: DynamoDBDocumentClient;
  private connectionsTableName: string;

  constructor() {
    // For API Gateway Management API, we need to use the specific API Gateway endpoint
    // Format: https://{api-id}.execute-api.{region}.amazonaws.com/{stage}
    const websocketUrl = process.env.WEBSOCKET_ENDPOINT || 'wss://axt7p628rd.execute-api.us-east-1.amazonaws.com/dev';
    const managementEndpoint = websocketUrl.replace('wss://', 'https://');

    console.log('WebSocket Management Endpoint:', managementEndpoint);

    this.apiGateway = new ApiGatewayManagementApiClient({
      endpoint: managementEndpoint,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Setup DynamoDB for persistent connection storage
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.dynamoClient = DynamoDBDocumentClient.from(dynamoClient);
    this.connectionsTableName = `websocket-connections-${process.env.STAGE || 'dev'}`;
  }

  async handleConnect(connectionId: string, queryStringParameters?: { [name: string]: string } | null): Promise<void> {
    try {
      console.log('Handling WebSocket connection:', connectionId);

      // Extract user information from query parameters
      const userId = queryStringParameters?.userId || 'anonymous';

      const now = new Date();
      const connectionInfo: ConnectionInfo = {
        connectionId,
        userId,
        connectedAt: now.toISOString(),
        lastActivity: now.toISOString()
      };

      // Store connection in DynamoDB with TTL (expires in 24 hours)
      await this.dynamoClient.send(new PutCommand({
        TableName: this.connectionsTableName,
        Item: {
          ...connectionInfo,
          ttl: Math.floor(now.getTime() / 1000) + (24 * 60 * 60) // 24 hours from now
        }
      }));

      console.log(`Connection ${connectionId} established for user ${userId}`);

    } catch (error: any) {
      console.error('Error handling connection:', error);
      throw error;
    }
  }

  async handleDisconnect(connectionId: string): Promise<void> {
    try {
      console.log('Handling WebSocket disconnection:', connectionId);

      // Remove connection from DynamoDB
      await this.dynamoClient.send(new DeleteCommand({
        TableName: this.connectionsTableName,
        Key: { connectionId }
      }));

      console.log(`Connection ${connectionId} removed`);

    } catch (error: any) {
      console.error('Error handling disconnection:', error);
      throw error;
    }
  }

  async handleMessage(connectionId: string, message: any): Promise<void> {
    try {
      console.log('Handling WebSocket message:', connectionId, message);

      // Update last activity in DynamoDB
      const now = new Date();
      await this.dynamoClient.send(new PutCommand({
        TableName: this.connectionsTableName,
        Item: {
          connectionId,
          lastActivity: now.toISOString(),
          ttl: Math.floor(now.getTime() / 1000) + (24 * 60 * 60)
        }
      }));
      
      // Handle different message types
      switch (message.type) {
        case 'ping':
          await this.sendMessage(connectionId, {
            type: 'pong',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'subscribe_documents':
          // Client wants to receive document updates
          await this.sendMessage(connectionId, {
            type: 'subscription_confirmed',
            message: 'Subscribed to document updates',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'get_document_status':
          // Client wants to check specific document status
          if (message.documentId) {
            // This would typically query the database
            await this.sendMessage(connectionId, {
              type: 'document_status',
              documentId: message.documentId,
              message: 'Document status requested',
              timestamp: new Date().toISOString()
            });
          }
          break;
          
        default:
          await this.sendMessage(connectionId, {
            type: 'error',
            message: 'Unknown message type',
            timestamp: new Date().toISOString()
          });
      }
      
    } catch (error: any) {
      console.error('Error handling message:', error);
      throw error;
    }
  }

  async notifyDocumentUpdate(notification: DocumentUpdateNotification): Promise<void> {
    try {
      console.log('Notifying document update:', notification);

      const message = {
        type: 'document_update',
        documentId: notification.documentId,
        status: notification.status,
        ocrResult: notification.ocrResult,
        error: notification.error,
        hoktusDecision: notification.hoktusDecision,
        hoktusProcessingStatus: notification.hoktusProcessingStatus,
        documentType: notification.documentType,
        observations: notification.observations,
        timestamp: notification.timestamp
      };

      // Get all active connections from DynamoDB
      const connections = await this.getActiveConnections();
      console.log(`Found ${connections.length} active connections`);

      // Send to all connected clients
      const promises = connections.map(connection =>
        this.sendMessage(connection.connectionId, message).catch(error => {
          console.error(`Failed to send message to connection ${connection.connectionId}:`, error);
          // Remove failed connections
          this.removeConnection(connection.connectionId);
        })
      );

      await Promise.allSettled(promises);

      console.log(`Document update notification sent to ${connections.length} connections`);

    } catch (error: any) {
      console.error('Error notifying document update:', error);
      throw error;
    }
  }

  async sendMessage(connectionId: string, message: any): Promise<void> {
    try {
      const command = new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(message)
      });
      
      await this.apiGateway.send(command);
      
    } catch (error: any) {
      console.error(`Error sending message to connection ${connectionId}:`, error);
      
      // If connection is stale, remove it
      if (error.name === 'GoneException' || error.statusCode === 410) {
        await this.removeConnection(connectionId);
        console.log(`Removed stale connection: ${connectionId}`);
      }

      throw error;
    }
  }

  async getActiveConnections(): Promise<ConnectionInfo[]> {
    try {
      const result = await this.dynamoClient.send(new ScanCommand({
        TableName: this.connectionsTableName
      }));

      return result.Items as ConnectionInfo[] || [];
    } catch (error: any) {
      console.error('Error getting active connections:', error);
      return [];
    }
  }

  async removeConnection(connectionId: string): Promise<void> {
    try {
      await this.dynamoClient.send(new DeleteCommand({
        TableName: this.connectionsTableName,
        Key: { connectionId }
      }));
    } catch (error: any) {
      console.error('Error removing connection:', error);
    }
  }

  async broadcastMessage(message: any, userId?: string): Promise<void> {
    try {
      console.log('Broadcasting message:', message);

      const allConnections = await this.getActiveConnections();
      const targetConnections = userId
        ? allConnections.filter(connection => connection.userId === userId)
        : allConnections;

      const promises = targetConnections.map(connection =>
        this.sendMessage(connection.connectionId, message).catch(error => {
          console.error(`Failed to send broadcast to connection ${connection.connectionId}:`, error);
          this.removeConnection(connection.connectionId);
        })
      );

      await Promise.allSettled(promises);

      console.log(`Broadcast message sent to ${targetConnections.length} connections`);

    } catch (error: any) {
      console.error('Error broadcasting message:', error);
      throw error;
    }
  }

  async getConnectionCount(): Promise<number> {
    const connections = await this.getActiveConnections();
    return connections.length;
  }

  async getConnections(): Promise<ConnectionInfo[]> {
    return this.getActiveConnections();
  }
}
