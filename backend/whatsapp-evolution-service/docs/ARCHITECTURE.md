# Arquitectura del WhatsApp Evolution Service

## 🏗️ Arquitectura Serverless

Este microservicio está diseñado específicamente para AWS Lambda con Serverless Framework, proporcionando una solución escalable y eficiente para la gestión de WhatsApp.

## 📋 Componentes

### **Lambda Functions**

1. **`webhook`** - Webhook Handler
   - **Trigger**: API Gateway HTTP
   - **Función**: Recibir mensajes y eventos de WhatsApp
   - **Timeout**: 30 segundos
   - **Memory**: 256 MB

2. **`send-message`** - Message Sender
   - **Trigger**: API Gateway HTTP
   - **Función**: Enviar mensajes simples
   - **Timeout**: 30 segundos
   - **Memory**: 512 MB

3. **`send-template`** - Template Sender
   - **Trigger**: API Gateway HTTP
   - **Función**: Enviar templates de mensajes
   - **Timeout**: 30 segundos
   - **Memory**: 512 MB

4. **`status`** - Status Checker
   - **Trigger**: API Gateway HTTP
   - **Función**: Verificar estado de conexión
   - **Timeout**: 15 segundos
   - **Memory**: 256 MB

5. **`connect`** - Instance Connector
   - **Trigger**: API Gateway HTTP
   - **Función**: Conectar instancia de WhatsApp
   - **Timeout**: 30 segundos
   - **Memory**: 512 MB

6. **`disconnect`** - Instance Disconnector
   - **Trigger**: API Gateway HTTP
   - **Función**: Desconectar instancia
   - **Timeout**: 30 segundos
   - **Memory**: 512 MB

### **AWS Services**

- **API Gateway**: Endpoints HTTP
- **Lambda Functions**: Procesamiento serverless
- **CloudWatch Logs**: Logging automático
- **IAM Roles**: Permisos necesarios

## 🔄 Flujo de Procesamiento

```
1. Cliente → API Gateway → Lambda (send-message)
2. Lambda → Evolution API → WhatsApp
3. WhatsApp → Evolution API → Webhook → Lambda (webhook)
4. Lambda (webhook) → Procesamiento → Respuesta
```

## 📁 Estructura de Archivos

```
src/
├── handlers/              # Lambda handlers
│   ├── webhook_handler.py     # Webhook handler
│   ├── message_handler.py     # Message sender
│   ├── status_handler.py      # Status checker
│   ├── health_handler.py      # Health check
│   └── instance_handler.py    # Instance management
├── services/              # Servicios de WhatsApp
│   ├── evolution_client.py    # Evolution API client
│   ├── message_service.py     # Message service
│   └── template_service.py    # Template service
├── models/                 # Modelos de datos
│   └── message_models.py      # Message models
├── utils/                  # Utilidades
│   └── response_utils.py      # Response utilities
└── config/                 # Configuración
    └── settings.py            # Settings
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
# Evolution API
EVOLUTION_API_URL=https://your-evolution-api.com
EVOLUTION_API_KEY=your_evolution_api_key
INSTANCE_NAME=manpower-whatsapp

# AWS
AWS_REGION=us-east-1
STAGE=dev
```

## 📊 Monitoreo

- **CloudWatch Logs**: Logs estructurados automáticos
- **CloudWatch Metrics**: Métricas de Lambda automáticas
- **Health Checks**: Endpoint `/health` programado
- **Trazabilidad**: IDs únicos para cada mensaje

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
- **API Keys**: Autenticación con Evolution API
- **HTTPS**: Comunicación encriptada
- **Validation**: Validación de entrada de datos
