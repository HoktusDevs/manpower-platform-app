"""
Handler para procesar archivos subidos a carpetas.
Se integra con el sistema de carpetas y archivos.
"""

import json
import logging
import boto3
from typing import Dict, Any
from datetime import datetime, timezone
from decimal import Decimal

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler para procesar archivos subidos a carpetas.
    
    Args:
        event: Evento de API Gateway
        context: Contexto de Lambda
        
    Returns:
        Dict: Resultado del procesamiento
    """
    try:
        logger.info(f"Folder file processor received event: {event}")
        
        # Obtener método HTTP
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        
        # Endpoint para procesar archivos de carpetas
        if path == '/api/v1/folders/process-file' and http_method == 'POST':
            return process_folder_file(event, context)
        
        # Endpoint para obtener estado de archivo
        elif path == '/api/v1/folders/file-status/{fileId}' and http_method == 'GET':
            return get_file_status(event, context)
        
        # Default response
        else:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Not found',
                    'path': path,
                    'method': http_method
                })
            }
            
    except Exception as e:
        logger.error(f"Error in folder file processor: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }

def process_folder_file(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Procesa un archivo subido a una carpeta.
    """
    try:
        # Parsear el cuerpo de la solicitud
        if not event.get('body'):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({'error': 'Request body is required'})
            }
        
        request_data = json.loads(event['body'])
        file_id = request_data.get('fileId')
        file_name = request_data.get('fileName')
        file_url = request_data.get('fileUrl')
        file_size = request_data.get('fileSize', 0)
        folder_id = request_data.get('folderId')
        user_id = request_data.get('userId')
        
        if not all([file_id, file_name, file_url, folder_id, user_id]):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({'error': 'fileId, fileName, fileUrl, folderId, and userId are required'})
            }
        
        logger.info(f"Procesando archivo {file_name} (ID: {file_id}) en carpeta {folder_id}")
        
        # Configurar servicios
        dynamodb = boto3.resource('dynamodb')
        files_table = dynamodb.Table('manpower-documents-dev')
        
        # PASO 1: Actualizar archivo con estado PROCESSING
        try:
            files_table.update_item(
                Key={'documentId': file_id, 'userId': user_id},
                UpdateExpression='SET #status = :status, updatedAt = :updatedAt',
                ExpressionAttributeNames={
                    '#status': 'status'
                },
                ExpressionAttributeValues={
                    ':status': 'processing',
                    ':updatedAt': datetime.now(timezone.utc).isoformat()
                }
            )
            logger.info(f"✅ Archivo {file_id} actualizado a estado 'processing'")
        except Exception as e:
            logger.error(f"Error actualizando archivo {file_id}: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({'error': 'Error updating file status', 'message': str(e)})
            }
        
        # PASO 2: Procesar archivo (simulado por ahora)
        try:
            # Simular procesamiento
            processing_result = simulate_file_processing(file_name, file_url, user_id)
            
            # PASO 3: Actualizar archivo con resultado
            # Convertir floats a Decimal para DynamoDB
            processing_result_for_db = convert_floats_to_decimal(processing_result)
            
            files_table.update_item(
                Key={'documentId': file_id, 'userId': user_id},
                UpdateExpression='SET #status = :status, processingResult = :result, updatedAt = :updatedAt',
                ExpressionAttributeNames={
                    '#status': 'status'
                },
                ExpressionAttributeValues={
                    ':status': processing_result['status'],
                    ':result': processing_result_for_db,
                    ':updatedAt': datetime.now(timezone.utc).isoformat()
                }
            )
            
            logger.info(f"✅ Archivo {file_id} procesado con resultado: {processing_result['status']}")
            
            # PASO 4: Enviar notificación WebSocket
            send_file_status_notification(file_id, processing_result, user_id)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'message': 'Archivo procesado exitosamente',
                    'fileId': file_id,
                    'status': processing_result['status'],
                    'result': processing_result
                })
            }
            
        except Exception as e:
            logger.error(f"Error procesando archivo {file_id}: {e}")
            
            # Actualizar archivo con estado de error
            files_table.update_item(
                Key={'documentId': file_id, 'userId': user_id},
                UpdateExpression='SET #status = :status, #error = :error, updatedAt = :updatedAt',
                ExpressionAttributeNames={
                    '#status': 'status',
                    '#error': 'error'
                },
                ExpressionAttributeValues={
                    ':status': 'error',
                    ':error': str(e),
                    ':updatedAt': datetime.now(timezone.utc).isoformat()
                }
            )
            
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({'error': 'Error processing file', 'message': str(e)})
            }
            
    except Exception as e:
        logger.error(f"Error in process_folder_file: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({'error': 'Internal server error', 'message': str(e)})
        }

def convert_floats_to_decimal(obj):
    """Convert float values to Decimal for DynamoDB compatibility"""
    if isinstance(obj, dict):
        return {k: convert_floats_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimal(item) for item in obj]
    elif isinstance(obj, float):
        return Decimal(str(obj))
    else:
        return obj

def simulate_file_processing(file_name: str, file_url: str, user_id: str) -> Dict[str, Any]:
    """
    Simula el procesamiento de un archivo.
    """
    try:
        # Simular análisis del archivo
        file_extension = file_name.lower().split('.')[-1]
        
        # Validaciones básicas
        valid_extensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'txt']
        is_valid_extension = file_extension in valid_extensions
        
        # Simular análisis de contenido
        content_analysis = {
            'has_text': True,
            'text_quality': 'high',
            'document_legibility': 'good',
            'confidence_score': 0.95
        }
        
        # Simular validación de datos
        validation_results = {
            'file_format_valid': is_valid_extension,
            'content_quality_valid': content_analysis['text_quality'] == 'high',
            'file_size_valid': True,
            'user_authorized': True
        }
        
        # Decidir aprobación/rechazo
        all_validations_passed = all(validation_results.values())
        final_status = 'completed' if all_validations_passed else 'failed'
        
        # Generar observaciones
        observations = []
        if not is_valid_extension:
            observations.append({
                'type': 'validation_error',
                'message': f'Tipo de archivo no soportado: {file_extension}',
                'severity': 'error'
            })
        
        if all_validations_passed:
            observations.append({
                'type': 'success',
                'message': 'Archivo procesado exitosamente',
                'severity': 'info'
            })
        
        return {
            'status': final_status,
            'fileType': file_extension.upper(),
            'contentAnalysis': content_analysis,
            'validationResults': validation_results,
            'observations': observations,
            'processedAt': datetime.now(timezone.utc).isoformat(),
            'processingTime': 2.5
        }
        
    except Exception as e:
        logger.error(f"Error in simulate_file_processing: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'processedAt': datetime.now(timezone.utc).isoformat()
        }

def get_file_status(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Obtiene el estado de un archivo.
    """
    try:
        # Extraer fileId del path
        path_parameters = event.get('pathParameters', {})
        file_id = path_parameters.get('fileId')
        
        if not file_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({'error': 'fileId is required'})
            }
        
        # Obtener archivo de DynamoDB
        dynamodb = boto3.resource('dynamodb')
        files_table = dynamodb.Table('manpower-documents-dev')
        
        response = files_table.get_item(Key={'documentId': file_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({'error': 'File not found'})
            }
        
        file_data = response['Item']
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'fileId': file_id,
                'status': file_data.get('status', 'unknown'),
                'processingResult': file_data.get('processingResult'),
                'updatedAt': file_data.get('updatedAt'),
                'error': file_data.get('error')
            })
        }
        
    except Exception as e:
        logger.error(f"Error in get_file_status: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({'error': 'Internal server error', 'message': str(e)})
        }

def send_file_status_notification(file_id: str, processing_result: Dict[str, Any], user_id: str) -> None:
    """
    Envía notificación WebSocket sobre el estado del archivo.
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
            'action': 'file_updated',
            'fileId': file_id,
            'file': {
                'documentId': file_id,
                'status': processing_result['status'],
                'processingResult': processing_result,
                'updatedAt': datetime.now(timezone.utc).isoformat()
            },
            'userId': user_id,
            'timestamp': datetime.now(timezone.utc).isoformat()
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
                logger.info(f"✅ File status notification sent to connection: {connection_id}")
                
            except Exception as e:
                logger.error(f"❌ Error sending to connection {connection_id}: {e}")
        
        logger.info(f"📤 Sent file status notifications to {successful_sends} connections")
        
    except Exception as e:
        logger.error(f"Error sending file status notification: {e}")
