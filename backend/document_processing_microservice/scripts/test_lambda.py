#!/usr/bin/env python3
"""
Script para probar las funciones Lambda localmente.
"""

import json
import sys
import os
from pathlib import Path

# Agregar el directorio src al path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from src.handlers.api_handler import handler as api_handler
from src.handlers.document_processor import handler as processor_handler
from src.handlers.health_handler import handler as health_handler


def create_api_gateway_event(method="POST", path="/api/v1/platform/process-documents-platform", body=None):
    """Crea un evento de API Gateway para testing."""
    return {
        "httpMethod": method,
        "path": path,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body) if body else None,
        "requestContext": {
            "requestId": "test-request-id",
            "stage": "test"
        }
    }


def create_sqs_event(messages):
    """Crea un evento de SQS para testing."""
    return {
        "Records": [
            {
                "messageId": f"msg-{i}",
                "body": json.dumps(message),
                "attributes": {
                    "SentTimestamp": "1640995200000"
                }
            }
            for i, message in enumerate(messages)
        ]
    }


def create_lambda_context():
    """Crea un contexto de Lambda para testing."""
    class MockContext:
        def __init__(self):
            self.aws_request_id = "test-request-id"
            self.memory_limit_in_mb = 1024
            self.remaining_time_in_millis = lambda: 300000
    
    return MockContext()


def test_api_handler():
    """Prueba el handler de API."""
    print("🧪 Probando API Handler...")
    
    # Test health check
    print("\n1. Probando health check...")
    health_event = create_api_gateway_event("GET", "/api/v1/health")
    context = create_lambda_context()
    
    try:
        response = api_handler(health_event, context)
        print(f"Status Code: {response['statusCode']}")
        print(f"Response: {json.dumps(response['body'], indent=2)}")
    except Exception as e:
        print(f"❌ Error en health check: {e}")
    
    # Test document processing
    print("\n2. Probando procesamiento de documentos...")
    document_event = create_api_gateway_event(
        "POST", 
        "/api/v1/platform/process-documents-platform",
        {
            "owner_user_name": "Juan Pérez",
            "documents": [
                {
                    "file_url": "https://example.com/test-document.pdf",
                    "file_name": "test_document.pdf",
                    "platform_document_id": "test_12345"
                }
            ],
            "url_response": "https://webhook.site/your-unique-url"
        }
    )
    
    try:
        response = api_handler(document_event, context)
        print(f"Status Code: {response['statusCode']}")
        print(f"Response: {json.dumps(response['body'], indent=2)}")
    except Exception as e:
        print(f"❌ Error en procesamiento: {e}")


def test_document_processor():
    """Prueba el handler de procesamiento de documentos."""
    print("\n🧪 Probando Document Processor...")
    
    # Crear evento de SQS
    sqs_event = create_sqs_event([
        {
            "owner_user_name": "Juan Pérez",
            "document_data": {
                "file_url": "https://example.com/test-document.pdf",
                "file_name": "test_document.pdf",
                "platform_document_id": "test_12345"
            },
            "processing_type": "platform_document",
            "url_response": "https://webhook.site/your-unique-url"
        }
    ])
    
    context = create_lambda_context()
    
    try:
        response = processor_handler(sqs_event, context)
        print(f"Status Code: {response['statusCode']}")
        print(f"Response: {json.dumps(response['body'], indent=2)}")
    except Exception as e:
        print(f"❌ Error en document processor: {e}")


def test_health_handler():
    """Prueba el handler de health check."""
    print("\n🧪 Probando Health Handler...")
    
    # Crear evento de CloudWatch Events
    cloudwatch_event = {
        "source": "aws.events",
        "detail-type": "Scheduled Event"
    }
    
    context = create_lambda_context()
    
    try:
        response = health_handler(cloudwatch_event, context)
        print(f"Status Code: {response['statusCode']}")
        print(f"Response: {json.dumps(response['body'], indent=2)})
    except Exception as e:
        print(f"❌ Error en health handler: {e}")


def main():
    """Función principal."""
    print("🚀 Iniciando pruebas de Lambda handlers...")
    
    # Configurar variables de entorno para testing
    os.environ.setdefault("DOCUMENT_PROCESSING_QUEUE_URL", "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue")
    os.environ.setdefault("DOCUMENT_RESULTS_NOTIFICATION_URL", "https://webhook.site/test")
    os.environ.setdefault("AZURE_VISION_ENDPOINT", "https://test.cognitiveservices.azure.com/")
    os.environ.setdefault("AZURE_VISION_KEY", "test-key")
    os.environ.setdefault("DEEPSEEK_API_KEY", "test-key")
    os.environ.setdefault("OPENAI_API_KEY", "test-key")
    
    try:
        # Ejecutar pruebas
        test_api_handler()
        test_document_processor()
        test_health_handler()
        
        print("\n✅ Todas las pruebas completadas")
        
    except Exception as e:
        print(f"\n❌ Error general en las pruebas: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
