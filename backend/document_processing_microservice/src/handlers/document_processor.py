"""
Handler de SQS para procesar documentos en Lambda.
"""

import json
import logging
from typing import Dict, Any, List

from src.services.document_processing_pipeline import DocumentProcessingPipeline
from src.utils.sqs_publisher import SQSPublisher
from src.utils.callback_client import CallbackClient
from src.services.websocket_service import WebSocketService

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Inicializar servicios
pipeline = DocumentProcessingPipeline()
callback_client = CallbackClient()
websocket_service = WebSocketService()


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
        url_response = message_body.get('url_response')
        
        logger.info(
            f"Procesando documento: {document_data.get('file_name', 'N/A')} "
            f"para {owner_user_name} (tipo: {processing_type})"
        )
        
        # Ejecutar pipeline de procesamiento
        result = pipeline.process_document(owner_user_name, document_data)
        
        # Agregar metadatos al resultado
        result_dict = result.model_dump()
        result_dict['owner_user_name'] = owner_user_name
        result_dict['processing_timestamp'] = context.aws_request_id
        result_dict['lambda_request_id'] = context.aws_request_id
        
        # Enviar resultado al callback
        logger.info(f"Enviando resultado de documento de plataforma al callback...")
        callback_success = callback_client.send_result(result_dict, url_override=url_response)
        
        # Notificar a clientes WebSocket sobre el resultado
        await notify_websocket_clients(result_dict, document_data, owner_user_name)
        
        if callback_success:
            logger.info(f"✅ Procesado exitosamente: {document_data.get('file_name', 'N/A')}")
        else:
            logger.warning(f"⚠️ Procesado pero falló envío de callback: {document_data.get('file_name', 'N/A')}")
        
        return {
            'success': True,
            'document_name': document_data.get('file_name', 'N/A'),
            'callback_sent': callback_success,
            'result': result_dict
        }
        
    except Exception as e:
        logger.error(f"Error procesando documento: {e}")
        
        # Crear resultado de error
        error_result = create_error_result(record, str(e))
        
        # Intentar enviar resultado de error
        try:
            callback_client.send_result(error_result, url_override=url_response)
        except Exception as callback_error:
            logger.error(f"Error enviando resultado de error: {callback_error}")
        
        # Notificar error a clientes WebSocket
        try:
            await notify_websocket_error(error_result, document_data, owner_user_name, str(e))
        except Exception as ws_error:
            logger.error(f"Error notificando error via WebSocket: {ws_error}")
        
        return {
            'success': False,
            'error': str(e),
            'error_result': error_result
        }


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


async def notify_websocket_clients(result_dict: Dict[str, Any], document_data: Dict[str, Any], owner_user_name: str) -> None:
    """
    Notifica a clientes WebSocket sobre el resultado exitoso del procesamiento.
    
    Args:
        result_dict: Resultado del procesamiento
        document_data: Datos del documento
        owner_user_name: Nombre del propietario
    """
    try:
        notification_data = {
            'documentId': document_data.get('platform_document_id'),
            'status': result_dict.get('processing_status', 'completed'),
            'processingStatus': result_dict.get('processing_status'),
            'finalDecision': result_dict.get('final_decision'),
            'documentType': result_dict.get('document_type'),
            'ocrResult': result_dict.get('ocr_result'),
            'extractedData': result_dict.get('data_structure'),
            'observations': result_dict.get('observations', []),
            'ownerUserName': owner_user_name,
            'fileName': document_data.get('file_name'),
            'processingTime': result_dict.get('total_processing_cost_usd', 0)
        }
        
        await websocket_service.notify_document_update(notification_data)
        logger.info(f"WebSocket notification sent for document: {document_data.get('platform_document_id')}")
        
    except Exception as e:
        logger.error(f"Error sending WebSocket notification: {e}")


async def notify_websocket_error(error_result: Dict[str, Any], document_data: Dict[str, Any], owner_user_name: str, error_message: str) -> None:
    """
    Notifica a clientes WebSocket sobre errores en el procesamiento.
    
    Args:
        error_result: Resultado de error
        document_data: Datos del documento
        owner_user_name: Nombre del propietario
        error_message: Mensaje de error
    """
    try:
        notification_data = {
            'documentId': document_data.get('platform_document_id'),
            'status': 'failed',
            'processingStatus': 'FAILED',
            'finalDecision': 'MANUAL_REVIEW',
            'documentType': error_result.get('document_type', 'Desconocido'),
            'error': error_message,
            'observations': error_result.get('observations', []),
            'ownerUserName': owner_user_name,
            'fileName': document_data.get('file_name'),
            'lambdaError': True
        }
        
        await websocket_service.notify_document_update(notification_data)
        logger.info(f"WebSocket error notification sent for document: {document_data.get('platform_document_id')}")
        
    except Exception as e:
        logger.error(f"Error sending WebSocket error notification: {e}")
