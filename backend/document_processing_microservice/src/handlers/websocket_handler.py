"""
Handler de WebSocket para el microservicio de procesamiento de documentos.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any

from src.services.websocket_service import WebSocketService

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Instancia global del servicio WebSocket
websocket_service = WebSocketService()


async def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler principal de WebSocket para conexiones, desconexiones y mensajes.
    
    Args:
        event: Evento de API Gateway WebSocket
        context: Contexto de Lambda
        
    Returns:
        Dict: Respuesta de API Gateway
    """
    try:
        # Obtener información del contexto de la conexión
        request_context = event.get('requestContext', {})
        connection_id = request_context.get('connectionId')
        route_key = request_context.get('routeKey')
        
        logger.info(f"WebSocket event - Route: {route_key}, ConnectionId: {connection_id}")
        
        if route_key == '$connect':
            return await handle_connect(connection_id, event)
        elif route_key == '$disconnect':
            return await handle_disconnect(connection_id)
        elif route_key == '$default':
            return await handle_message(connection_id, event)
        else:
            logger.warning(f"Unknown route key: {route_key}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Unknown route key'})
            }
            
    except Exception as e:
        logger.error(f"Error in WebSocket handler: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }


async def handle_connect(connection_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Maneja la conexión de un nuevo cliente WebSocket.
    
    Args:
        connection_id: ID de la conexión
        event: Evento completo de conexión
        
    Returns:
        Dict: Respuesta de conexión
    """
    try:
        logger.info(f"New WebSocket connection: {connection_id}")
        
        # Extraer parámetros de consulta si existen
        query_params = event.get('queryStringParameters') or {}
        user_id = query_params.get('userId', 'anonymous')
        
        # Manejar la conexión en el servicio
        await websocket_service.handle_connect(connection_id, user_id)
        
        # Enviar mensaje de bienvenida
        welcome_message = {
            'type': 'connection_established',
            'message': 'Connected to Document Processing Service',
            'connectionId': connection_id,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        await websocket_service.send_message(connection_id, welcome_message)
        
        return {
            'statusCode': 200,
            'body': 'Connected'
        }
        
    except Exception as e:
        logger.error(f"Error handling connection: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Connection failed'})
        }


async def handle_disconnect(connection_id: str) -> Dict[str, Any]:
    """
    Maneja la desconexión de un cliente WebSocket.
    
    Args:
        connection_id: ID de la conexión
        
    Returns:
        Dict: Respuesta de desconexión
    """
    try:
        logger.info(f"WebSocket disconnection: {connection_id}")
        
        # Manejar la desconexión en el servicio
        await websocket_service.handle_disconnect(connection_id)
        
        return {
            'statusCode': 200,
            'body': 'Disconnected'
        }
        
    except Exception as e:
        logger.error(f"Error handling disconnection: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Disconnection failed'})
        }


async def handle_message(connection_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Maneja mensajes recibidos de clientes WebSocket.
    
    Args:
        connection_id: ID de la conexión
        event: Evento completo del mensaje
        
    Returns:
        Dict: Respuesta del mensaje
    """
    try:
        logger.info(f"WebSocket message from {connection_id}: {event.get('body')}")
        
        if not event.get('body'):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Message body is required'})
            }
        
        # Parsear el mensaje
        message = json.loads(event['body'])
        
        # Manejar el mensaje en el servicio
        await websocket_service.handle_message(connection_id, message)
        
        return {
            'statusCode': 200,
            'body': 'Message received'
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in message: {e}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON message'})
        }
    except Exception as e:
        logger.error(f"Error handling message: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Message processing failed'})
        }


async def notify_document_update(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler para notificar actualizaciones de documentos a clientes conectados.
    
    Args:
        event: Evento de API Gateway
        context: Contexto de Lambda
        
    Returns:
        Dict: Respuesta de notificación
    """
    try:
        logger.info("Document update notification request")
        
        if not event.get('body'):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Request body is required'})
            }
        
        # Parsear datos de notificación
        notification_data = json.loads(event['body'])
        
        # Validar campos requeridos
        required_fields = ['documentId', 'status']
        missing_fields = [field for field in required_fields if field not in notification_data]
        
        if missing_fields:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': f'Missing required fields: {", ".join(missing_fields)}'
                })
            }
        
        # Enviar notificación a todos los clientes conectados
        await websocket_service.notify_document_update(notification_data)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Notification sent successfully',
                'documentId': notification_data['documentId']
            })
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in notification: {e}")
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except Exception as e:
        logger.error(f"Error in notify_document_update: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
