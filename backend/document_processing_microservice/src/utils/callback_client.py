"""
Cliente para enviar resultados de procesamiento a callbacks externos.
"""

import json
import requests
from typing import Dict, Any, Optional

from src.config.settings import settings


class CallbackClient:
    """Cliente para enviar resultados a endpoints de callback."""
    
    def __init__(self):
        self.default_callback_url = settings.DOCUMENT_RESULTS_NOTIFICATION_URL
        self.timeout = 30
    
    def send_result(self, result_data: Dict[str, Any], url_override: Optional[str] = None) -> bool:
        """
        Envía el resultado del procesamiento a un endpoint de callback.
        
        Args:
            result_data: Datos del resultado a enviar
            url_override: URL específica para el callback (opcional)
            
        Returns:
            bool: True si se envió exitosamente
        """
        callback_url = url_override or self.default_callback_url
        
        if not callback_url:
            print("⚠️  No hay URL de callback configurada")
            return False
        
        try:
            # Preparar headers
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "DocumentProcessingMicroservice/1.0"
            }
            
            # Enviar resultado
            response = requests.post(
                callback_url,
                json=result_data,
                headers=headers,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            
            print(f"✅ Resultado enviado exitosamente a {callback_url}")
            return True
            
        except requests.RequestException as e:
            print(f"❌ Error al enviar resultado a {callback_url}: {e}")
            return False
        except Exception as e:
            print(f"❌ Error inesperado al enviar resultado: {e}")
            return False
    
    def send_batch_results(self, results: list, url_override: Optional[str] = None) -> bool:
        """
        Envía múltiples resultados en un solo lote.
        
        Args:
            results: Lista de resultados a enviar
            url_override: URL específica para el callback (opcional)
            
        Returns:
            bool: True si se envió exitosamente
        """
        callback_url = url_override or self.default_callback_url
        
        if not callback_url:
            print("⚠️  No hay URL de callback configurada")
            return False
        
        try:
            # Preparar datos del lote
            batch_data = {
                "batch_results": results,
                "total_count": len(results),
                "timestamp": json.dumps({"$date": {"$numberLong": str(int(time.time() * 1000))}})
            }
            
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "DocumentProcessingMicroservice/1.0"
            }
            
            response = requests.post(
                callback_url,
                json=batch_data,
                headers=headers,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            
            print(f"✅ Lote de {len(results)} resultados enviado exitosamente")
            return True
            
        except requests.RequestException as e:
            print(f"❌ Error al enviar lote de resultados: {e}")
            return False
        except Exception as e:
            print(f"❌ Error inesperado al enviar lote: {e}")
            return False
    
    def health_check(self, url_override: Optional[str] = None) -> bool:
        """
        Verifica la conectividad con el endpoint de callback.
        
        Args:
            url_override: URL específica para verificar (opcional)
            
        Returns:
            bool: True si el endpoint responde
        """
        callback_url = url_override or self.default_callback_url
        
        if not callback_url:
            return False
        
        try:
            response = requests.head(callback_url, timeout=10)
            return response.status_code < 500
        except Exception:
            return False
