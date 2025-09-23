"""
Tests unitarios para los esquemas de datos.
"""

import pytest
from datetime import datetime, date
from src.core.schemas import (
    PlatformProcessRequest,
    PlatformDocumentItem,
    ProcessedDocumentResult,
    FinalDecisionStatus,
    ProcessingStatus,
    SuccessResponse,
    ErrorResponse
)


class TestPlatformProcessRequest:
    """Tests para PlatformProcessRequest."""
    
    def test_valid_request(self):
        """Test con request válido."""
        request_data = {
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
        
        request = PlatformProcessRequest(**request_data)
        
        assert request.owner_user_name == "Juan Pérez"
        assert len(request.documents) == 1
        assert request.url_response == "https://callback.com/results"
    
    def test_minimal_request(self):
        """Test con request mínimo."""
        request_data = {
            "owner_user_name": "Juan Pérez",
            "documents": [
                {
                    "file_url": "https://example.com/doc.pdf",
                    "file_name": "document.pdf"
                }
            ]
        }
        
        request = PlatformProcessRequest(**request_data)
        
        assert request.owner_user_name == "Juan Pérez"
        assert request.url_response is None
    
    def test_empty_documents_fails(self):
        """Test que falla con lista vacía de documentos."""
        request_data = {
            "owner_user_name": "Juan Pérez",
            "documents": []
        }
        
        with pytest.raises(ValueError):
            PlatformProcessRequest(**request_data)


class TestPlatformDocumentItem:
    """Tests para PlatformDocumentItem."""
    
    def test_valid_document(self):
        """Test con documento válido."""
        doc_data = {
            "file_url": "https://example.com/doc.pdf",
            "file_name": "document.pdf",
            "platform_document_id": "doc_123"
        }
        
        doc = PlatformDocumentItem(**doc_data)
        
        assert doc.file_url == "https://example.com/doc.pdf"
        assert doc.file_name == "document.pdf"
        assert doc.platform_document_id == "doc_123"
    
    def test_minimal_document(self):
        """Test con documento mínimo."""
        doc_data = {
            "file_url": "https://example.com/doc.pdf",
            "file_name": "document.pdf"
        }
        
        doc = PlatformDocumentItem(**doc_data)
        
        assert doc.platform_document_id is None


class TestProcessedDocumentResult:
    """Tests para ProcessedDocumentResult."""
    
    def test_valid_result(self):
        """Test con resultado válido."""
        result_data = {
            "original_file_name": "document.pdf",
            "file_url": "https://example.com/doc.pdf",
            "final_decision": FinalDecisionStatus.APPROVED,
            "observations": [],
            "processing_status": ProcessingStatus.COMPLETED,
            "owner_user_name": "Juan Pérez"
        }
        
        result = ProcessedDocumentResult(**result_data)
        
        assert result.original_file_name == "document.pdf"
        assert result.final_decision == FinalDecisionStatus.APPROVED
        assert result.processing_status == ProcessingStatus.COMPLETED


class TestResponseSchemas:
    """Tests para esquemas de respuesta."""
    
    def test_success_response(self):
        """Test para SuccessResponse."""
        response = SuccessResponse(
            message="Operación exitosa",
            data={"count": 5}
        )
        
        assert response.status == "success"
        assert response.message == "Operación exitosa"
        assert response.data["count"] == 5
    
    def test_error_response(self):
        """Test para ErrorResponse."""
        response = ErrorResponse(
            message="Error de validación",
            details={"field": "email"}
        )
        
        assert response.status == "error"
        assert response.message == "Error de validación"
        assert response.details["field"] == "email"
