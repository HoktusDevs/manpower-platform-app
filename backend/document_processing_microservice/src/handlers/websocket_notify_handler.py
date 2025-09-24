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
        
        # ENVIAR NOTIFICACIÓN REAL A CONEXIONES WEBSOCKET ACTIVAS
        import boto3
        from botocore.exceptions import ClientError
        
        # Configurar API Gateway Management API
        apigateway = boto3.client('apigatewaymanagementapi', 
                                 endpoint_url='https://b3wt34nt9h.execute-api.us-east-1.amazonaws.com/dev')
        
        # Obtener conexiones activas desde DynamoDB
        dynamodb = boto3.resource('dynamodb')
        connections_table = dynamodb.Table('websocket-connections-dev')
        
        try:
            # Obtener todas las conexiones activas
            response = connections_table.scan()
            connections = response.get('Items', [])
            
            logger.info(f"Found {len(connections)} active WebSocket connections")
            
            # Enviar notificación a cada conexión activa
            notification_message = {
                'type': 'document_processing_update',
                'data': notification_data,
                'timestamp': notification_data.get('timestamp', ''),
                'message': f"Documento {notification_data['documentId']} procesado: {notification_data['status']}"
            }
            
            message_body = json.dumps(notification_message)
            successful_sends = 0
            
            for connection in connections:
                connection_id = connection['connectionId']
                try:
                    # Enviar mensaje a la conexión WebSocket
                    apigateway.post_to_connection(
                        ConnectionId=connection_id,
                        Data=message_body
                    )
                    successful_sends += 1
                    logger.info(f"✅ Notification sent to connection: {connection_id}")
                    
                except ClientError as e:
                    if e.response['Error']['Code'] == 'GoneException':
                        # Conexión cerrada, eliminar de la tabla
                        connections_table.delete_item(Key={'connectionId': connection_id})
                        logger.info(f"🗑️ Removed closed connection: {connection_id}")
                    else:
                        logger.error(f"❌ Error sending to connection {connection_id}: {e}")
            
            logger.info(f"📤 Sent notifications to {successful_sends} connections")
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'WebSocket notifications sent successfully',
                    'documentId': notification_data['documentId'],
                    'status': notification_data['status'],
                    'connections_notified': successful_sends
                })
            }
            
        except Exception as e:
            logger.error(f"Error sending WebSocket notifications: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Failed to send WebSocket notifications',
                    'message': str(e)
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
