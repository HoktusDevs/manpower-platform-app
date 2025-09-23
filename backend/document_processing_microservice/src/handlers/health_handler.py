"""
Handler de health check para Lambda.
"""

import json
import logging
from typing import Dict, Any

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler de health check simple.
    
    Args:
        event: Evento de API Gateway
        context: Contexto de Lambda
        
    Returns:
        Dict: Resultado del health check
    """
    try:
        logger.info("Ejecutando health check")
        
        # Verificar métricas básicas
        health_status = {
            'timestamp': context.aws_request_id,
            'lambda_runtime': 'healthy',
            'memory_used_mb': context.memory_limit_in_mb,
            'remaining_time_ms': context.get_remaining_time_in_millis(),
            'service': 'document-processing-microservice'
        }
        
        logger.info("Health check exitoso")
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'healthy',
                'details': health_status
            })
        }
            
    except Exception as e:
        logger.error(f"Error en health check: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'error',
                'error': str(e)
            })
        }