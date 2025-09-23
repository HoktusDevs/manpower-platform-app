"""
Tests de integración para la API.
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from src.api.app import app


@pytest.fixture
def client():
    """Fixture para el cliente de pruebas."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestHealthEndpoint:
    """Tests para el endpoint de health check."""
    
    def test_health_check_success(self, client):
        """Test de health check exitoso."""
        with patch('src.utils.rabbitmq_publisher.RabbitMQPublisher.health_check', return_value=True):
            response = client.get('/api/v1/health')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'healthy'
            assert 'services' in data
    
    def test_health_check_rabbitmq_down(self, client):
        """Test de health check con RabbitMQ caído."""
        with patch('src.utils.rabbitmq_publisher.RabbitMQPublisher.health_check', return_value=False):
            response = client.get('/api/v1/health')
            
            assert response.status_code == 503
            data = json.loads(response.data)
            assert data['status'] == 'unhealthy'


class TestDocumentProcessingEndpoint:
    """Tests para el endpoint de procesamiento de documentos."""
    
    def test_valid_request(self, client):
        """Test con request válido."""
        payload = {
            "owner_user_name": "Juan Pérez",
            "documents": [
                {
                    "file_url": "https://example.com/doc.pdf",
                    "file_name": "document.pdf",
                    "platform_document_id": "doc_123"
                }
            ],
            "url_response": "https://callback.com/results"
        }
        
        with patch('src.utils.rabbitmq_publisher.RabbitMQPublisher.publish_document_message', return_value=True):
            response = client.post(
                '/api/v1/platform/process-documents-platform',
                json=payload,
                content_type='application/json'
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['status'] == 'success'
            assert data['data']['enqueued'] == 1
    
    def test_empty_request(self, client):
        """Test con request vacío."""
        response = client.post(
            '/api/v1/platform/process-documents-platform',
            json={},
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
    
    def test_too_many_documents(self, client):
        """Test con demasiados documentos."""
        payload = {
            "owner_user_name": "Juan Pérez",
            "documents": [{"file_url": f"https://example.com/doc{i}.pdf", "file_name": f"doc{i}.pdf"} 
                         for i in range(31)]  # Más del límite
        }
        
        response = client.post(
            '/api/v1/platform/process-documents-platform',
            json=payload,
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Demasiados documentos' in data['message']
    
    def test_rabbitmq_publish_failure(self, client):
        """Test cuando falla la publicación en RabbitMQ."""
        payload = {
            "owner_user_name": "Juan Pérez",
            "documents": [
                {
                    "file_url": "https://example.com/doc.pdf",
                    "file_name": "document.pdf"
                }
            ]
        }
        
        with patch('src.utils.rabbitmq_publisher.RabbitMQPublisher.publish_document_message', return_value=False):
            response = client.post(
                '/api/v1/platform/process-documents-platform',
                json=payload,
                content_type='application/json'
            )
            
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['status'] == 'error'
    
    def test_partial_success(self, client):
        """Test con éxito parcial."""
        payload = {
            "owner_user_name": "Juan Pérez",
            "documents": [
                {"file_url": "https://example.com/doc1.pdf", "file_name": "doc1.pdf"},
                {"file_url": "https://example.com/doc2.pdf", "file_name": "doc2.pdf"}
            ]
        }
        
        def mock_publish(owner, doc_data, url_response=None):
            # Simular que el primer documento se publica exitosamente
            return doc_data['file_name'] == 'doc1.pdf'
        
        with patch('src.utils.rabbitmq_publisher.RabbitMQPublisher.publish_document_message', side_effect=mock_publish):
            response = client.post(
                '/api/v1/platform/process-documents-platform',
                json=payload,
                content_type='application/json'
            )
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['data']['enqueued'] == 1
            assert data['data']['failed'] == 1
