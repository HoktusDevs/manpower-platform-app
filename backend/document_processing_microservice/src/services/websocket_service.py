"""
Servicio de WebSocket para manejo de conexiones y notificaciones.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

import boto3
from botocore.exceptions import ClientError

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


class WebSocketService:
    """Servicio para manejo de conexiones WebSocket y notificaciones."""
    
    def __init__(self):
        """Inicializar el servicio WebSocket."""
        # Configurar cliente de API Gateway Management API
        self.websocket_endpoint = os.getenv('WEBSOCKET_ENDPOINT', '')
        if not self.websocket_endpoint:
            raise ValueError("WEBSOCKET_ENDPOINT environment variable is required")
        
        # Convertir wss:// a https:// para el endpoint de management
        management_endpoint = self.websocket_endpoint.replace('wss://', 'https://')
        
        self.api_gateway = boto3.client(
            'apigatewaymanagementapi',
            endpoint_url=management_endpoint,
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        
        # Configurar DynamoDB para almacenar conexiones
        self.dynamodb = boto3.resource('dynamodb')
        self.connections_table_name = f"doc-processor-websocket-connections-{os.getenv('STAGE', 'dev')}"
        self.connections_table = self.dynamodb.Table(self.connections_table_name)
        
        logger.info(f"WebSocket service initialized with endpoint: {management_endpoint}")
    
    async def handle_connect(self, connection_id: str, user_id: str = 'anonymous') -> None:
        """
        Maneja la conexión de un nuevo cliente.
        
        Args:
            connection_id: ID de la conexión WebSocket
            user_id: ID del usuario (opcional)
        """
        try:
            logger.info(f"Handling WebSocket connection: {connection_id} for user: {user_id}")
            
            now = datetime.now(timezone.utc)
            
            # Almacenar información de la conexión en DynamoDB
            connection_info = {
                'connectionId': connection_id,
                'userId': user_id,
                'connectedAt': now.isoformat(),
                'lastActivity': now.isoformat(),
                'ttl': int(now.timestamp()) + (24 * 60 * 60)  # Expira en 24 horas
            }
            
            self.connections_table.put_item(Item=connection_info)
            
            logger.info(f"Connection {connection_id} established for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error handling connection {connection_id}: {e}")
            raise
    
    async def handle_disconnect(self, connection_id: str) -> None:
        """
        Maneja la desconexión de un cliente.
        
        Args:
            connection_id: ID de la conexión WebSocket
        """
        try:
            logger.info(f"Handling WebSocket disconnection: {connection_id}")
            
            # Remover conexión de DynamoDB
            self.connections_table.delete_item(
                Key={'connectionId': connection_id}
            )
            
            logger.info(f"Connection {connection_id} removed")
            
        except Exception as e:
            logger.error(f"Error handling disconnection {connection_id}: {e}")
            raise
    
    async def handle_message(self, connection_id: str, message: Dict[str, Any]) -> None:
        """
        Maneja mensajes recibidos de clientes.
        
        Args:
            connection_id: ID de la conexión WebSocket
            message: Mensaje recibido
        """
        try:
            logger.info(f"Handling WebSocket message from {connection_id}: {message}")
            
            # Actualizar última actividad
            now = datetime.now(timezone.utc)
            self.connections_table.update_item(
                Key={'connectionId': connection_id},
                UpdateExpression='SET lastActivity = :activity, ttl = :ttl',
                ExpressionAttributeValues={
                    ':activity': now.isoformat(),
                    ':ttl': int(now.timestamp()) + (24 * 60 * 60)
                }
            )
            
            # Manejar diferentes tipos de mensajes
            message_type = message.get('type', '')
            
            if message_type == 'ping':
                await self.send_message(connection_id, {
                    'type': 'pong',
                    'timestamp': now.isoformat()
                })
                
            elif message_type == 'subscribe_documents':
                await self.send_message(connection_id, {
                    'type': 'subscription_confirmed',
                    'message': 'Subscribed to document processing updates',
                    'timestamp': now.isoformat()
                })
                
            elif message_type == 'get_document_status':
                document_id = message.get('documentId')
                if document_id:
                    await self.send_message(connection_id, {
                        'type': 'document_status',
                        'documentId': document_id,
                        'message': 'Document status requested',
                        'timestamp': now.isoformat()
                    })
                else:
                    await self.send_message(connection_id, {
                        'type': 'error',
                        'message': 'Document ID is required for status request',
                        'timestamp': now.isoformat()
                    })
                    
            else:
                await self.send_message(connection_id, {
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}',
                    'timestamp': now.isoformat()
                })
                
        except Exception as e:
            logger.error(f"Error handling message from {connection_id}: {e}")
            raise
    
    async def notify_document_update(self, notification_data: Dict[str, Any]) -> None:
        """
        Notifica a todos los clientes conectados sobre actualizaciones de documentos.
        
        Args:
            notification_data: Datos de la notificación
        """
        try:
            logger.info(f"Notifying document update: {notification_data}")
            
            # Crear mensaje de notificación
            message = {
                'type': 'document_processing_update',
                'documentId': notification_data.get('documentId'),
                'status': notification_data.get('status'),
                'processingStatus': notification_data.get('processingStatus'),
                'finalDecision': notification_data.get('finalDecision'),
                'documentType': notification_data.get('documentType'),
                'ocrResult': notification_data.get('ocrResult'),
                'extractedData': notification_data.get('extractedData'),
                'error': notification_data.get('error'),
                'observations': notification_data.get('observations'),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            # Obtener todas las conexiones activas
            connections = await self.get_active_connections()
            logger.info(f"Found {len(connections)} active connections")
            
            # Enviar notificación a todas las conexiones
            success_count = 0
            for connection in connections:
                try:
                    await self.send_message(connection['connectionId'], message)
                    success_count += 1
                except Exception as e:
                    logger.error(f"Failed to send message to {connection['connectionId']}: {e}")
                    # Remover conexión fallida
                    await self.remove_connection(connection['connectionId'])
            
            logger.info(f"Document update notification sent to {success_count} connections")
            
        except Exception as e:
            logger.error(f"Error notifying document update: {e}")
            raise
    
    async def send_message(self, connection_id: str, message: Dict[str, Any]) -> None:
        """
        Envía un mensaje a una conexión específica.
        
        Args:
            connection_id: ID de la conexión WebSocket
            message: Mensaje a enviar
        """
        try:
            self.api_gateway.post_to_connection(
                ConnectionId=connection_id,
                Data=json.dumps(message)
            )
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'GoneException':
                logger.warning(f"Connection {connection_id} is stale, removing it")
                await self.remove_connection(connection_id)
            else:
                logger.error(f"Error sending message to {connection_id}: {e}")
                raise
        except Exception as e:
            logger.error(f"Unexpected error sending message to {connection_id}: {e}")
            raise
    
    async def get_active_connections(self) -> List[Dict[str, Any]]:
        """
        Obtiene todas las conexiones activas.
        
        Returns:
            List[Dict]: Lista de conexiones activas
        """
        try:
            response = self.connections_table.scan()
            return response.get('Items', [])
        except Exception as e:
            logger.error(f"Error getting active connections: {e}")
            return []
    
    async def remove_connection(self, connection_id: str) -> None:
        """
        Remueve una conexión de la base de datos.
        
        Args:
            connection_id: ID de la conexión a remover
        """
        try:
            self.connections_table.delete_item(
                Key={'connectionId': connection_id}
            )
            logger.info(f"Connection {connection_id} removed from database")
        except Exception as e:
            logger.error(f"Error removing connection {connection_id}: {e}")
    
    async def broadcast_message(self, message: Dict[str, Any], user_id: Optional[str] = None) -> None:
        """
        Envía un mensaje a todas las conexiones o a un usuario específico.
        
        Args:
            message: Mensaje a enviar
            user_id: ID del usuario (opcional, si no se especifica envía a todos)
        """
        try:
            connections = await self.get_active_connections()
            
            if user_id:
                target_connections = [c for c in connections if c.get('userId') == user_id]
            else:
                target_connections = connections
            
            success_count = 0
            for connection in target_connections:
                try:
                    await self.send_message(connection['connectionId'], message)
                    success_count += 1
                except Exception as e:
                    logger.error(f"Failed to send broadcast to {connection['connectionId']}: {e}")
                    await self.remove_connection(connection['connectionId'])
            
            logger.info(f"Broadcast message sent to {success_count} connections")
            
        except Exception as e:
            logger.error(f"Error broadcasting message: {e}")
            raise
    
    async def get_connection_count(self) -> int:
        """
        Obtiene el número de conexiones activas.
        
        Returns:
            int: Número de conexiones activas
        """
        connections = await self.get_active_connections()
        return len(connections)
