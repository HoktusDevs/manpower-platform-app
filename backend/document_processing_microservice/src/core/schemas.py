"""
Esquemas de datos para el microservicio de procesamiento de documentos.
"""

import enum
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BaseSchema(BaseModel):
    """Esquema base con configuración común para todos los DTOs."""
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        json_encoders={
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat()
        }
    )


class SuccessResponse(BaseSchema):
    """Respuesta estándar para operaciones exitosas."""
    
    status: str = "success"
    message: str
    data: Optional[Any] = None


class ErrorResponse(BaseSchema):
    """Respuesta estándar para errores."""
    
    status: str = "error"
    message: str
    details: Optional[Any] = None


class PlatformDocumentItem(BaseModel):
    """Representa un único documento enviado desde la plataforma."""
    
    file_url: str = Field(
        ..., 
        description="URL pública y accesible del documento a procesar."
    )
    file_name: str = Field(
        ...,
        description="Nombre original del archivo, incluyendo su extensión (ej: 'cedula.pdf').",
    )
    platform_document_id: Optional[str] = Field(
        None,
        description="ID único opcional del documento en el sistema de origen para trazabilidad.",
    )


class PlatformProcessRequest(BaseModel):
    """Payload de entrada para el endpoint de procesamiento de la plataforma."""
    
    owner_user_name: str = Field(
        ...,
        description="Nombre del usuario propietario de los documentos. Se usará para validar información.",
    )
    documents: List[PlatformDocumentItem] = Field(
        ..., 
        min_length=1, 
        description="Lista de documentos a procesar."
    )
    url_response: Optional[str] = Field(
        None,
        description="URL a la que se enviarán los resultados del procesamiento.",
    )


class FinalDecisionStatus(str, enum.Enum):
    """Enumera el resultado final de la validación de un documento."""
    
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    MANUAL_REVIEW = "MANUAL_REVIEW"


class ProcessingStatus(str, enum.Enum):
    """Enumera las etapas específicas del pipeline de procesamiento de un documento."""
    
    PENDING = "PENDING"
    PREVALIDATION = "PREVALIDATION"
    REVI = "REVI"
    CLASSIFICATION = "CLASSIFICATION"
    EXTRACTION = "EXTRACTION"
    AUTHENTICITY = "AUTHENTICITY"
    VALIDATION = "VALIDATION"
    VALIDATION_IDENTIDAD_CL = "VALIDATION_IDENTIDAD_CL"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ProcessedDocumentResult(BaseModel):
    """Representa el resultado del análisis de un único documento."""
    
    platform_document_id: Optional[str] = None
    original_file_name: str
    file_url: str
    document_type: Optional[str] = "Desconocido"
    data_structure: Optional[Dict[str, Any]] = None
    expiration_date: Optional[Union[date, str]] = None
    final_decision: FinalDecisionStatus
    observations: List[Dict[str, Any]]
    processing_status: ProcessingStatus
    owner_user_name: str = Field(
        ...,
        description="Nombre del usuario propietario de los documentos. Se usa para validar información.",
    )
    classification_method: Optional[str] = None
    classification_by_ia: Optional[str] = None
    configured_document_type: Optional[str] = None
    total_processing_cost_usd: float = 0.0


class PlatformProcessResponse(BaseModel):
    """DTO para la respuesta del endpoint, conteniendo una lista de resultados."""
    
    owner_user_name: str = Field(
        ...,
        description="Nombre del usuario propietario de los documentos. Se usa para validar información.",
    )
    results: List[ProcessedDocumentResult]


class RabbitMQMessage(BaseModel):
    """Estructura del mensaje enviado a RabbitMQ."""
    
    owner_user_name: str
    document_data: Dict[str, Any]
    processing_type: str = "platform_document"
    url_response: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HealthCheckResponse(BaseModel):
    """Respuesta del endpoint de health check."""
    
    status: str = "healthy"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"
    services: Dict[str, str] = Field(default_factory=dict)
