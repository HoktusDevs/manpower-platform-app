# Document Processing Microservice - AWS Lambda

Microservicio especializado en el procesamiento asíncrono de documentos de plataforma desplegado en AWS Lambda con Serverless Framework.

## 🏗️ Arquitectura

```
document_processing_microservice/
├── src/
│   ├── handlers/               # Lambda handlers
│   ├── core/                   # Lógica de negocio central
│   ├── services/               # Servicios de procesamiento
│   ├── utils/                  # Utilidades compartidas
│   └── config/                 # Configuración
├── tests/                      # Tests unitarios e integración
├── scripts/                    # Scripts de despliegue
└── docs/                       # Documentación
```

## 🚀 Características

- **Serverless**: Desplegado en AWS Lambda con Serverless Framework
- **Procesamiento Asíncrono**: Usa SQS para procesamiento no bloqueante
- **Tolerancia a Fallos**: Reintentos automáticos y manejo de errores
- **Escalabilidad**: Procesamiento paralelo de hasta 30 documentos
- **Validación Robusta**: Verificación de URLs y tipos de archivo
- **Pipeline de IA**: OCR, clasificación, extracción y validación
- **Callbacks**: Notificación de resultados a URLs externas

## 📋 Endpoints

### POST `/api/v1/platform/process-documents-platform`

Procesa una lista de documentos de forma asíncrona.

**Request:**
```json
{
  "owner_user_name": "Juan Pérez",
  "documents": [
    {
      "file_url": "https://url-publica.com/documento.pdf",
      "file_name": "cedula.pdf",
      "platform_document_id": "doc_12345"
    }
  ],
  "url_response": "https://callback-url.com/results"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Se encolaron exitosamente 1 documentos para procesamiento asíncrono.",
  "data": {
    "enqueued": 1,
    "failed": 0,
    "total": 1
  }
}
```

## 🔧 Configuración

### Variables de Entorno

```bash
# AWS SQS
DOCUMENT_PROCESSING_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/document-processing-queue

# Callbacks
DOCUMENT_RESULTS_NOTIFICATION_URL=https://callback-service.com/results

# Azure Vision (OCR)
AZURE_VISION_ENDPOINT=https://your-vision.cognitiveservices.azure.com/
AZURE_VISION_KEY=your_vision_key

# IA Models
DEEPSEEK_API_KEY=your_deepseek_key
OPENAI_API_KEY=your_openai_key

# Boostr (Identidad CL)
BOOSTR_API_KEY=your_boostr_key
BOOSTR_BASE_URL=https://api.boostr.cl
```

## 🚀 Despliegue con Serverless

### Prerrequisitos

```bash
# Instalar Serverless Framework
npm install -g serverless

# Instalar plugins
npm install

# Configurar AWS CLI
aws configure
```

### Desplegar

```bash
# Desarrollo
./scripts/deploy.sh deploy dev

# Producción
./scripts/deploy.sh deploy prod

# Ver información del despliegue
./scripts/deploy.sh info dev
```

### Comandos Útiles

```bash
# Ver logs
./scripts/deploy.sh logs dev

# Eliminar despliegue
./scripts/deploy.sh remove prod

# Modo offline (desarrollo local)
./scripts/deploy.sh offline
```

## 📊 Monitoreo

- **CloudWatch Logs**: Logs estructurados con timestamps
- **CloudWatch Metrics**: Métricas automáticas de Lambda
- **Health Checks**: Endpoint `/health` para monitoreo
- **SQS Metrics**: Monitoreo de colas y mensajes
- **Trazabilidad**: IDs únicos para cada documento procesado
