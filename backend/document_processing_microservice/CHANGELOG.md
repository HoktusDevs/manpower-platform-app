# Changelog - Document Processing Microservice

## [2.0.0] - 2025-09-30

### ✅ **Cambios Mayores Completados**

#### 🔄 **Procesamiento Asíncrono con SQS**
- **ANTES**: Procesamiento síncrono en API Gateway (riesgo de timeout >30s)
- **AHORA**: Procesamiento asíncrono con SQS Queue
  - `api_handler.py` encola documentos y responde `202 Accepted` inmediatamente
  - `document_processor.py` consume de SQS y procesa en background
  - Sin riesgo de timeout de API Gateway
  - Escalable automáticamente por Lambda

**Archivos modificados**:
- `serverless.yml`: SQS Queue y DLQ activados (líneas 194-210)
- `src/handlers/api_handler.py`: Lógica de encolamiento
- `serverless.yml`: document-processor con trigger SQS (líneas 106-112)

**Estado**: ✅ **Completado y funcional**

---

#### 🔍 **Pipeline Real de Procesamiento Activado**
- **ANTES**: Lógica simulada con datos hardcodeados
- **AHORA**: Pipeline completo funcional
  - ✅ OCR real con Azure Vision
  - ✅ Clasificación IA real con DeepSeek/OpenAI
  - ✅ Extracción de datos estructurados
  - ✅ Validación de reglas de negocio
  - ✅ Validación Boostr para RUT chileno

**Archivos modificados**:
- `src/services/ocr_service.py`: Integración Azure Vision
- `src/services/ai_classification_service.py`: DeepSeek/OpenAI
- `src/services/document_processing_pipeline.py`: Pipeline completo
- `src/services/boostr_service.py`: **NUEVO** - Validación identidad CL

**Estado**: ✅ **Completado** (requiere env vars configuradas)

---

#### 🔐 **Validación Boostr Implementada**
- **ANTES**: Placeholder sin implementación
- **AHORA**: Validación real de RUT chileno
  - Valida RUT contra base de datos Boostr
  - Extrae datos de cédula (nombre, RUT, fecha nacimiento)
  - Compara con datos del documento
  - Rechaza automáticamente si RUT inválido
  - Revisión manual si Boostr API falla

**Archivos creados**:
- `src/services/boostr_service.py`

**Archivo modificado**:
- `src/services/document_processing_pipeline.py:179-218`

**Estado**: ✅ **Completado** (requiere `BOOSTR_API_KEY`)

---

#### ⚙️ **Validaciones y Manejo Robusto de Errores**

**1. Validación de Variables de Entorno**
- Valida al inicio: `AZURE_VISION_KEY`, `DEEPSEEK_API_KEY`, `DOCUMENT_PROCESSING_QUEUE_URL`
- Retorna `503 Service Unavailable` si faltan
- Logs claros de variables faltantes

**2. Manejo de None Values en DynamoDB**
- Expresiones dinámicas para campos opcionales
- No envía `None` directo a DynamoDB (causa errores)

**3. Stage Dinámico**
- **ANTES**: `document-processing-results-dev` hardcodeado
- **AHORA**: `document-processing-results-{STAGE}` dinámico
- Funciona en dev, staging, prod

**Archivos modificados**:
- `src/handlers/api_handler.py:20-56`

**Estado**: ✅ **Completado**

---

#### 📊 **Nuevos Estados de Procesamiento**

**Estados agregados**:
- `QUEUED`: Documento encolado en SQS
- `PROCESSING`: Documento siendo procesado por worker
- `COMPLETED`: Procesamiento exitoso
- `FAILED`: Error en procesamiento

**Flujo completo**:
```
Cliente → API → DynamoDB (QUEUED) → SQS Queue
             ↓
          Worker consume SQS
             ↓
   DynamoDB (PROCESSING) → OCR → IA → Validación
             ↓
   DynamoDB (COMPLETED/FAILED)
             ↓
   DynamoDB Stream → WebSocket → Cliente notificado
```

---

### 📝 **Cambios en API**

#### **POST /api/v1/platform/process-documents-platform**

**Antes**:
```json
{
  "statusCode": 200,
  "body": {
    "message": "Documentos procesados",
    "processed": 1
  }
}
```

**Ahora**:
```json
{
  "statusCode": 202,
  "body": {
    "message": "Documentos encolados exitosamente para procesamiento asíncrono",
    "status": "accepted",
    "enqueued": 1,
    "failed": 0,
    "batch_id": "uuid",
    "note": "Los documentos serán procesados en segundo plano. Recibirás notificaciones WebSocket con el progreso."
  }
}
```

**Cambio**: Respuesta `202 Accepted` inmediata, procesamiento en background

---

### 🔧 **Configuración Requerida**

#### **Variables de Entorno Nuevas/Actualizadas**

```bash
# SQS (ahora requerido)
DOCUMENT_PROCESSING_QUEUE_URL=<auto-generado por CloudFormation>

# Azure Vision (requerido para OCR)
AZURE_VISION_ENDPOINT=https://....cognitiveservices.azure.com/
AZURE_VISION_KEY=your_key

# IA Provider (requerido)
DOCUMENT_IA_PROVIDER=deepseek  # o 'openai'
DEEPSEEK_API_KEY=your_key
# o
OPENAI_API_KEY=your_key

# Boostr (requerido para cédulas chilenas)
BOOSTR_API_KEY=your_key
BOOSTR_BASE_URL=https://api.boostr.cl
BOOSTR_TIMEOUT_SECONDS=15

# Stage (auto-configurado)
STAGE=dev|staging|prod
```

---

### 🚀 **Deployment**

#### **Comandos Actualizados**

```bash
# Desplegar (crea SQS Queue automáticamente)
./scripts/deploy.sh deploy dev

# Verificar recursos creados
aws sqs list-queues --queue-name-prefix doc-processor
aws lambda list-functions --query "Functions[?contains(FunctionName, 'document-processor')]"

# Monitorear procesamiento
./scripts/deploy.sh logs dev -f document-processor
```

#### **Outputs de CloudFormation**

Después del deploy, CloudFormation exporta:
- `DocumentProcessingQueue` - ARN de la cola SQS
- `DocumentProcessingDLQ` - ARN de Dead Letter Queue
- `ApiGatewayRestApiId` - ID del API Gateway

---

### ⚠️ **Breaking Changes**

1. **Response Code cambia de 200 a 202**
   - Clientes deben manejar `202 Accepted`
   - Resultado no estará inmediatamente disponible
   - Deben suscribirse a WebSocket para notificaciones

2. **SQS Queue es obligatoria**
   - El microservicio ya no funciona sin SQS
   - Debe estar configurada `DOCUMENT_PROCESSING_QUEUE_URL`

3. **Estado inicial cambia de PROCESSING a QUEUED**
   - Clientes deben manejar estado `QUEUED`

---

### 📦 **Recursos AWS Creados**

Al desplegar, se crean automáticamente:
- **SQS Queue**: `doc-processor-queue-{stage}`
- **Dead Letter Queue**: `doc-processor-dlq-{stage}`
- **Lambda Trigger**: document-processor suscrito a SQS
- **IAM Permissions**: sqs:SendMessage, sqs:ReceiveMessage

---

### 🐛 **Bugs Corregidos**

1. ✅ Timeout de API Gateway en documentos grandes
2. ✅ None values causando errores en DynamoDB
3. ✅ Table name hardcodeado a 'dev'
4. ✅ Variables de entorno sin validar
5. ✅ Validación Boostr sin implementar
6. ✅ Nombres hardcodeados en validación

---

### 📋 **Testing Recomendado**

Antes de usar en producción:

```bash
# 1. Verificar que SQS fue creada
aws sqs get-queue-url --queue-name doc-processor-queue-dev

# 2. Enviar documento de prueba
curl -X POST https://api.../process-documents-platform \
  -H "Content-Type: application/json" \
  -d '{
    "owner_user_name": "Test User",
    "documents": [{
      "file_url": "https://example.com/test.pdf",
      "file_name": "test.pdf",
      "platform_document_id": "test-123"
    }]
  }'

# 3. Verificar que llegó a SQS
aws sqs receive-message --queue-url <queue-url>

# 4. Monitorear logs del processor
aws logs tail /aws/lambda/doc-processor-simple-dev-document-processor --follow

# 5. Verificar DynamoDB
aws dynamodb get-item --table-name document-processing-results-dev \
  --key '{"document_id": {"S": "test-123"}}'
```

---

### 🔮 **Próximos Pasos (No incluidos en esta versión)**

1. Tests de integración automatizados
2. Retry logic para APIs externas con circuit breaker
3. Métricas custom en CloudWatch
4. Optimización de costos (cache de OCR, paralelización)
5. Soporte para procesamiento batch masivo (>100 docs)

---

### 📚 **Documentación Actualizada**

- `ISSUES.md` - Problemas conocidos y limitaciones
- `ARCHITECTURE.md` - Arquitectura serverless actualizada
- `README.md` - Instrucciones de deployment actualizadas

---

**Migración de v1.x a v2.0.0**: Requiere re-deploy completo (`serverless remove` → `serverless deploy`)

**Compatibilidad hacia atrás**: ❌ No compatible (cambios en API response)
