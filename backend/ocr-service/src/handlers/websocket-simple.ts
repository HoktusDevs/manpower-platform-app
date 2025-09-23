import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Almacenar conexiones activas en memoria (en producción usar Redis o DynamoDB)
const activeConnections = new Map<string, any>();

export const connect = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('WebSocket connection request:', event.requestContext);
    
    const connectionId = event.requestContext.connectionId;
    const routeKey = event.requestContext.routeKey;
    
    if (!connectionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Connection ID is required' })
      };
    }

    if (routeKey === '$connect') {
      // Guardar conexión
      activeConnections.set(connectionId, {
        connectionId,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      });
      
      console.log(`Connection ${connectionId} established. Total connections: ${activeConnections.size}`);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Connected successfully' })
      };
    }
    
    if (routeKey === '$disconnect') {
      // Remover conexión
      activeConnections.delete(connectionId);
      console.log(`Connection ${connectionId} removed. Total connections: ${activeConnections.size}`);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Disconnected successfully' })
      };
    }
    
    if (routeKey === '$default') {
      // Manejar mensajes
      const body = event.body ? JSON.parse(event.body) : {};
      console.log(`Message from ${connectionId}:`, body);
      
      // Responder con pong si es ping
      if (body.type === 'ping') {
        return {
          statusCode: 200,
          body: JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() })
        };
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Message processed' })
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Unknown route' })
    };

  } catch (error: any) {
    console.error('Error in WebSocket handler:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Endpoint para notificar a todas las conexiones
export const notifyAll = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Notifying all connections:', activeConnections.size);
    
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    const notificationData = JSON.parse(event.body);
    
    // En una implementación real, aquí enviarías el mensaje a todas las conexiones
    // usando el API Gateway Management API
    
    console.log('Notification data:', notificationData);
    console.log('Active connections:', Array.from(activeConnections.keys()));
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Notification sent to all connections',
        connectionsCount: activeConnections.size,
        data: notificationData
      })
    };

  } catch (error: any) {
    console.error('Error in notifyAll handler:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
