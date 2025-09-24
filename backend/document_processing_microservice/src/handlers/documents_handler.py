"""
Handler para obtener documentos de la base de datos.
"""

import json
import logging
import boto3
from decimal import Decimal
from typing import Dict, Any
from datetime import datetime, timezone

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Configurar DynamoDB
dynamodb = boto3.resource('dynamodb')
results_table = dynamodb.Table('document-processing-results-dev')

def convert_decimals(obj):
    """Convierte Decimal a float para serialización JSON"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    return obj

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler para obtener documentos de la base de datos.
    """
    try:
        logger.info(f"Documents handler received event: {event}")
        
        # Obtener método HTTP
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        
        if path == '/api/v1/documents' and http_method == 'GET':
            # Obtener todos los documentos
            response = results_table.scan()
            documents = response.get('Items', [])
            
            # Formatear documentos para el frontend
            formatted_documents = []
            for doc in documents:
                # Convertir Decimal a float
                doc_converted = convert_decimals(doc)
                formatted_documents.append({
                    'id': doc_converted.get('document_id'),
                    'fileName': doc_converted.get('file_name'),
                    'fileUrl': doc_converted.get('file_url'),
                    'ownerUserName': doc_converted.get('owner_user_name'),
                    'status': doc_converted.get('processing_status', 'UNKNOWN'),
                    'finalDecision': doc_converted.get('final_decision'),
                    'documentType': doc_converted.get('document_type'),
                    'ocrResult': doc_converted.get('ocr_result'),
                    'extractedData': doc_converted.get('data_structure'),
                    'observations': doc_converted.get('observations', []),
                    'createdAt': doc_converted.get('created_at'),
                    'error': doc_converted.get('error', False)
                })
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'data': formatted_documents,
                    'count': len(formatted_documents)
                })
            }
        
        elif '/api/v1/documents/update-decision/' in path and http_method == 'POST':
            # Actualizar decisión del documento
            document_id = path.split('/')[-1]
            
            if not document_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'Document ID is required'
                    })
                }
            
            # Parse request body
            try:
                body = json.loads(event.get('body', '{}'))
                new_decision = body.get('decision')
                
                if not new_decision or new_decision not in ['APPROVED', 'REJECTED', 'MANUAL_REVIEW']:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'error': 'Valid decision (APPROVED, REJECTED, MANUAL_REVIEW) is required'
                        })
                    }
                
                logger.info(f"Updating document {document_id} decision to: {new_decision}")
                
                # Update document decision
                results_table.update_item(
                    Key={'document_id': document_id},
                    UpdateExpression='SET final_decision = :decision, updated_at = :updated_at',
                    ExpressionAttributeValues={
                        ':decision': new_decision,
                        ':updated_at': datetime.now(timezone.utc).isoformat()
                    }
                )
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'success': True,
                        'message': f'Document decision updated to {new_decision}',
                        'documentId': document_id,
                        'newDecision': new_decision
                    })
                }
                
            except json.JSONDecodeError:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'Invalid JSON in request body'
                    })
                }
                
            except Exception as e:
                logger.error(f"Error updating document decision: {e}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'Failed to update document decision',
                        'message': str(e)
                    })
                }
        
        elif '/api/v1/documents/delete/' in path and http_method == 'POST':
            # Eliminar documento
            document_id = path.split('/')[-1]
            
            if not document_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'Document ID is required'
                    })
                }
            
            logger.info(f"Deleting document: {document_id}")
            
            try:
                # Verificar que el documento existe
                response = results_table.get_item(Key={'document_id': document_id})
                if 'Item' not in response:
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'error': 'Document not found'
                        })
                    }
                
                # Eliminar el documento
                results_table.delete_item(Key={'document_id': document_id})
                logger.info(f"Document {document_id} deleted successfully")
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'success': True,
                        'message': 'Document deleted successfully',
                        'documentId': document_id
                    })
                }
                
            except Exception as e:
                logger.error(f"Error deleting document {document_id}: {e}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'Error deleting document',
                        'message': str(e)
                    })
                }
        
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
        logger.error(f"Error in documents handler: {e}")
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
