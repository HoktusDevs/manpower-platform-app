# Arquitectura del Microservicio - AWS Lambda

## 🏗️ Arquitectura Serverless

Este microservicio está diseñado específicamente para AWS Lambda con Serverless Framework, eliminando completamente la dependencia de Docker y contenedores.

## 📋 Componentes

### **Lambda Functions**

1. **`api`** - API Gateway Handler
   - **Trigger**: API Gateway HTTP
   - **Función**: Recibir documentos y encolarlos en SQS
   - **Timeout**: 30 segundos
   - **Memory**: 512 MB

2. **`document-processor`** - SQS Processor
   - **Trigger**: SQS Queue
   - **Función**: Procesar documentos de la cola
   - **Timeout**: 15 minutos
   - **Memory**: 2048 MB
   - **Concurrency**: 10 (limitada)

3. **`health-check`** - Scheduled Health Check
   - **Trigger**: CloudWatch Events (cada 5 minutos)
   - **Función**: Verificar salud del sistema
   - **Timeout**: 30 segundos
   - **Memory**: 256 MB

### **AWS Services**

- **SQS Queue**: Cola principal de procesamiento
- **Dead Letter Queue**: Para mensajes fallidos
- **CloudWatch Logs**: Logging automático
- **IAM Roles**: Permisos necesarios
- **API Gateway**: Endpoints HTTP

## 🔄 Flujo de Procesamiento

```
1. Cliente → API Gateway → Lambda (api)
2. Lambda (api) → SQS Queue
3. SQS Queue → Lambda (document-processor)
4. Lambda (document-processor) → Callback URL
```

## 📁 Estructura de Archivos

```
src/
├── handlers/              # Lambda handlers
│   ├── api_handler.py     # API Gateway handler
│   ├── document_processor.py # SQS processor
│   └── health_handler.py  # Health check
├── core/                  # Esquemas de datos
│   └── schemas.py
├── services/              # Pipeline de procesamiento
│   ├── document_validator.py
│   ├── ocr_service.py
│   ├── ai_classification_service.py
│   └── document_processing_pipeline.py
├── utils/                 # Utilidades
│   ├── sqs_publisher.py   # SQS publisher
│   └── callback_client.py # Callback client
└── config/                # Configuración
    └── settings.py
```

## 🚀 Ventajas de la Arquitectura Serverless

1. **Sin Servidores**: No hay infraestructura que mantener
2. **Escalabilidad Automática**: Lambda escala automáticamente
3. **Costo Eficiente**: Solo pagas por ejecución
4. **Alta Disponibilidad**: AWS maneja la redundancia
5. **Monitoreo Integrado**: CloudWatch automático
6. **Despliegue Simplificado**: Un comando para desplegar

## 🔧 Configuración

### Variables de Entorno Requeridas

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

## 📊 Monitoreo

- **CloudWatch Logs**: Logs estructurados automáticos
- **CloudWatch Metrics**: Métricas de Lambda automáticas
- **SQS Metrics**: Monitoreo de colas y mensajes
- **Health Checks**: Endpoint `/health` programado
- **Trazabilidad**: IDs únicos para cada documento

## 🛠️ Despliegue

```bash
# Desarrollo
./scripts/deploy.sh deploy dev

# Producción
./scripts/deploy.sh deploy prod

# Ver logs
./scripts/deploy.sh logs dev

# Eliminar
./scripts/deploy.sh remove prod
```

## 🔒 Seguridad

- **IAM Roles**: Permisos mínimos necesarios
- **VPC**: Opcional para mayor seguridad
- **Encryption**: En tránsito y en reposo
- **Secrets**: Variables de entorno seguras
