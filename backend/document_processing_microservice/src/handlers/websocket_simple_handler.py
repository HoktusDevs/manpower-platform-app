"""
Handler simple de WebSocket para el microservicio de procesamiento de documentos.
"""

import json
import logging
import boto3
from datetime import datetime, timezone
from typing import Dict, Any

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Configurar DynamoDB
dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table('doc-processor-websocket-connections-dev')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler simple de WebSocket para gestionar conexiones.
    """
    try:
        route_key = event.get('requestContext', {}).get('routeKey')
        connection_id = event.get('requestContext', {}).get('connectionId')
        
        logger.info(f"WebSocket event received. RouteKey: {route_key}, ConnectionId: {connection_id}")

        if route_key == '$connect':
            logger.info(f"WebSocket connection established: {connection_id}")
            
            # Guardar conexión en DynamoDB
            try:
                connections_table.put_item(
                    Item={
                        'connectionId': connection_id,
                        'userId': 'anonymous',
                        'connectedAt': datetime.now(timezone.utc).isoformat(),
                        'lastActivity': datetime.now(timezone.utc).isoformat(),
                        'ttl': int(datetime.now(timezone.utc).timestamp()) + (24 * 60 * 60)  # TTL 24 horas
                    }
                )
                logger.info(f"Connection {connection_id} saved to DynamoDB")
            except Exception as e:
                logger.error(f"Error saving connection: {e}")
            
            return {
                'statusCode': 200,
                'body': 'Connected'
            }
        elif route_key == '$disconnect':
            logger.info(f"WebSocket connection closed: {connection_id}")
            
            # Eliminar conexión de DynamoDB
            try:
                connections_table.delete_item(Key={'connectionId': connection_id})
                logger.info(f"Connection {connection_id} removed from DynamoDB")
            except Exception as e:
                logger.error(f"Error removing connection: {e}")
            
            return {
                'statusCode': 200,
                'body': 'Disconnected'
            }
        elif route_key == '$default':
            logger.info(f"WebSocket message received: {connection_id}")
            return {
                'statusCode': 200,
                'body': 'Message received'
            }
        else:
            logger.warning(f"Unknown route key: {route_key}")
            return {
                'statusCode': 400,
                'body': 'Unknown route'
            }
            
    except Exception as e:
        logger.error(f"Error in WebSocket handler: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
