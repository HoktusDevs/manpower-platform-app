"""
Publisher de SQS para el microservicio de procesamiento de documentos.
"""

import json
import boto3
import logging
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError, BotoCoreError

from src.config.settings import settings

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


class SQSPublisher:
    """Publisher para enviar mensajes a SQS con reintentos automáticos."""
    
    def __init__(self):
        self.sqs = boto3.client('sqs')
        self.queue_url = settings.DOCUMENT_PROCESSING_QUEUE_URL
        self.max_retries = 3
        self.retry_delay = 1
    
    def send_message(self, message_body: Dict[str, Any]) -> bool:
        """
        Envía un mensaje a SQS.
        
        Args:
            message_body: Cuerpo del mensaje a enviar
            
        Returns:
            bool: True si se envió exitosamente, False en caso contrario
        """
        try:
            response = self.sqs.send_message(
                QueueUrl=self.queue_url,
                MessageBody=json.dumps(message_body, default=str),
                MessageAttributes={
                    'processing_type': {
                        'StringValue': message_body.get('processing_type', 'default'),
                        'DataType': 'String'
                    },
                    'owner_user_name': {
                        'StringValue': message_body.get('owner_user_name', 'unknown'),
                        'DataType': 'String'
                    }
                }
            )
            
            logger.info(f"Mensaje enviado exitosamente a SQS. MessageId: {response['MessageId']}")
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"Error de AWS SQS ({error_code}): {e}")
            return False
        except BotoCoreError as e:
            logger.error(f"Error de conexión AWS: {e}")
            return False
        except Exception as e:
            logger.error(f"Error inesperado enviando mensaje a SQS: {e}")
            return False
    
    def send_batch_messages(self, messages: list) -> Dict[str, Any]:
        """
        Envía múltiples mensajes en lote a SQS.
        
        Args:
            messages: Lista de mensajes a enviar
            
        Returns:
            Dict con resultados del envío
        """
        try:
            # SQS permite máximo 10 mensajes por lote
            batch_size = 10
            results = {
                'successful': 0,
                'failed': 0,
                'errors': []
            }
            
            for i in range(0, len(messages), batch_size):
                batch = messages[i:i + batch_size]
                
                entries = []
                for j, message in enumerate(batch):
                    entries.append({
                        'Id': str(i + j),
                        'MessageBody': json.dumps(message, default=str),
                        'MessageAttributes': {
                            'processing_type': {
                                'StringValue': message.get('processing_type', 'default'),
                                'DataType': 'String'
                            },
                            'owner_user_name': {
                                'StringValue': message.get('owner_user_name', 'unknown'),
                                'DataType': 'String'
                            }
                        }
                    })
                
                try:
                    response = self.sqs.send_message_batch(
                        QueueUrl=self.queue_url,
                        Entries=entries
                    )
                    
                    results['successful'] += len(response.get('Successful', []))
                    results['failed'] += len(response.get('Failed', []))
                    
                    if response.get('Failed'):
                        results['errors'].extend([
                            f"Message {fail['Id']}: {fail['Message']}"
                            for fail in response['Failed']
                        ])
                        
                except ClientError as e:
                    logger.error(f"Error enviando lote a SQS: {e}")
                    results['failed'] += len(batch)
                    results['errors'].append(str(e))
            
            return results
            
        except Exception as e:
            logger.error(f"Error inesperado enviando lote a SQS: {e}")
            return {
                'successful': 0,
                'failed': len(messages),
                'errors': [str(e)]
            }
    
    def send_document_message(
        self, 
        owner_user_name: str, 
        document_data: Dict[str, Any], 
        url_response: str = None
    ) -> bool:
        """
        Envía un mensaje de procesamiento de documento.
        
        Args:
            owner_user_name: Nombre del propietario del documento
            document_data: Datos del documento
            url_response: URL opcional para callback
            
        Returns:
            bool: True si se envió exitosamente
        """
        message = {
            'owner_user_name': owner_user_name,
            'document_data': document_data,
            'processing_type': 'platform_document',
            'url_response': url_response
        }
        
        return self.send_message(message)
    
    def health_check(self) -> bool:
        """
        Verifica la conectividad con SQS.
        
        Returns:
            bool: True si la conexión es exitosa
        """
        try:
            # Intentar obtener atributos de la cola
            response = self.sqs.get_queue_attributes(
                QueueUrl=self.queue_url,
                AttributeNames=['QueueArn']
            )
            return 'QueueArn' in response.get('Attributes', {})
            
        except Exception as e:
            logger.error(f"Error en health check de SQS: {e}")
            return False
    
    def get_queue_info(self) -> Dict[str, Any]:
        """
        Obtiene información sobre la cola SQS.
        
        Returns:
            Dict con información de la cola
        """
        try:
            response = self.sqs.get_queue_attributes(
                QueueUrl=self.queue_url,
                AttributeNames=[
                    'ApproximateNumberOfMessages',
                    'ApproximateNumberOfMessagesNotVisible',
                    'ApproximateNumberOfMessagesDelayed',
                    'CreatedTimestamp',
                    'LastModifiedTimestamp'
                ]
            )
            
            return response.get('Attributes', {})
            
        except Exception as e:
            logger.error(f"Error obteniendo información de SQS: {e}")
            return {}
