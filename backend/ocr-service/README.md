# OCR Service

Microservicio para el procesamiento de documentos con OCR utilizando Hoktus Orchestrator.

## Descripción

Este servicio maneja la comunicación entre el frontend y el servicio de OCR de Hoktus Orchestrator, permitiendo:

- Envío de documentos para procesamiento OCR
- Recepción de callbacks con los resultados
- Almacenamiento de estados y resultados en DynamoDB

## Endpoints

### 1. Procesar Documentos
- **URL**: `POST /api/ocr/process-documents`
- **Descripción**: Envía documentos al servicio de OCR de Hoktus Orchestrator
- **Body**:
```json
{
  "owner_user_name": "Juan Pérez",
  "url_response": "https://url_response",
  "documents": [
    {
      "file_name": "cedula.pdf",
      "file_url": "https://cedula.pdf",
      "platform_document_id": "doc_123"
    }
  ]
}
```

### 2. Callback de Resultados
- **URL**: `POST /api/ocr/callback`
- **Descripción**: Recibe los resultados del procesamiento OCR
- **Body**:
```json
{
  "requestId": "uuid-request-id",
  "documents": [
    {
      "platform_document_id": "doc_123",
      "status": "completed",
      "result": {
        "success": true,
        "confidence": 95,
        "extractedText": "Texto extraído...",
        "language": "es"
      }
    }
  ]
}
```

### 3. Health Check
- **URL**: `GET /api/ocr/health`
- **Descripción**: Verifica el estado del servicio

## Arquitectura

```
Frontend → API Gateway → OCR Service → Hoktus Orchestrator
                ↓
Frontend ← API Gateway ← OCR Service ← Hoktus Orchestrator (callback)
```

## Base de Datos

### Tabla: `ocr-documents-{stage}`

**Atributos**:
- `id` (String, Primary Key): ID único del documento
- `fileName` (String): Nombre del archivo
- `fileUrl` (String): URL del archivo
- `platformDocumentId` (String): ID del documento en la plataforma
- `ownerUserName` (String): Nombre del propietario
- `status` (String): Estado del procesamiento (pending, processing, completed, failed)
- `createdAt` (String): Fecha de creación
- `updatedAt` (String): Fecha de última actualización
- `hoktusRequestId` (String): ID de la solicitud en Hoktus
- `ocrResult` (String): Resultado del OCR (JSON)
- `error` (String): Mensaje de error si aplica

**Índices**:
- `status-createdAt-index`: Para consultas por estado y fecha

## Variables de Entorno

- `HOKTUS_ORCHESTRATOR_URL`: URL del servicio de Hoktus Orchestrator
- `CALLBACK_BASE_URL`: URL base para los callbacks
- `STAGE`: Etapa de despliegue (dev, staging, prod)
- `REGION`: Región de AWS

## Despliegue

```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Desplegar
npm run deploy

# Modo offline para desarrollo
npm run offline
```

## Flujo de Trabajo

1. **Frontend** envía documentos al endpoint `/api/ocr/process-documents`
2. **OCR Service** guarda los documentos en DynamoDB con estado "pending"
3. **OCR Service** envía la solicitud a Hoktus Orchestrator
4. **Hoktus Orchestrator** procesa los documentos
5. **Hoktus Orchestrator** envía los resultados al callback `/api/ocr/callback`
6. **OCR Service** actualiza los documentos en DynamoDB con los resultados
7. **Frontend** puede consultar el estado de los documentos

## Manejo de Errores

- Validación de datos de entrada
- Manejo de timeouts en comunicación con Hoktus
- Logging detallado de errores
- Estados de error en la base de datos
- Respuestas HTTP apropiadas

## Seguridad

- CORS configurado para el frontend
- Validación de datos de entrada
- Manejo seguro de URLs y archivos
- Logging sin información sensible
