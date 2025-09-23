"""
Handler de SQS para procesar documentos en Lambda.
"""

import json
import logging
from typing import Dict, Any, List
import boto3
from datetime import datetime, timezone

from src.services.document_processing_pipeline import DocumentProcessingPipeline
from src.services.websocket_service import WebSocketService

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Inicializar servicios
pipeline = DocumentProcessingPipeline()
websocket_service = WebSocketService()

# Configurar DynamoDB
dynamodb = boto3.resource('dynamodb')
results_table = dynamodb.Table('document-processing-results-dev')  # Ajustar según el stage


async def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler principal de SQS para procesar documentos.
    
    Args:
        event: Evento de SQS
        context: Contexto de Lambda
        
    Returns:
        Dict: Resultado del procesamiento
    """
    try:
        logger.info(f"Procesando {len(event.get('Records', []))} mensajes de SQS")
        
        # Procesar cada record de SQS
        results = []
        for record in event.get('Records', []):
            try:
                result = await process_single_document(record, context)
                results.append(result)
            except Exception as e:
                logger.error(f"Error procesando record: {e}")
                results.append({
                    'success': False,
                    'error': str(e),
                    'record_id': record.get('messageId', 'unknown')
                })
        
        # Retornar resumen
        successful = sum(1 for r in results if r.get('success', False))
        failed = len(results) - successful
        
        logger.info(f"Procesamiento completado: {successful} exitosos, {failed} fallidos")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'processed': len(results),
                'successful': successful,
                'failed': failed
            })
        }
        
    except Exception as e:
        logger.error(f"Error inesperado en document processor: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }


async def process_single_document(record: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Procesa un único documento desde un record de SQS.
    
    Args:
        record: Record de SQS
        context: Contexto de Lambda
        
    Returns:
        Dict: Resultado del procesamiento
    """
    try:
        # Extraer datos del mensaje
        message_body = json.loads(record['body'])
        owner_user_name = message_body.get('owner_user_name')
        document_data = message_body.get('document_data')
        processing_type = message_body.get('processing_type', 'default')
        batch_id = message_body.get('batch_id')
        document_index = message_body.get('document_index', 0)
        
        document_id = document_data.get('platform_document_id', f'doc_{document_index}')
        
        logger.info(
            f"Procesando documento: {document_data.get('file_name', 'N/A')} "
            f"para {owner_user_name} (tipo: {processing_type})"
        )
        
        # Notificar inicio del procesamiento
        await websocket_service.notify_document_update({
            'documentId': document_id,
            'status': 'processing',
            'processingStatus': 'PROCESSING',
            'message': f'Iniciando procesamiento de {document_data.get("file_name", "N/A")}',
            'ownerUserName': owner_user_name,
            'fileName': document_data.get('file_name'),
            'timestamp': context.aws_request_id
        })
        
        # Notificar OCR en progreso
        await websocket_service.notify_document_update({
            'documentId': document_id,
            'status': 'processing',
            'processingStatus': 'OCR_IN_PROGRESS',
            'message': 'Ejecutando OCR...',
            'ownerUserName': owner_user_name,
            'fileName': document_data.get('file_name'),
            'timestamp': context.aws_request_id
        })
        
        # Ejecutar pipeline de procesamiento
        result = pipeline.process_document(owner_user_name, document_data)
        
        # Notificar clasificación IA
        await websocket_service.notify_document_update({
            'documentId': document_id,
            'status': 'processing',
            'processingStatus': 'AI_CLASSIFICATION',
            'message': 'Clasificando con IA...',
            'ownerUserName': owner_user_name,
            'fileName': document_data.get('file_name'),
            'timestamp': context.aws_request_id
        })
        
        # Agregar metadatos al resultado
        result_dict = result.model_dump()
        result_dict['owner_user_name'] = owner_user_name
        result_dict['processing_timestamp'] = context.aws_request_id
        result_dict['lambda_request_id'] = context.aws_request_id
        result_dict['batch_id'] = batch_id
        result_dict['document_index'] = document_index
        
        # Almacenar resultado en DynamoDB
        await store_result_in_db(result_dict, document_data, owner_user_name)
        
        # Notificar extracción de datos
        await websocket_service.notify_document_update({
            'documentId': document_id,
            'status': 'processing',
            'processingStatus': 'DATA_EXTRACTION',
            'message': 'Extrayendo datos estructurados...',
            'ownerUserName': owner_user_name,
            'fileName': document_data.get('file_name'),
            'timestamp': context.aws_request_id
        })
        
        # Notificar resultado final
        await websocket_service.notify_document_update({
            'documentId': document_id,
            'status': 'completed',
            'processingStatus': result_dict.get('processing_status', 'COMPLETED'),
            'finalDecision': result_dict.get('final_decision'),
            'documentType': result_dict.get('document_type'),
            'ocrResult': result_dict.get('ocr_result'),
            'extractedData': result_dict.get('data_structure'),
            'observations': result_dict.get('observations', []),
            'message': f'Procesamiento completado: {result_dict.get("final_decision", "UNKNOWN")}',
            'ownerUserName': owner_user_name,
            'fileName': document_data.get('file_name'),
            'processingTime': result_dict.get('total_processing_cost_usd', 0),
            'timestamp': context.aws_request_id
        })
        
        logger.info(f"✅ Procesado exitosamente: {document_data.get('file_name', 'N/A')}")
        
        return {
            'success': True,
            'document_name': document_data.get('file_name', 'N/A'),
            'document_id': document_id,
            'result': result_dict
        }
        
    except Exception as e:
        logger.error(f"Error procesando documento: {e}")
        
        # Crear resultado de error
        error_result = create_error_result(record, str(e))
        
        # Almacenar error en DB
        await store_error_in_db(error_result, document_data, owner_user_name)
        
        # Notificar error a clientes WebSocket
        try:
            await websocket_service.notify_document_update({
                'documentId': document_data.get('platform_document_id', 'unknown'),
                'status': 'failed',
                'processingStatus': 'FAILED',
                'finalDecision': 'MANUAL_REVIEW',
                'documentType': error_result.get('document_type', 'Desconocido'),
                'error': str(e),
                'observations': error_result.get('observations', []),
                'message': f'Error en procesamiento: {str(e)}',
                'ownerUserName': owner_user_name,
                'fileName': document_data.get('file_name'),
                'lambdaError': True,
                'timestamp': context.aws_request_id
            })
        except Exception as ws_error:
            logger.error(f"Error notificando error via WebSocket: {ws_error}")
        
        return {
            'success': False,
            'error': str(e),
            'error_result': error_result
        }


async def store_result_in_db(result_dict: Dict[str, Any], document_data: Dict[str, Any], owner_user_name: str) -> None:
    """
    Almacena el resultado del procesamiento en DynamoDB.
    
    Args:
        result_dict: Resultado del procesamiento
        document_data: Datos del documento
        owner_user_name: Nombre del propietario
    """
    try:
        item = {
            'document_id': document_data.get('platform_document_id'),
            'owner_user_name': owner_user_name,
            'file_name': document_data.get('file_name'),
            'file_url': document_data.get('file_url'),
            'processing_result': result_dict,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'ttl': int(datetime.now(timezone.utc).timestamp()) + (30 * 24 * 60 * 60)  # TTL 30 días
        }
        
        results_table.put_item(Item=item)
        logger.info(f"Resultado almacenado en DB para documento: {document_data.get('platform_document_id')}")
        
    except Exception as e:
        logger.error(f"Error almacenando resultado en DB: {e}")


async def store_error_in_db(error_result: Dict[str, Any], document_data: Dict[str, Any], owner_user_name: str) -> None:
    """
    Almacena el error del procesamiento en DynamoDB.
    
    Args:
        error_result: Resultado de error
        document_data: Datos del documento
        owner_user_name: Nombre del propietario
    """
    try:
        item = {
            'document_id': document_data.get('platform_document_id'),
            'owner_user_name': owner_user_name,
            'file_name': document_data.get('file_name'),
            'file_url': document_data.get('file_url'),
            'processing_result': error_result,
            'error': True,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'ttl': int(datetime.now(timezone.utc).timestamp()) + (30 * 24 * 60 * 60)  # TTL 30 días
        }
        
        results_table.put_item(Item=item)
        logger.info(f"Error almacenado en DB para documento: {document_data.get('platform_document_id')}")
        
    except Exception as e:
        logger.error(f"Error almacenando error en DB: {e}")


def create_error_result(record: Dict[str, Any], error_message: str) -> Dict[str, Any]:
    """
    Crea un resultado de error para documentos que fallaron.
    
    Args:
        record: Record de SQS
        error_message: Mensaje de error
        
    Returns:
        Dict: Resultado de error
    """
    try:
        message_body = json.loads(record['body'])
        document_data = message_body.get('document_data', {})
        owner_user_name = message_body.get('owner_user_name', 'Unknown')
        
        return {
            'platform_document_id': document_data.get('platform_document_id'),
            'original_file_name': document_data.get('file_name', 'Unknown'),
            'file_url': document_data.get('file_url', ''),
            'document_type': 'Desconocido',
            'classification_method': 'UNKNOWN',
            'classification_by_ia': None,
            'configured_document_type': None,
            'data_structure': None,
            'expiration_date': None,
            'total_processing_cost_usd': 0.0,
            'final_decision': 'MANUAL_REVIEW',
            'observations': [
                {
                    'capa': 'LAMBDA_PROCESSOR',
                    'razon': f'Error en procesamiento Lambda: {error_message}',
                    'regla': 'Fallo del Procesador Lambda',
                }
            ],
            'processing_status': 'FAILED',
            'owner_user_name': owner_user_name,
            'processing_timestamp': record.get('attributes', {}).get('SentTimestamp'),
            'lambda_error': True
        }
        
    except Exception as e:
        logger.error(f"Error creando resultado de error: {e}")
        return {
            'original_file_name': 'Unknown',
            'file_url': '',
            'document_type': 'Desconocido',
            'final_decision': 'MANUAL_REVIEW',
            'processing_status': 'FAILED',
            'owner_user_name': 'Unknown',
            'observations': [
                {
                    'capa': 'LAMBDA_PROCESSOR',
                    'razon': f'Error crítico: {error_message}',
                    'regla': 'Fallo Crítico del Procesador',
                }
            ],
            'lambda_error': True
        }