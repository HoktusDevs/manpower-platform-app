"""
Handler de API Gateway para el procesamiento de documentos en Lambda.
"""

import json
import logging
from typing import Dict, Any

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler principal de API Gateway para procesamiento de documentos.
    Versión simplificada para pruebas.
    """
    try:
        logger.info(f"API Handler received event: {event}")
        
        # Obtener método HTTP
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        
        # Health check endpoint
        if path == '/api/v1/health' and http_method == 'GET':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'status': 'healthy',
                    'service': 'document-processing-microservice',
                    'timestamp': context.aws_request_id
                })
            }
        
        # Process documents endpoint
        elif path == '/api/v1/platform/process-documents-platform' and http_method == 'POST':
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
            owner_user_name = request_data.get('owner_user_name')
            documents = request_data.get('documents', [])
            
            if not owner_user_name or not documents:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({'error': 'owner_user_name and documents are required'})
                }
            
            logger.info(f"Procesando {len(documents)} documentos para {owner_user_name}")
            
            # Procesar documentos con WebSocket (sin dependencias complejas por ahora)
            try:
                import boto3
                from datetime import datetime, timezone
                import asyncio
                
                # Configurar servicios básicos
                dynamodb = boto3.resource('dynamodb')
                results_table = dynamodb.Table('document-processing-results-dev')
                
                # Procesar cada documento
                for doc in documents:
                    try:
                        # Simular procesamiento (por ahora)
                        logger.info(f"Procesando documento: {doc['file_name']}")
                        
                        # Crear resultado simulado
                        from decimal import Decimal
                        result_dict = {
                            'document_id': doc['platform_document_id'],
                            'file_name': doc['file_name'],
                            'file_url': doc['file_url'],
                            'owner_user_name': owner_user_name,
                            'processing_status': 'COMPLETED',
                            'final_decision': 'APPROVED',
                            'document_type': 'PDF',
                            'ocr_result': {
                                'text': 'Texto extraído del documento',
                                'confidence': Decimal('0.95')
                            },
                            'data_structure': {
                                'name': 'Usuario Test',
                                'document_number': '12345678'
                            },
                            'observations': [],
                            'created_at': datetime.now(timezone.utc).isoformat(),
                            'ttl': int(datetime.now(timezone.utc).timestamp()) + (30 * 24 * 60 * 60)
                        }
                        
                        # Guardar en DynamoDB
                        results_table.put_item(Item=result_dict)
                        logger.info(f"Documento {doc['platform_document_id']} guardado en DynamoDB")
                        
                        # Enviar notificación WebSocket
                        try:
                            import requests
                            websocket_notify_url = "https://sr4qzksrak.execute-api.us-east-1.amazonaws.com/dev/api/v1/websocket/notify"
                            notification_data = {
                                'documentId': doc['platform_document_id'],
                                'status': 'completed',
                                'processingStatus': 'COMPLETED',
                                'finalDecision': 'APPROVED',
                                'documentType': 'PDF',
                                'ocrResult': result_dict['ocr_result'],
                                'extractedData': result_dict['data_structure'],
                                'observations': [],
                                'ownerUserName': owner_user_name,
                                'fileName': doc['file_name'],
                                'message': 'Procesamiento completado'
                            }
                            
                            response = requests.post(websocket_notify_url, json=notification_data)
                            logger.info(f"WebSocket notification sent: {response.status_code}")
                        except Exception as e:
                            logger.error(f"Error sending WebSocket notification: {e}")
                        
                    except Exception as e:
                        logger.error(f"Error procesando documento {doc['platform_document_id']}: {e}")
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'message': 'Documentos procesados exitosamente',
                        'status': 'success',
                        'owner_user_name': owner_user_name,
                        'document_count': len(documents),
                        'batch_id': context.aws_request_id
                    })
                }
                
            except Exception as e:
                logger.error(f"Error en procesamiento: {e}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Error en procesamiento',
                        'message': str(e)
                    })
                }
        
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
            
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in request: {e}")
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except Exception as e:
        logger.error(f"Error en API handler: {e}")
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