"""
Handler para eliminar documentos de la base de datos.
"""

import json
import logging
import boto3
from typing import Dict, Any

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Configurar DynamoDB
dynamodb = boto3.resource('dynamodb')
results_table = dynamodb.Table('document-processing-results-dev')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler para eliminar documentos de la base de datos.
    """
    try:
        logger.info(f"Delete document handler received event: {event}")
        
        # Obtener método HTTP
        http_method = event.get('httpMethod', 'DELETE')
        path = event.get('path', '')
        
        if '/api/v1/documents/delete/' in path and http_method == 'POST':
            # Extraer document ID de la ruta
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
            
            # Verificar que el documento existe
            try:
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
        logger.error(f"Error in delete document handler: {e}")
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
