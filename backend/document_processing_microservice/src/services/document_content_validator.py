"""
Servicio de validación de contenido de documentos.
Valida que los datos extraídos del documento coincidan con los datos esperados del postulante.
"""

import re
from typing import Dict, Any, List, Tuple
from datetime import datetime


class DocumentContentValidator:
    """Validador de contenido de documentos basado en datos del postulante."""

    def __init__(self):
        pass

    def validate_document_content(
        self,
        extracted_data: Dict[str, Any],
        applicant_data: Dict[str, Any],
        expected_document_type: str,
        document_type: str
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Valida el contenido del documento contra los datos del postulante.

        Args:
            extracted_data: Datos extraídos del documento por IA
            applicant_data: Datos esperados del postulante
            expected_document_type: Tipo de documento esperado
            document_type: Tipo de documento detectado por IA

        Returns:
            Tuple[str, List[Dict]]: (decisión, observaciones)
                decisión: 'APPROVED', 'REJECTED', 'MANUAL_REVIEW'
                observaciones: Lista de observaciones encontradas
        """
        observations = []
        critical_errors = 0
        warnings = 0

        # Validar que el tipo de documento coincida con el esperado
        if expected_document_type and document_type:
            if not self._types_match(expected_document_type, document_type):
                observations.append({
                    'capa': 'critical',
                    'razon': f'Tipo de documento incorrecto. Esperado: {expected_document_type}, Encontrado: {document_type}',
                    'message': 'Document type mismatch'
                })
                critical_errors += 1

        # Validar RUT si está disponible
        if applicant_data.get('rut') and extracted_data.get('rut'):
            rut_match, rut_obs = self._validate_rut(
                extracted_data['rut'],
                applicant_data['rut']
            )
            if not rut_match:
                observations.append(rut_obs)
                critical_errors += 1

        # Validar nombre si está disponible
        if applicant_data.get('nombre') and extracted_data.get('nombre'):
            name_match, name_obs = self._validate_name(
                extracted_data.get('nombre', ''),
                extracted_data.get('apellido_paterno', ''),
                extracted_data.get('apellido_materno', ''),
                applicant_data['nombre']
            )
            if not name_match:
                observations.append(name_obs)
                critical_errors += 1

        # Validar vigencia del documento (si aplica)
        if extracted_data.get('fecha_vencimiento'):
            expired, expiry_obs = self._validate_expiry(
                extracted_data['fecha_vencimiento']
            )
            if expired:
                observations.append(expiry_obs)
                critical_errors += 1

        # Determinar decisión final
        if critical_errors > 0:
            decision = 'REJECTED'
            observations.insert(0, {
                'capa': 'critical',
                'razon': f'Documento rechazado por {critical_errors} error(es) crítico(s)',
                'message': f'Document rejected due to {critical_errors} critical error(s)'
            })
        elif warnings > 0:
            decision = 'MANUAL_REVIEW'
            observations.insert(0, {
                'capa': 'warning',
                'razon': f'Revisión manual requerida ({warnings} advertencia(s))',
                'message': 'Manual review required'
            })
        else:
            decision = 'APPROVED'
            observations.insert(0, {
                'capa': 'success',
                'razon': 'Documento aprobado. Todos los datos coinciden correctamente.',
                'message': 'Document approved. All data matches correctly.'
            })

        return decision, observations

    def _types_match(self, expected: str, detected: str) -> bool:
        """Verifica si los tipos de documento coinciden (con cierta flexibilidad)."""
        expected_lower = expected.lower()
        detected_lower = detected.lower()

        # Coincidencia exacta
        if expected_lower == detected_lower:
            return True

        # Coincidencia parcial para casos comunes
        if 'cedula' in expected_lower or 'cédula' in expected_lower:
            if 'cedula' in detected_lower or 'cédula' in detected_lower or 'identidad' in detected_lower:
                # Verificar frontal/reverso si se especifica
                if 'frontal' in expected_lower and 'reverso' in detected_lower:
                    return False
                if 'reverso' in expected_lower and 'frontal' in detected_lower:
                    return False
                return True

        if 'licencia' in expected_lower and 'licencia' in detected_lower:
            return True

        if 'pasaporte' in expected_lower and 'pasaporte' in detected_lower:
            return True

        return False

    def _validate_rut(self, extracted_rut: str, expected_rut: str) -> Tuple[bool, Dict[str, Any]]:
        """Valida que el RUT extraído coincida con el esperado."""
        # Normalizar RUTs (quitar puntos, guiones, espacios)
        normalized_extracted = self._normalize_rut(extracted_rut)
        normalized_expected = self._normalize_rut(expected_rut)

        if normalized_extracted == normalized_expected:
            return True, {
                'capa': 'success',
                'razon': f'RUT verificado correctamente: {expected_rut}',
                'message': 'RUT verified successfully'
            }
        else:
            return False, {
                'capa': 'critical',
                'razon': f'RUT no coincide. Esperado: {expected_rut}, Encontrado: {extracted_rut}',
                'message': 'RUT mismatch',
                'expected': expected_rut,
                'found': extracted_rut
            }

    def _normalize_rut(self, rut: str) -> str:
        """Normaliza un RUT para comparación (sin puntos ni guiones)."""
        if not rut:
            return ''
        # Remover puntos, guiones, espacios y convertir a minúsculas
        normalized = re.sub(r'[.\-\s]', '', str(rut)).lower()
        return normalized

    def _validate_name(
        self,
        extracted_nombre: str,
        extracted_apellido_paterno: str,
        extracted_apellido_materno: str,
        expected_full_name: str
    ) -> Tuple[bool, Dict[str, Any]]:
        """Valida que el nombre extraído coincida con el esperado."""
        # Construir nombre completo extraído
        extracted_parts = [
            extracted_nombre,
            extracted_apellido_paterno,
            extracted_apellido_materno
        ]
        extracted_full = ' '.join(filter(None, extracted_parts)).strip()

        # Normalizar nombres para comparación (sin tildes, minúsculas)
        extracted_normalized = self._normalize_name(extracted_full)
        expected_normalized = self._normalize_name(expected_full_name)

        # Verificar si hay coincidencia (al menos 70% de similitud)
        similarity = self._calculate_name_similarity(extracted_normalized, expected_normalized)

        if similarity >= 0.7:
            return True, {
                'capa': 'success',
                'razon': f'Nombre verificado: {expected_full_name}',
                'message': 'Name verified successfully',
                'similarity': similarity
            }
        else:
            return False, {
                'capa': 'critical',
                'razon': f'Nombre no coincide. Esperado: {expected_full_name}, Encontrado: {extracted_full}',
                'message': 'Name mismatch',
                'expected': expected_full_name,
                'found': extracted_full,
                'similarity': similarity
            }

    def _normalize_name(self, name: str) -> str:
        """Normaliza un nombre para comparación (sin tildes, minúsculas, etc)."""
        if not name:
            return ''

        # Convertir a minúsculas
        normalized = name.lower()

        # Remover tildes
        replacements = {
            'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
            'ä': 'a', 'ë': 'e', 'ï': 'i', 'ö': 'o', 'ü': 'u',
            'ñ': 'n'
        }
        for old, new in replacements.items():
            normalized = normalized.replace(old, new)

        # Remover espacios extra
        normalized = ' '.join(normalized.split())

        return normalized

    def _calculate_name_similarity(self, name1: str, name2: str) -> float:
        """Calcula similitud entre dos nombres (simple word-based matching)."""
        if not name1 or not name2:
            return 0.0

        words1 = set(name1.split())
        words2 = set(name2.split())

        if not words1 or not words2:
            return 0.0

        # Calcular Jaccard similarity
        intersection = words1.intersection(words2)
        union = words1.union(words2)

        return len(intersection) / len(union) if union else 0.0

    def _validate_expiry(self, expiry_date_str: str) -> Tuple[bool, Dict[str, Any]]:
        """Valida que el documento no esté vencido."""
        try:
            # Intentar parsear la fecha en varios formatos
            expiry_date = None
            formats_to_try = [
                '%Y-%m-%d',
                '%d-%m-%Y',
                '%d/%m/%Y',
                '%Y/%m/%d'
            ]

            for fmt in formats_to_try:
                try:
                    expiry_date = datetime.strptime(expiry_date_str, fmt)
                    break
                except ValueError:
                    continue

            if not expiry_date:
                return False, {
                    'capa': 'warning',
                    'razon': f'No se pudo verificar fecha de vencimiento: {expiry_date_str}',
                    'message': 'Could not verify expiry date'
                }

            # Verificar si está vencido
            if expiry_date < datetime.now():
                return True, {
                    'capa': 'critical',
                    'razon': f'Documento vencido. Fecha de vencimiento: {expiry_date_str}',
                    'message': 'Document expired',
                    'expiry_date': expiry_date_str
                }
            else:
                return False, {
                    'capa': 'success',
                    'razon': f'Documento vigente hasta: {expiry_date_str}',
                    'message': 'Document valid',
                    'expiry_date': expiry_date_str
                }

        except Exception as e:
            return False, {
                'capa': 'warning',
                'razon': f'Error validando fecha de vencimiento: {str(e)}',
                'message': 'Error validating expiry date'
            }
