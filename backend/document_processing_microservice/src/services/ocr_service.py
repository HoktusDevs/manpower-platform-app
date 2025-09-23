"""
Servicio de OCR (Optical Character Recognition) usando Azure Vision.
"""

import base64
import requests
from typing import Dict, Any

from src.config.settings import settings


class OCRService:
    """Servicio para extraer texto de documentos usando Azure Vision."""
    
    def __init__(self):
        self.endpoint = settings.AZURE_VISION_ENDPOINT
        self.key = settings.AZURE_VISION_KEY
        self.timeout = settings.AZURE_VISION_TIMEOUT
    
    def extract_text_from_url(self, file_url: str) -> Dict[str, Any]:
        """
        Extrae texto de un documento usando su URL.
        
        Args:
            file_url: URL del documento a procesar
            
        Returns:
            Dict con el texto extraído y metadatos
            
        Raises:
            Exception: Si hay error en el procesamiento
        """
        try:
            # Obtener el documento desde la URL
            response = requests.get(file_url, timeout=self.timeout)
            response.raise_for_status()
            
            # Codificar en base64
            document_bytes = response.content
            document_base64 = base64.b64encode(document_bytes).decode('utf-8')
            
            # Preparar la solicitud a Azure Vision
            headers = {
                'Ocp-Apim-Subscription-Key': self.key,
                'Content-Type': 'application/octet-stream'
            }
            
            # URL del endpoint de OCR
            ocr_url = f"{self.endpoint}/vision/v3.2/read/analyze"
            
            # Realizar la solicitud
            response = requests.post(
                ocr_url,
                headers=headers,
                data=document_bytes,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            # Obtener el ID de operación
            operation_id = response.headers.get('Operation-Location', '').split('/')[-1]
            
            # Esperar y obtener resultados
            return self._get_ocr_results(operation_id)
            
        except requests.RequestException as e:
            raise Exception(f"Error al procesar documento con Azure Vision: {e}")
        except Exception as e:
            raise Exception(f"Error inesperado en OCR: {e}")
    
    def _get_ocr_results(self, operation_id: str) -> Dict[str, Any]:
        """
        Obtiene los resultados del análisis OCR.
        
        Args:
            operation_id: ID de la operación de Azure Vision
            
        Returns:
            Dict con los resultados del OCR
        """
        headers = {
            'Ocp-Apim-Subscription-Key': self.key
        }
        
        result_url = f"{self.endpoint}/vision/v3.2/read/analyzeResults/{operation_id}"
        
        import time
        max_attempts = 30  # 30 segundos máximo
        attempt = 0
        
        while attempt < max_attempts:
            try:
                response = requests.get(result_url, headers=headers, timeout=10)
                response.raise_for_status()
                
                result = response.json()
                
                if result.get('status') == 'succeeded':
                    return self._parse_ocr_result(result)
                elif result.get('status') == 'failed':
                    raise Exception("El análisis OCR falló")
                
                time.sleep(1)
                attempt += 1
                
            except requests.RequestException as e:
                raise Exception(f"Error al obtener resultados OCR: {e}")
        
        raise Exception("Timeout esperando resultados de OCR")
    
    def _parse_ocr_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parsea los resultados del OCR en un formato estándar.
        
        Args:
            result: Resultado crudo de Azure Vision
            
        Returns:
            Dict con texto extraído y metadatos
        """
        try:
            # Extraer texto de todas las líneas
            lines = []
            if 'analyzeResult' in result and 'readResults' in result['analyzeResult']:
                for page in result['analyzeResult']['readResults']:
                    for line in page.get('lines', []):
                        lines.append(line.get('text', ''))
            
            # Combinar todas las líneas
            full_text = '\n'.join(lines)
            
            return {
                'extracted_text': full_text,
                'lines_count': len(lines),
                'confidence': self._calculate_average_confidence(result),
                'raw_result': result
            }
            
        except Exception as e:
            raise Exception(f"Error al parsear resultados OCR: {e}")
    
    def _calculate_average_confidence(self, result: Dict[str, Any]) -> float:
        """Calcula la confianza promedio del OCR."""
        try:
            confidences = []
            if 'analyzeResult' in result and 'readResults' in result['analyzeResult']:
                for page in result['analyzeResult']['readResults']:
                    for line in page.get('lines', []):
                        if 'confidence' in line:
                            confidences.append(line['confidence'])
            
            return sum(confidences) / len(confidences) if confidences else 0.0
            
        except Exception:
            return 0.0
