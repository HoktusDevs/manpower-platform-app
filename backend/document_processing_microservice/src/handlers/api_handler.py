"""
Handler de API Gateway para el procesamiento de documentos en Lambda.
"""

import json
import logging
from typing import Dict, Any
from datetime import datetime, timezone
from decimal import Decimal

import boto3

# Ya no necesitamos el pipeline aquí - se ejecuta en document_processor
# from src.services.document_processing_pipeline import DocumentProcessingPipeline

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Inicializar servicios (con validación)
def initialize_services():
    """Inicializa y valida los servicios necesarios."""
    import os

    # Validar SQS Queue URL
    queue_url = os.getenv('DOCUMENT_PROCESSING_QUEUE_URL')
    if not queue_url:
        logger.error("❌ DOCUMENT_PROCESSING_QUEUE_URL no configurada")
        raise ValueError("DOCUMENT_PROCESSING_QUEUE_URL es requerida")

    try:
        # Inicializar clientes AWS
        sqs_client = boto3.client('sqs')
        dynamodb = boto3.resource('dynamodb')

        # Usar stage dinámico
        stage = os.getenv('STAGE', 'dev')
        table_name = f'document-processing-results-{stage}'
        results_table = dynamodb.Table(table_name)

        logger.info("✅ Servicios inicializados correctamente (modo asíncrono con SQS)")
        logger.info(f"   - SQS Queue: {queue_url}")
        logger.info(f"   - DynamoDB Table: {table_name}")

        return sqs_client, results_table, queue_url
    except Exception as e:
        logger.error(f"❌ Error inicializando servicios: {e}")
        raise

# Inicializar una sola vez (cold start)
try:
    sqs_client, results_table, queue_url = initialize_services()
except Exception as init_error:
    logger.error(f"CRITICAL: No se pudieron inicializar servicios: {init_error}")
    sqs_client = None
    results_table = None
    queue_url = None

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler principal de API Gateway para procesamiento de documentos.
    Encola documentos en SQS para procesamiento asíncrono.
    """
    # Validar que los servicios estén inicializados
    if sqs_client is None or results_table is None or queue_url is None:
        logger.error("Servicios no inicializados - no se puede procesar")
        return {
            'statusCode': 503,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Service Unavailable',
                'message': 'Los servicios no están correctamente inicializados. Verifica las variables de entorno.'
            })
        }

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
            
            logger.info(f"Encolando {len(documents)} documentos para {owner_user_name}")

            # Encolar documentos en SQS para procesamiento asíncrono
            try:
                enqueued_count = 0
                failed_count = 0
                batch_id = context.aws_request_id

                for index, doc in enumerate(documents):
                    try:
                        document_id = doc.get('platform_document_id', f'doc_{batch_id}_{index}')
                        logger.info(f"📬 Encolando documento: {doc['file_name']} (ID: {document_id})")

                        # PASO 1: Guardar documento con estado QUEUED
                        initial_record = {
                            'document_id': document_id,
                            'file_name': doc['file_name'],
                            'file_url': doc['file_url'],
                            'file_size': doc.get('file_size', 0),
                            'owner_user_name': owner_user_name,
                            'processing_status': 'QUEUED',
                            'final_decision': None,
                            'document_type': None,
                            'ocr_result': None,
                            'data_structure': None,
                            'observations': [],
                            'batch_id': batch_id,
                            'created_at': datetime.now(timezone.utc).isoformat(),
                            'ttl': int(datetime.now(timezone.utc).timestamp()) + (30 * 24 * 60 * 60)
                        }

                        results_table.put_item(Item=initial_record)
                        logger.info(f"✅ Documento {document_id} guardado con estado QUEUED")

                        # PASO 2: Encolar mensaje en SQS
                        message_body = {
                            'owner_user_name': owner_user_name,
                            'document_data': {
                                'platform_document_id': document_id,
                                'file_name': doc['file_name'],
                                'file_url': doc['file_url'],
                                'file_size': doc.get('file_size', 0)
                            },
                            'processing_type': 'platform_document',
                            'batch_id': batch_id,
                            'document_index': index,
                            'enqueued_at': datetime.now(timezone.utc).isoformat()
                        }

                        sqs_response = sqs_client.send_message(
                            QueueUrl=queue_url,
                            MessageBody=json.dumps(message_body),
                            MessageAttributes={
                                'owner_user_name': {
                                    'StringValue': owner_user_name,
                                    'DataType': 'String'
                                },
                                'document_type': {
                                    'StringValue': 'platform_document',
                                    'DataType': 'String'
                                }
                            }
                        )

                        logger.info(f"📨 Documento encolado en SQS - MessageId: {sqs_response['MessageId']}")
                        enqueued_count += 1

                    except Exception as e:
                        failed_count += 1
                        logger.error(f"❌ Error encolando documento {doc.get('platform_document_id', 'unknown')}: {e}")

                        # Guardar error en DynamoDB
                        try:
                            error_record = {
                                'document_id': doc.get('platform_document_id', f'error_{batch_id}_{failed_count}'),
                                'file_name': doc.get('file_name', 'unknown'),
                                'file_url': doc.get('file_url', ''),
                                'owner_user_name': owner_user_name,
                                'processing_status': 'FAILED',
                                'final_decision': 'MANUAL_REVIEW',
                                'document_type': 'Desconocido',
                                'observations': [{
                                    'capa': 'API_HANDLER',
                                    'razon': f'Error encolando documento: {str(e)}',
                                    'regla': 'Error de Encolamiento'
                                }],
                                'batch_id': batch_id,
                                'created_at': datetime.now(timezone.utc).isoformat(),
                                'ttl': int(datetime.now(timezone.utc).timestamp()) + (30 * 24 * 60 * 60)
                            }
                            results_table.put_item(Item=error_record)
                        except Exception as db_error:
                            logger.error(f"Error guardando error en DynamoDB: {db_error}")
                
                # Responder inmediatamente - procesamiento será asíncrono
                logger.info(f"✅ Encolamiento completado: {enqueued_count} encolados, {failed_count} fallidos")

                return {
                    'statusCode': 202,  # 202 Accepted - procesamiento asíncrono
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'message': 'Documentos encolados exitosamente para procesamiento asíncrono',
                        'status': 'accepted',
                        'owner_user_name': owner_user_name,
                        'enqueued': enqueued_count,
                        'failed': failed_count,
                        'total': len(documents),
                        'batch_id': batch_id,
                        'note': 'Los documentos serán procesados en segundo plano. Recibirás notificaciones WebSocket con el progreso.'
                    })
                }
                
            except Exception as e:
                logger.error(f"Error en encolamiento: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    'body': json.dumps({
                        'error': 'Error encolando documentos',
                        'message': str(e),
                        'note': 'Verifica que DOCUMENT_PROCESSING_QUEUE_URL esté configurada'
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