# ⚠️ Problemas Conocidos y Limitaciones Actuales

## 🔴 **CRÍTICO: Procesamiento Síncrono**

### Problema
El `api_handler.py` actualmente procesa documentos **síncronamente** en el mismo request HTTP.

### Impacto
- **Timeout de API Gateway (30s)**: Si OCR + IA toman más de 30 segundos, el request fallará
- **No escalable**: Un documento lento bloquea el request completo
- **Mala UX**: El cliente debe esperar todo el procesamiento antes de recibir respuesta

### Solución Recomendada
Activar procesamiento asíncrono con SQS:

1. **Descomentar** SQS Queue en `serverless.yml:193-210`
2. **Modificar** `api_handler.py` para encolar mensajes en vez de procesar directamente
3. **Activar** `document_processor.py` como consumer de SQS
4. **Responder inmediatamente** al cliente con status `202 Accepted`

```python
# En lugar de:
result = pipeline.process_document(owner_user_name, doc)

# Hacer:
sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps({
    'owner_user_name': owner_user_name,
    'document': doc
}))
return {'statusCode': 202, 'message': 'Encolado para procesamiento'}
```

---

## ⚠️ **Variables de Entorno No Garantizadas**

### Problema
El código valida variables de entorno pero **no falla el despliegue** si faltan.

### Variables Críticas
- `AZURE_VISION_ENDPOINT` - Requerido para OCR
- `AZURE_VISION_KEY` - Requerido para OCR
- `DEEPSEEK_API_KEY` o `OPENAI_API_KEY` - Requerido para clasificación IA
- `DOCUMENT_IA_PROVIDER` - Debe ser 'deepseek' u 'openai'

### Cómo Verificar
```bash
# En Lambda, revisar CloudWatch Logs al inicio:
# Buscar: "⚠️ Variables de entorno faltantes"
```

### Solución
Antes de desplegar, verificar en `.env` o serverless.yml que todas estén configuradas.

---

## ⚠️ **Validación de Identidad CL No Implementada**

### Problema
El pipeline tiene un placeholder en `document_processing_pipeline.py:179`:

```python
def _execute_identity_validation(self, contexto: Dict[str, Any]) -> Dict[str, Any]:
    """Ejecuta la validación de identidad CL (placeholder)."""
    # TODO: Implementar validación con Boostr
```

### Impacto
Para documentos tipo "Cédula de Identidad CL (Frontal)", no se valida con la API de Boostr.

### Solución
Implementar integración real con Boostr API para validar RUT chileno.

---

## ⚠️ **Dependencies en requirements-simple.txt**

### Estado Actual
✅ `pydantic==2.8.0` - Incluido
✅ `requests==2.31.0` - Incluido
✅ `azure-cognitiveservices-vision-computervision==0.9.0` - Incluido
✅ `openai==1.3.0` - Incluido

### Posible Problema
Lambda usa `requirements-simple.txt` (configurado en serverless.yml:289). Si alguna dependencia falta o tiene versión incompatible, el pipeline fallará en runtime.

---

## ⚠️ **Sin Tests de Integración**

### Problema
No hay tests que verifiquen:
- ✗ Integración con Azure Vision
- ✗ Integración con DeepSeek/OpenAI
- ✗ Flujo completo del pipeline
- ✗ Manejo de documentos reales

### Riesgo
Errores solo se descubren en producción cuando un usuario sube un documento.

### Solución Recomendada
Crear tests de integración:
```bash
# tests/integration/test_pipeline_real.py
def test_process_real_pdf():
    doc = {
        'file_url': 'https://example.com/test.pdf',
        'file_name': 'test.pdf',
        'platform_document_id': 'test-123'
    }
    result = pipeline.process_document('Test User', doc)
    assert result.processing_status == 'COMPLETED'
```

---

## ⚠️ **DynamoDB Table Name Hardcodeado**

### Problema
En `api_handler.py:47`:
```python
results_table = dynamodb.Table('document-processing-results-dev')
```

Hardcodeado a `dev`, no funciona para `prod` stage.

### Solución
```python
import os
stage = os.getenv('STAGE', 'dev')
results_table = dynamodb.Table(f'document-processing-results-{stage}')
```

---

## 📊 **Métricas de Procesamiento Actual**

### Tiempos Estimados (por documento)
- OCR (Azure Vision): 5-15 segundos
- Clasificación IA (DeepSeek): 2-5 segundos
- Extracción de datos (DeepSeek): 3-7 segundos
- **Total estimado**: 10-27 segundos por documento

### Límite de API Gateway
- **Timeout máximo**: 30 segundos
- **Riesgo**: Documentos complejos o PDFs grandes pueden exceder este límite

---

## ✅ **Lo que SÍ Funciona Ahora**

1. ✅ **Pipeline real activado** - Usa OCR e IA en vez de simulación
2. ✅ **Validación de env vars** - Advertencias en logs si faltan
3. ✅ **Manejo de None values** - DynamoDB no recibe None directos
4. ✅ **Logs detallados** - Tiempos de procesamiento y warnings
5. ✅ **Error handling** - Errores se guardan en DynamoDB con observaciones
6. ✅ **WebSocket notifications** - Via DynamoDB Streams

---

## 🚀 **Próximos Pasos Recomendados (Prioridad)**

### Alta Prioridad
1. ⚠️ **Activar SQS asíncrono** - Evitar timeouts
2. ⚠️ **Configurar env vars en AWS Lambda** - Antes de probar en producción
3. ⚠️ **Fix tabla DynamoDB hardcodeada** - Soporte multi-stage

### Media Prioridad
4. ⚠️ **Implementar validación Boostr** - Para cédulas chilenas
5. ⚠️ **Agregar tests de integración** - Validar con documentos reales
6. ⚠️ **Monitoreo de timeouts** - CloudWatch alarms

### Baja Prioridad
7. Optimizar tiempos de OCR (cache, paralelización)
8. Agregar retry logic para APIs externas
9. Implementar circuit breakers

---

## 📝 **Notas de Deployment**

### Antes de desplegar a producción:
```bash
# 1. Verificar variables de entorno
cat .env | grep -E "AZURE|DEEPSEEK|OPENAI"

# 2. Verificar requirements
cat requirements-simple.txt

# 3. Desplegar a dev primero
./scripts/deploy.sh deploy dev

# 4. Probar con documento real
curl -X POST https://api.../process-documents-platform \
  -d '{"owner_user_name": "Test", "documents": [...]}'

# 5. Revisar CloudWatch Logs
./scripts/deploy.sh logs dev

# 6. Si todo OK, desplegar a prod
./scripts/deploy.sh deploy prod
```

---

**Última actualización**: 2025-09-30
**Estado actual**: ✅ Pipeline real activado, ⚠️ Procesamiento síncrono (riesgo de timeout)
