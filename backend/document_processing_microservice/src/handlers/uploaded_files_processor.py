"""
Handler para procesar archivos subidos manualmente desde /admin/folders.
Escucha DynamoDB Stream de manpower-documents-{stage}.
"""

import json
import logging
import os
from typing import Dict, Any
from datetime import datetime, timezone
from decimal import Decimal

import boto3

from src.services.document_processing_pipeline import DocumentProcessingPipeline
from src.services.websocket_service import WebSocketService

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Inicializar servicios
pipeline = DocumentProcessingPipeline()
websocket_service = WebSocketService()
dynamodb = boto3.resource('dynamodb')

# Stage dinámico
stage = os.getenv('STAGE', 'dev')
results_table = dynamodb.Table(f'document-processing-results-{stage}')


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler de DynamoDB Stream para procesar archivos subidos manualmente.

    Args:
        event: Evento de DynamoDB Stream
        context: Contexto de Lambda

    Returns:
        Dict: Resultado del procesamiento
    """
    try:
        logger.info(f"📥 Procesando {len(event.get('Records', []))} registros de DynamoDB Stream")

        processed_count = 0
        skipped_count = 0
        failed_count = 0

        for record in event.get('Records', []):
            try:
                # Solo procesar INSERT (nuevos archivos)
                event_name = record.get('eventName')

                if event_name != 'INSERT':
                    logger.info(f"⏭️ Saltando evento {event_name} (solo procesamos INSERT)")
                    skipped_count += 1
                    continue

                # Obtener datos del nuevo item
                new_image = record.get('dynamodb', {}).get('NewImage', {})

                if not new_image:
                    logger.warning("⚠️ Record sin NewImage, saltando...")
                    skipped_count += 1
                    continue

                # Parsear DynamoDB item
                document_data = parse_dynamodb_item(new_image)

                # Verificar que tenga los campos necesarios
                if not document_data.get('fileUrl') or not document_data.get('fileName'):
                    logger.warning(f"⚠️ Documento sin fileUrl o fileName, saltando: {document_data}")
                    skipped_count += 1
                    continue

                # Obtener información del propietario (folderId → folder → owner)
                owner_user_name = get_owner_from_folder(document_data.get('folderId'))

                if not owner_user_name:
                    logger.warning(f"⚠️ No se pudo determinar propietario del documento, usando 'Unknown'")
                    owner_user_name = 'Unknown User'

                logger.info(f"🔄 Procesando archivo: {document_data['fileName']} (Owner: {owner_user_name})")

                # Preparar documento para el pipeline
                pipeline_document = {
                    'file_url': document_data['fileUrl'],
                    'file_name': document_data['fileName'],
                    'platform_document_id': document_data.get('id', document_data.get('fileId', 'unknown'))
                }

                # 🔴 NOTIFICACIÓN WEBSOCKET: Procesamiento iniciado
                try:
                    import asyncio
                    asyncio.run(websocket_service.notify_document_update({
                        'documentId': document_data.get('id', document_data.get('fileId', 'unknown')),
                        'status': 'processing_started',
                        'processingStatus': 'PROCESSING',
                        'fileName': document_data['fileName'],
                        'owner': owner_user_name,
                        'message': f'Iniciando procesamiento de {document_data["fileName"]}'
                    }))
                    logger.info(f"📡 WebSocket notificado: procesamiento iniciado para {document_data['fileName']}")
                except Exception as ws_error:
                    logger.warning(f"⚠️ Error enviando notificación WebSocket (inicio): {ws_error}")
                    # No detener el procesamiento si falla WebSocket

                # Ejecutar pipeline de procesamiento
                result = pipeline.process_document(owner_user_name, pipeline_document)

                # Convertir resultado a dict
                result_dict = result.model_dump()

                # Convertir floats a Decimal para DynamoDB
                if 'total_processing_cost_usd' in result_dict:
                    result_dict['total_processing_cost_usd'] = Decimal(str(result_dict['total_processing_cost_usd']))

                # Guardar resultado en document-processing-results
                result_document_id = save_processing_result(result_dict, document_data, owner_user_name)

                # Actualizar status en manpower-documents
                update_source_document_status(document_data, result_dict, result_document_id)

                processed_count += 1
                logger.info(f"✅ Archivo procesado exitosamente: {document_data['fileName']}")

            except Exception as e:
                failed_count += 1
                logger.error(f"❌ Error procesando record: {e}")
                import traceback
                logger.error(traceback.format_exc())

        logger.info(f"📊 Resumen: {processed_count} procesados, {skipped_count} saltados, {failed_count} fallidos")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Procesamiento completado',
                'processed': processed_count,
                'skipped': skipped_count,
                'failed': failed_count
            })
        }

    except Exception as e:
        logger.error(f"❌ Error general en handler: {e}")
        import traceback
        logger.error(traceback.format_exc())

        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }


def parse_dynamodb_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parsea un item de DynamoDB Stream al formato normal.

    Args:
        item: Item en formato DynamoDB Stream

    Returns:
        Dict: Item parseado
    """
    def parse_value(value: Dict[str, Any]) -> Any:
        """Parsea un valor de DynamoDB."""
        if 'S' in value:  # String
            return value['S']
        elif 'N' in value:  # Number
            return float(value['N'])
        elif 'BOOL' in value:  # Boolean
            return value['BOOL']
        elif 'NULL' in value:  # Null
            return None
        elif 'M' in value:  # Map
            return {k: parse_value(v) for k, v in value['M'].items()}
        elif 'L' in value:  # List
            return [parse_value(v) for v in value['L']]
        else:
            return None

    return {key: parse_value(value) for key, value in item.items()}


def get_owner_from_folder(folder_id: str) -> str:
    """
    Obtiene el nombre del propietario desde el folderId.

    Args:
        folder_id: ID de la carpeta

    Returns:
        str: Nombre del propietario o None
    """
    if not folder_id:
        return None

    try:
        folders_table = dynamodb.Table(f'manpower-folders-{stage}')

        response = folders_table.get_item(Key={'id': folder_id})
        folder = response.get('Item')

        if folder:
            # Intentar obtener el nombre de la carpeta como owner
            folder_name = folder.get('name', '')

            # Si la carpeta tiene un campo de owner, usarlo
            if 'owner' in folder:
                return folder['owner']

            # Si no, usar el nombre de la carpeta como aproximación
            return folder_name

        return None

    except Exception as e:
        logger.error(f"Error obteniendo folder {folder_id}: {e}")
        return None


def save_processing_result(result_dict: Dict[str, Any], document_data: Dict[str, Any], owner_user_name: str) -> str:
    """
    Guarda el resultado del procesamiento en DynamoDB.

    Args:
        result_dict: Resultado del pipeline
        document_data: Datos del documento original
        owner_user_name: Nombre del propietario

    Returns:
        str: ID del documento guardado
    """
    try:
        document_id = result_dict.get('platform_document_id', document_data.get('id', 'unknown'))

        # Construir update expression dinámicamente
        update_values = {
            ':status': result_dict['processing_status'],
            ':decision': result_dict['final_decision'],
            ':type': result_dict.get('document_type') or 'Desconocido',
            ':data': result_dict.get('data_structure') or {},
            ':observations': result_dict.get('observations') or [],
            ':cost': result_dict.get('total_processing_cost_usd', Decimal('0.0')),
            ':owner': owner_user_name,
            ':file_name': document_data.get('fileName', 'unknown'),
            ':file_url': document_data.get('fileUrl', ''),
            ':created_at': datetime.now(timezone.utc).isoformat(),
            ':ttl': int(datetime.now(timezone.utc).timestamp()) + (30 * 24 * 60 * 60)
        }

        update_expr = (
            'SET processing_status = :status, '
            'final_decision = :decision, '
            'document_type = :type, '
            'data_structure = :data, '
            'observations = :observations, '
            'total_processing_cost_usd = :cost, '
            'owner_user_name = :owner, '
            'file_name = :file_name, '
            'file_url = :file_url, '
            'created_at = :created_at, '
            'ttl = :ttl'
        )

        # Agregar campos opcionales
        if result_dict.get('expiration_date') is not None:
            update_expr += ', expiration_date = :expiration'
            update_values[':expiration'] = result_dict['expiration_date']

        if result_dict.get('classification_method') is not None:
            update_expr += ', classification_method = :method'
            update_values[':method'] = result_dict['classification_method']

        if result_dict.get('classification_by_ia') is not None:
            update_expr += ', classification_by_ia = :ia_class'
            update_values[':ia_class'] = result_dict['classification_by_ia']

        # Guardar en DynamoDB
        results_table.put_item(Item={
            'document_id': document_id,
            **{k.lstrip(':'): v for k, v in update_values.items()}
        })

        logger.info(f"💾 Resultado guardado en document-processing-results-{stage}")
        return document_id

    except Exception as e:
        logger.error(f"Error guardando resultado: {e}")
        raise


def update_source_document_status(document_data: Dict[str, Any], result_dict: Dict[str, Any], result_document_id: str) -> None:
    """
    Actualiza el status del documento original en manpower-documents.

    Args:
        document_data: Datos del documento original
        result_dict: Resultado del procesamiento
        result_document_id: ID del resultado en document-processing-results
    """
    try:
        source_document_id = document_data.get('id') or document_data.get('fileId')

        if not source_document_id:
            logger.warning("⚠️ No se pudo obtener ID del documento fuente, no se actualizará status")
            return

        documents_table = dynamodb.Table(f'manpower-documents-{stage}')

        # Mapear decisión final a status
        final_decision = result_dict.get('final_decision')
        processing_status = result_dict.get('processing_status')

        # Determinar status a guardar
        if processing_status == 'COMPLETED':
            status = final_decision  # APPROVED, REJECTED, MANUAL_REVIEW
        elif processing_status == 'FAILED':
            status = 'FAILED'
        else:
            status = 'PROCESSING'

        # Preparar observaciones en formato simple
        observations = result_dict.get('observations', [])
        observations_summary = []

        for obs in observations:
            if isinstance(obs, dict):
                observations_summary.append({
                    'message': obs.get('razon', obs.get('message', 'Sin detalle')),
                    'severity': obs.get('capa', 'info')
                })

        # Actualizar documento original
        documents_table.update_item(
            Key={'id': source_document_id},
            UpdateExpression=(
                'SET #status = :status, '
                'processing_result_id = :result_id, '
                'document_type = :doc_type, '
                'final_decision = :decision, '
                'processing_observations = :observations, '
                'processed_at = :processed_at'
            ),
            ExpressionAttributeNames={
                '#status': 'status'
            },
            ExpressionAttributeValues={
                ':status': status,
                ':result_id': result_document_id,
                ':doc_type': result_dict.get('document_type', 'Desconocido'),
                ':decision': final_decision,
                ':observations': observations_summary,
                ':processed_at': datetime.now(timezone.utc).isoformat()
            }
        )

        logger.info(f"✅ Status actualizado en manpower-documents-{stage}: {source_document_id} → {status}")

    except Exception as e:
        logger.error(f"❌ Error actualizando status del documento fuente: {e}")
        # No hacer raise - el procesamiento fue exitoso, solo falló la actualización del status
        logger.warning("⚠️ El documento fue procesado correctamente pero no se pudo actualizar el status en la tabla original")
