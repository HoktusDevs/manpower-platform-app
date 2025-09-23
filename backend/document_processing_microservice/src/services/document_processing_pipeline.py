"""
Pipeline principal de procesamiento de documentos.
"""

import types
from datetime import datetime, timezone
from typing import Dict, Any

from src.core.schemas import (
    ProcessingStatus, 
    FinalDecisionStatus, 
    ProcessedDocumentResult
)
from src.services.document_validator import DocumentValidator, DocumentValidationException
from src.services.ocr_service import OCRService
from src.services.ai_classification_service import AIClassificationService


class DocumentProcessingPipeline:
    """Pipeline principal para el procesamiento de documentos."""
    
    def __init__(self):
        self.validator = DocumentValidator()
        self.ocr_service = OCRService()
        self.ai_service = AIClassificationService()
    
    def process_document(self, owner_user_name: str, document: Dict[str, Any]) -> ProcessedDocumentResult:
        """
        Ejecuta el pipeline completo de procesamiento de un documento.
        
        Args:
            owner_user_name: Nombre del propietario del documento
            document: Datos del documento a procesar
            
        Returns:
            ProcessedDocumentResult: Resultado del procesamiento
        """
        # Crear contexto de procesamiento
        contexto = self._create_processing_context(owner_user_name, document)
        
        try:
            # Fase 1: Validación previa
            self._validate_document(document)
            contexto["processing_status"] = ProcessingStatus.PREVALIDATION
            
            # Fase 2: OCR
            contexto = self._execute_ocr(contexto)
            contexto["processing_status"] = ProcessingStatus.REVI
            
            # Fase 3: Clasificación y extracción
            contexto = self._execute_classification_and_extraction(contexto)
            contexto["processing_status"] = ProcessingStatus.CLASSIFICATION
            
            # Fase 4: Reglas de negocio (simplificadas)
            contexto = self._execute_business_rules(contexto)
            contexto["processing_status"] = ProcessingStatus.VALIDATION
            
            # Fase 5: Validación de identidad CL (si aplica)
            if self._should_validate_identity_cl(contexto):
                contexto = self._execute_identity_validation(contexto)
                contexto["processing_status"] = ProcessingStatus.VALIDATION_IDENTIDAD_CL
            
            contexto["processing_status"] = ProcessingStatus.COMPLETED
            
        except DocumentValidationException as e:
            contexto = self._handle_validation_error(contexto, e)
        except Exception as e:
            contexto = self._handle_processing_error(contexto, e)
        
        # Generar resultado final
        return self._build_final_result(contexto, document)
    
    def _create_processing_context(self, owner_user_name: str, document: Dict[str, Any]) -> Dict[str, Any]:
        """Crea el contexto inicial de procesamiento."""
        return {
            "owner_user_name": owner_user_name,
            "document": document,
            "processing_status": ProcessingStatus.PENDING,
            "final_decision": FinalDecisionStatus.MANUAL_REVIEW,
            "extracted_text": "",
            "document_type": "Desconocido",
            "structured_data": {},
            "rejection_reasons": [],
            "processing_log": [],
            "total_cost_usd": 0.0,
            "confidence_score": 0.0
        }
    
    def _validate_document(self, document: Dict[str, Any]) -> None:
        """Valida el documento antes del procesamiento."""
        is_valid, message = self.validator.validate_document(document)
        if not is_valid:
            raise DocumentValidationException(f"Documento no válido: {message}")
    
    def _execute_ocr(self, contexto: Dict[str, Any]) -> Dict[str, Any]:
        """Ejecuta la extracción de texto (OCR)."""
        try:
            document = contexto["document"]
            ocr_result = self.ocr_service.extract_text_from_url(document["file_url"])
            
            contexto["extracted_text"] = ocr_result["extracted_text"]
            contexto["processing_log"].append(
                f"{datetime.now(timezone.utc).isoformat()}: OCR completado - "
                f"{ocr_result['lines_count']} líneas extraídas"
            )
            
            return contexto
            
        except Exception as e:
            raise Exception(f"Error en OCR: {e}")
    
    def _execute_classification_and_extraction(self, contexto: Dict[str, Any]) -> Dict[str, Any]:
        """Ejecuta la clasificación y extracción de datos."""
        try:
            extracted_text = contexto["extracted_text"]
            
            # Clasificar el documento
            classification = self.ai_service.classify_document(extracted_text)
            contexto["document_type"] = classification.get("document_type", "Desconocido")
            contexto["confidence_score"] = classification.get("confidence", 0.0)
            
            # Extraer datos estructurados
            if contexto["document_type"] != "Desconocido":
                structured_data = self.ai_service.extract_structured_data(
                    extracted_text, 
                    contexto["document_type"]
                )
                contexto["structured_data"] = structured_data
            
            contexto["processing_log"].append(
                f"{datetime.now(timezone.utc).isoformat()}: Clasificación completada - "
                f"Tipo: {contexto['document_type']}, Confianza: {contexto['confidence_score']:.2f}"
            )
            
            return contexto
            
        except Exception as e:
            raise Exception(f"Error en clasificación: {e}")
    
    def _execute_business_rules(self, contexto: Dict[str, Any]) -> Dict[str, Any]:
        """Ejecuta las reglas de negocio (versión simplificada)."""
        try:
            # Reglas básicas de validación
            if contexto["confidence_score"] < 0.7:
                contexto["rejection_reasons"].append({
                    "rule": "Confianza Mínima",
                    "reason": f"Confianza del documento muy baja: {contexto['confidence_score']:.2f}"
                })
                contexto["final_decision"] = FinalDecisionStatus.MANUAL_REVIEW
            
            # Validar que se extrajo texto
            if not contexto["extracted_text"].strip():
                contexto["rejection_reasons"].append({
                    "rule": "Texto Extraído",
                    "reason": "No se pudo extraer texto del documento"
                })
                contexto["final_decision"] = FinalDecisionStatus.REJECTED
            
            # Si no hay razones de rechazo, aprobar
            if not contexto["rejection_reasons"]:
                contexto["final_decision"] = FinalDecisionStatus.APPROVED
            
            contexto["processing_log"].append(
                f"{datetime.now(timezone.utc).isoformat()}: Reglas de negocio aplicadas - "
                f"Decisión: {contexto['final_decision'].value}"
            )
            
            return contexto
            
        except Exception as e:
            raise Exception(f"Error en reglas de negocio: {e}")
    
    def _should_validate_identity_cl(self, contexto: Dict[str, Any]) -> bool:
        """Determina si se debe validar la identidad CL."""
        return contexto["document_type"] == "Cédula de Identidad CL (Frontal)"
    
    def _execute_identity_validation(self, contexto: Dict[str, Any]) -> Dict[str, Any]:
        """Ejecuta la validación de identidad CL (placeholder)."""
        # TODO: Implementar validación con Boostr
        contexto["processing_log"].append(
            f"{datetime.now(timezone.utc).isoformat()}: Validación de identidad CL completada"
        )
        return contexto
    
    def _handle_validation_error(self, contexto: Dict[str, Any], error: DocumentValidationException) -> Dict[str, Any]:
        """Maneja errores de validación."""
        contexto["processing_status"] = ProcessingStatus.FAILED
        contexto["final_decision"] = FinalDecisionStatus.REJECTED
        contexto["rejection_reasons"].append({
            "rule": "Validación de Documento",
            "reason": str(error)
        })
        return contexto
    
    def _handle_processing_error(self, contexto: Dict[str, Any], error: Exception) -> Dict[str, Any]:
        """Maneja errores de procesamiento."""
        contexto["processing_status"] = ProcessingStatus.FAILED
        contexto["final_decision"] = FinalDecisionStatus.MANUAL_REVIEW
        contexto["rejection_reasons"].append({
            "rule": "Error de Procesamiento",
            "reason": f"Error inesperado: {str(error)}"
        })
        return contexto
    
    def _build_final_result(self, contexto: Dict[str, Any], document: Dict[str, Any]) -> ProcessedDocumentResult:
        """Construye el resultado final del procesamiento."""
        return ProcessedDocumentResult(
            platform_document_id=document.get("platform_document_id"),
            original_file_name=document.get("file_name"),
            file_url=document.get("file_url"),
            document_type=contexto["document_type"],
            data_structure=contexto["structured_data"],
            expiration_date=self._extract_expiration_date(contexto["structured_data"]),
            final_decision=contexto["final_decision"],
            observations=contexto["rejection_reasons"],
            processing_status=contexto["processing_status"],
            owner_user_name=contexto["owner_user_name"],
            classification_method="IA" if contexto["document_type"] != "Desconocido" else "UNKNOWN",
            classification_by_ia=contexto["document_type"],
            total_processing_cost_usd=contexto["total_cost_usd"]
        )
    
    def _extract_expiration_date(self, structured_data: Dict[str, Any]) -> str:
        """Extrae la fecha de vencimiento de los datos estructurados."""
        date_fields = ["fecha_vencimiento", "expiration_date", "vencimiento"]
        
        for field in date_fields:
            if field in structured_data:
                return str(structured_data[field])
        
        return None
