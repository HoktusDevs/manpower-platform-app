"""
Handler para DynamoDB Stream - Se ejecuta automáticamente cuando cambia la tabla
"""

import json
import logging
import boto3
from typing import Dict, Any
from botocore.exceptions import ClientError

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler que se ejecuta automáticamente cuando cambia la tabla DynamoDB.
    
    Args:
        event: Evento de DynamoDB Stream
        context: Contexto de Lambda
        
    Returns:
        Dict: Resultado del procesamiento
    """
    try:
        logger.info(f"DynamoDB Stream event received: {len(event.get('Records', []))} records")
        
        # Procesar cada registro del stream
        for record in event.get('Records', []):
            try:
                # Verificar que es un evento de INSERT o MODIFY
                event_name = record.get('eventName')
                if event_name not in ['INSERT', 'MODIFY']:
                    logger.info(f"Skipping event: {event_name}")
                    continue
                
                # Obtener datos del documento
                if event_name == 'INSERT':
                    document_data = record.get('dynamodb', {}).get('NewImage', {})
                else:  # MODIFY
                    document_data = record.get('dynamodb', {}).get('NewImage', {})
                
                if not document_data:
                    logger.warning("No document data found in stream record")
                    continue
                
                # Convertir DynamoDB format a dict normal
                document = convert_dynamodb_to_dict(document_data)
                
                # Verificar si el documento se completó
                if document.get('processing_status') == 'COMPLETED':
                    logger.info(f"Document {document.get('document_id')} completed, sending WebSocket notification")
                    
                    # Enviar notificación WebSocket
                    send_websocket_notification(document)
                else:
                    logger.info(f"Document {document.get('document_id')} status: {document.get('processing_status')}")
                    
            except Exception as e:
                logger.error(f"Error processing stream record: {e}")
                continue
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Stream processed successfully',
                'processed_records': len(event.get('Records', []))
            })
        }
        
    except Exception as e:
        logger.error(f"Error in DynamoDB stream handler: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Stream processing failed',
                'message': str(e)
            })
        }

def convert_dynamodb_to_dict(dynamodb_item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convierte un item de DynamoDB a un diccionario normal.
    """
    result = {}
    for key, value in dynamodb_item.items():
        if 'S' in value:
            result[key] = value['S']
        elif 'N' in value:
            result[key] = float(value['N'])
        elif 'BOOL' in value:
            result[key] = value['BOOL']
        elif 'NULL' in value:
            result[key] = None
        elif 'L' in value:
            result[key] = [convert_dynamodb_to_dict(item) for item in value['L']]
        elif 'M' in value:
            result[key] = convert_dynamodb_to_dict(value['M'])
        else:
            result[key] = value
    return result

def send_websocket_notification(document: Dict[str, Any]) -> None:
    """
    Envía notificación WebSocket cuando un documento se completa.
    """
    try:
        # Configurar API Gateway Management API
        apigateway = boto3.client('apigatewaymanagementapi', 
                                 endpoint_url='https://b3wt34nt9h.execute-api.us-east-1.amazonaws.com/dev')
        
        # Obtener conexiones activas
        dynamodb = boto3.resource('dynamodb')
        connections_table = dynamodb.Table('websocket-connections-dev')
        
        response = connections_table.scan()
        connections = response.get('Items', [])
        
        logger.info(f"Found {len(connections)} active WebSocket connections")
        
        # Crear mensaje de notificación
        notification_message = {
            'type': 'document_processing_update',
            'data': {
                'documentId': document.get('document_id'),
                'status': 'completed',
                'processingStatus': document.get('processing_status'),
                'finalDecision': document.get('final_decision'),
                'documentType': document.get('document_type'),
                'ocrResult': document.get('ocr_result'),
                'extractedData': document.get('data_structure'),
                'observations': document.get('observations', []),
                'message': f"Documento {document.get('file_name')} procesado exitosamente",
                'ownerUserName': document.get('owner_user_name'),
                'fileName': document.get('file_name'),
                'processingTime': 2,
                'timestamp': document.get('created_at', ''),
                'error': None,
                'lambdaError': False
            },
            'timestamp': document.get('created_at', ''),
            'message': f"Documento {document.get('file_name')} procesado: {document.get('processing_status')}"
        }
        
        message_body = json.dumps(notification_message)
        successful_sends = 0
        
        # Enviar a cada conexión activa
        for connection in connections:
            connection_id = connection['connectionId']
            try:
                apigateway.post_to_connection(
                    ConnectionId=connection_id,
                    Data=message_body
                )
                successful_sends += 1
                logger.info(f"✅ WebSocket notification sent to connection: {connection_id}")
                
            except ClientError as e:
                if e.response['Error']['Code'] == 'GoneException':
                    # Conexión cerrada, eliminar de la tabla
                    connections_table.delete_item(Key={'connectionId': connection_id})
                    logger.info(f"🗑️ Removed closed connection: {connection_id}")
                else:
                    logger.error(f"❌ Error sending to connection {connection_id}: {e}")
        
        logger.info(f"📤 Sent WebSocket notifications to {successful_sends} connections")
        
    except Exception as e:
        logger.error(f"Error sending WebSocket notification: {e}")
