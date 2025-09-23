"""
Servicio de clasificación y extracción de datos usando IA.
"""

import json
import requests
from typing import Dict, Any, Optional

from src.config.settings import settings


class AIClassificationService:
    """Servicio para clasificar documentos y extraer datos usando modelos de IA."""
    
    def __init__(self):
        self.provider = settings.DOCUMENT_IA_PROVIDER
        self._setup_provider()
    
    def _setup_provider(self):
        """Configura el proveedor de IA según la configuración."""
        if self.provider == "deepseek":
            self.api_key = settings.DEEPSEEK_API_KEY
            self.base_url = settings.DEEPSEEK_API_BASE_URL
            self.model_generation = settings.DEEPSEEK_MODEL_GENERATION
            self.model_extraction = settings.DEEPSEEK_MODEL_EXTRACTION
        elif self.provider == "openai":
            self.api_key = settings.OPENAI_API_KEY
            self.base_url = settings.OPENAI_API_BASE_URL
            self.model_generation = settings.OPENAI_MODEL_GENERATION
            self.model_extraction = settings.OPENAI_MODEL_EXTRACTION
        else:
            raise ValueError(f"Proveedor de IA no soportado: {self.provider}")
    
    def classify_document(self, extracted_text: str) -> Dict[str, Any]:
        """
        Clasifica el tipo de documento basado en el texto extraído.
        
        Args:
            extracted_text: Texto extraído del documento
            
        Returns:
            Dict con la clasificación y confianza
        """
        prompt = self._build_classification_prompt(extracted_text)
        
        try:
            response = self._call_ai_api(prompt, self.model_generation)
            return self._parse_classification_response(response)
        except Exception as e:
            raise Exception(f"Error en clasificación de documento: {e}")
    
    def extract_structured_data(self, extracted_text: str, document_type: str) -> Dict[str, Any]:
        """
        Extrae datos estructurados del documento según su tipo.
        
        Args:
            extracted_text: Texto extraído del documento
            document_type: Tipo de documento identificado
            
        Returns:
            Dict con los datos estructurados extraídos
        """
        prompt = self._build_extraction_prompt(extracted_text, document_type)
        
        try:
            response = self._call_ai_api(prompt, self.model_extraction)
            return self._parse_extraction_response(response)
        except Exception as e:
            raise Exception(f"Error en extracción de datos: {e}")
    
    def _build_classification_prompt(self, text: str) -> str:
        """Construye el prompt para clasificación de documentos."""
        return f"""
Analiza el siguiente texto extraído de un documento y determina qué tipo de documento es.

Tipos de documentos posibles:
- Cédula de Identidad CL (Frontal)
- Cédula de Identidad CL (Reverso)
- Licencia de Conducir CL
- Pasaporte
- Certificado de Nacimiento
- Otro

Texto del documento:
{text[:2000]}...

Responde en formato JSON con:
{{
    "document_type": "tipo_identificado",
    "confidence": 0.95,
    "reasoning": "explicación_corta"
}}
"""
    
    def _build_extraction_prompt(self, text: str, document_type: str) -> str:
        """Construye el prompt para extracción de datos según el tipo de documento."""
        extraction_schemas = {
            "Cédula de Identidad CL (Frontal)": {
                "fields": ["nombre", "apellido_paterno", "apellido_materno", "rut", "fecha_nacimiento", "nacionalidad"],
                "description": "cédula de identidad chilena"
            },
            "Licencia de Conducir CL": {
                "fields": ["nombre_completo", "rut", "fecha_vencimiento", "categoria", "direccion"],
                "description": "licencia de conducir chilena"
            }
        }
        
        schema = extraction_schemas.get(document_type, {
            "fields": ["informacion_general"],
            "description": "documento"
        })
        
        return f"""
Extrae la información estructurada del siguiente texto de una {schema['description']}.

Campos a extraer: {', '.join(schema['fields'])}

Texto del documento:
{text[:2000]}...

Responde en formato JSON con los campos extraídos:
{{
    "nombre": "valor_extraido",
    "fecha_vencimiento": "YYYY-MM-DD",
    "otros_campos": "valores"
}}
"""
    
    def _call_ai_api(self, prompt: str, model: str) -> str:
        """Realiza una llamada a la API de IA."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 2000
        }
        
        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        return result["choices"][0]["message"]["content"]
    
    def _parse_classification_response(self, response: str) -> Dict[str, Any]:
        """Parsea la respuesta de clasificación."""
        try:
            # Intentar parsear como JSON
            if response.strip().startswith('{'):
                return json.loads(response)
            
            # Si no es JSON válido, extraer información básica
            return {
                "document_type": "Desconocido",
                "confidence": 0.0,
                "reasoning": "No se pudo clasificar el documento"
            }
        except json.JSONDecodeError:
            return {
                "document_type": "Desconocido",
                "confidence": 0.0,
                "reasoning": "Respuesta de IA no válida"
            }
    
    def _parse_extraction_response(self, response: str) -> Dict[str, Any]:
        """Parsea la respuesta de extracción de datos."""
        try:
            # Intentar parsear como JSON
            if response.strip().startswith('{'):
                return json.loads(response)
            
            # Si no es JSON válido, devolver estructura vacía
            return {}
        except json.JSONDecodeError:
            return {}
