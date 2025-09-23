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
    
    Args:
        event: Evento de API Gateway
        context: Contexto de Lambda
        
    Returns:
        Dict: Respuesta de API Gateway
    """
    try:
        logger.info("Procesando request de API Gateway")
        
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
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Document processing endpoint ready',
                    'status': 'success',
                    'timestamp': context.aws_request_id
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
            
    except Exception as e:
        logger.error(f"Error en API handler: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }