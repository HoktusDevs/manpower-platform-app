"""
Servicio de validación de documentos.
"""

import requests
from typing import Tuple

from src.config.settings import settings
from src.core.schemas import ProcessingStatus


class DocumentValidationException(Exception):
    """Excepción para errores de validación de documentos."""
    pass


class DocumentValidator:
    """Validador de documentos para el pipeline de procesamiento."""
    
    def __init__(self):
        self.allowed_extensions = settings.ALLOWED_DOCUMENT_EXTENSIONS
        self.max_file_size_mb = settings.MAX_FILE_SIZE_MB
    
    def validate_document(self, document: dict) -> Tuple[bool, str]:
        """
        Valida que un documento sea procesable antes de iniciar el pipeline.
        
        Args:
            document: Diccionario con los datos del documento
            
        Returns:
            Tuple[bool, str]: (es_válido, mensaje)
        """
        file_url = document.get("file_url")
        file_name = document.get("file_name", "N/A")
        
        if not file_url:
            return False, "URL del documento no proporcionada"
        
        # Verificar que la URL sea accesible
        try:
            response = requests.head(file_url, timeout=10)
            if response.status_code != 200:
                return False, (
                    f"No se pudo acceder a la URL del documento "
                    f"(código de error: {response.status_code})"
                )
        except requests.RequestException as e:
            error_msg = self._get_connection_error_message(e)
            return False, error_msg
        
        # Verificar que sea un tipo de archivo soportado
        if not self._is_supported_file_type(file_name):
            return False, f"Tipo de archivo no soportado: {file_name}"
        
        # Verificar tamaño del archivo (si es posible)
        if not self._validate_file_size(file_url):
            return False, f"Archivo demasiado grande (máximo {self.max_file_size_mb}MB)"
        
        return True, "Documento válido"
    
    def _is_supported_file_type(self, file_name: str) -> bool:
        """Verifica si el tipo de archivo está soportado."""
        file_name_lower = file_name.lower()
        return any(file_name_lower.endswith(ext) for ext in self.allowed_extensions)
    
    def _validate_file_size(self, file_url: str) -> bool:
        """
        Valida el tamaño del archivo (implementación básica).
        En producción, esto podría requerir descargar el archivo parcialmente.
        """
        try:
            response = requests.head(file_url, timeout=10)
            content_length = response.headers.get('content-length')
            
            if content_length:
                size_mb = int(content_length) / (1024 * 1024)
                return size_mb <= self.max_file_size_mb
            
            return True  # Si no se puede determinar el tamaño, permitir
        except Exception:
            return True  # Si hay error, permitir y dejar que el pipeline maneje
    
    def _get_connection_error_message(self, error: requests.RequestException) -> str:
        """Obtiene un mensaje de error legible para errores de conexión."""
        error_str = str(error)
        
        if "NameResolutionError" in error_str or "getaddrinfo failed" in error_str:
            return "No se pudo acceder a la URL del documento (dominio no encontrado)"
        elif "timeout" in error_str.lower():
            return "No se pudo acceder a la URL del documento (tiempo de espera agotado)"
        else:
            return "No se pudo acceder a la URL del documento"
