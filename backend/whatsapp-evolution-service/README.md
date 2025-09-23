# WhatsApp Evolution Service - AWS Lambda

Microservicio especializado en la gestión de WhatsApp mediante Evolution API desplegado en AWS Lambda con Serverless Framework.

## 🏗️ Arquitectura

```
whatsapp-evolution-service/
├── src/
│   ├── handlers/               # Lambda handlers
│   ├── services/              # Servicios de WhatsApp
│   ├── models/                # Modelos de datos
│   ├── utils/                 # Utilidades compartidas
│   └── config/                # Configuración
├── tests/                     # Tests unitarios e integración
├── scripts/                   # Scripts de despliegue
└── docs/                      # Documentación
```

## 🚀 Características

- **Serverless**: Desplegado en AWS Lambda con Serverless Framework
- **Evolution API**: Integración completa con Evolution API
- **Notificaciones**: Sistema de notificaciones automáticas
- **Templates**: Gestión de templates de mensajes
- **Webhooks**: Manejo de webhooks de WhatsApp
- **Escalabilidad**: Procesamiento paralelo y escalable

## 📋 Endpoints

### GET `/api/whatsapp/status`
Obtiene el estado de la conexión con WhatsApp.

### POST `/api/whatsapp/send-message`
Envía un mensaje simple a WhatsApp.

### POST `/api/whatsapp/send-template`
Envía un template de mensaje.

### POST `/api/whatsapp/webhook`
Webhook para recibir mensajes de WhatsApp.

## 🔧 Configuración

### Variables de Entorno

```bash
# Evolution API
EVOLUTION_API_URL=https://your-evolution-api.com
EVOLUTION_API_KEY=your_evolution_api_key
INSTANCE_NAME=manpower-whatsapp

# AWS
AWS_REGION=us-east-1
STAGE=dev
```

## 🚀 Despliegue

```bash
# Desarrollo
./scripts/deploy.sh deploy dev

# Producción
./scripts/deploy.sh deploy prod
```

## 📊 Monitoreo

- **CloudWatch Logs**: Logs estructurados automáticos
- **Health Checks**: Endpoint `/health` para monitoreo
- **Métricas**: Métricas de mensajes enviados/recibidos
