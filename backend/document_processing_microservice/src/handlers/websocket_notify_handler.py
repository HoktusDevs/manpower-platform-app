"""
Handler simple para notificaciones WebSocket.
"""

import json
import logging
from typing import Dict, Any

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler simple para notificaciones WebSocket.
    
    Args:
        event: Evento de API Gateway
        context: Contexto de Lambda
        
    Returns:
        Dict: Respuesta de notificación
    """
    try:
        logger.info("WebSocket notification request received")
        
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
        logger.info(f"Notification data: {notification_data}")
        
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
        
        # Por ahora, solo loguear la notificación
        logger.info(f"WebSocket notification processed for document: {notification_data['documentId']}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Notification received successfully',
                'documentId': notification_data['documentId'],
                'status': notification_data['status']
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
        logger.error(f"Error in websocket notification: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
