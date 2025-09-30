"""
Servicio de validación de identidad chilena usando Boostr API.
"""

import requests
from typing import Dict, Any, Optional

from src.config.settings import settings


class BoostrService:
    """Servicio para validar identidad chilena con Boostr API."""

    def __init__(self):
        self.api_key = settings.BOOSTR_API_KEY
        self.base_url = settings.BOOSTR_BASE_URL
        self.timeout = settings.BOOSTR_TIMEOUT_SECONDS

    def validate_rut(self, rut: str, nombre: str, fecha_nacimiento: Optional[str] = None) -> Dict[str, Any]:
        """
        Valida un RUT chileno con Boostr API.

        Args:
            rut: RUT con formato (ej: '12.345.678-9')
            nombre: Nombre completo de la persona
            fecha_nacimiento: Fecha de nacimiento (opcional) formato YYYY-MM-DD

        Returns:
            Dict con el resultado de la validación
        """
        try:
            # Limpiar RUT (eliminar puntos y guión)
            clean_rut = rut.replace('.', '').replace('-', '')

            # Preparar request a Boostr
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }

            payload = {
                'rut': clean_rut,
                'nombre': nombre
            }

            if fecha_nacimiento:
                payload['fecha_nacimiento'] = fecha_nacimiento

            # Llamar a Boostr API
            response = requests.post(
                f"{self.base_url}/v1/identity/validate",
                headers=headers,
                json=payload,
                timeout=self.timeout
            )

            if response.status_code == 200:
                result = response.json()
                return {
                    'valid': result.get('valid', False),
                    'confidence': result.get('confidence', 0.0),
                    'details': result.get('details', {}),
                    'source': 'boostr'
                }
            elif response.status_code == 404:
                return {
                    'valid': False,
                    'confidence': 0.0,
                    'details': {'error': 'RUT no encontrado en base de datos'},
                    'source': 'boostr'
                }
            else:
                raise Exception(f"Boostr API error: {response.status_code} - {response.text}")

        except requests.RequestException as e:
            raise Exception(f"Error conectando con Boostr API: {e}")
        except Exception as e:
            raise Exception(f"Error inesperado en validación Boostr: {e}")

    def validate_from_extracted_data(self, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Valida identidad desde datos extraídos del documento.

        Args:
            extracted_data: Datos extraídos del documento (rut, nombre, fecha_nacimiento)

        Returns:
            Dict con el resultado de la validación
        """
        try:
            # Extraer campos necesarios
            rut = extracted_data.get('rut') or extracted_data.get('numero_documento')
            nombre_completo = self._build_full_name(extracted_data)
            fecha_nacimiento = extracted_data.get('fecha_nacimiento')

            if not rut:
                return {
                    'valid': False,
                    'confidence': 0.0,
                    'details': {'error': 'RUT no encontrado en documento'},
                    'source': 'boostr'
                }

            if not nombre_completo:
                return {
                    'valid': False,
                    'confidence': 0.0,
                    'details': {'error': 'Nombre no encontrado en documento'},
                    'source': 'boostr'
                }

            # Validar con Boostr
            return self.validate_rut(rut, nombre_completo, fecha_nacimiento)

        except Exception as e:
            raise Exception(f"Error validando datos extraídos: {e}")

    def _build_full_name(self, extracted_data: Dict[str, Any]) -> Optional[str]:
        """Construye el nombre completo desde los datos extraídos."""
        # Opción 1: nombre_completo directo
        if 'nombre_completo' in extracted_data:
            return extracted_data['nombre_completo']

        # Opción 2: construir desde partes
        nombre = extracted_data.get('nombre', '')
        apellido_paterno = extracted_data.get('apellido_paterno', '')
        apellido_materno = extracted_data.get('apellido_materno', '')

        parts = [p for p in [nombre, apellido_paterno, apellido_materno] if p]

        if parts:
            return ' '.join(parts)

        return None
