# WhatsApp Service

Microservicio para el envío y recepción de mensajes de WhatsApp utilizando Evolution API.

## Características

- ✅ Envío de mensajes de texto
- ✅ Envío de mensajes con multimedia (imágenes, documentos, audio, video)
- ✅ Gestión de sesiones de WhatsApp por empresa
- ✅ Webhooks para recepción de mensajes
- ✅ Integración con Evolution API
- ✅ Almacenamiento en DynamoDB

## Configuración

### Variables de Entorno

```bash
EVOLUTION_API_URL=https://whatsappchatbothardcoded-production.up.railway.app
EVOLUTION_API_KEY=
SESSIONS_TABLE=whatsapp-sessions-dev
```

### Configuración del Servicio de WhatsApp

El servicio ya está configurado y funcionando en Railway:
- **URL**: `https://whatsappchatbothardcoded-production.up.railway.app`
- **Estado**: Conectado y funcionando
- **No requiere configuración adicional**

## Endpoints

### Gestión de Sesiones

#### Crear Sesión
```http
POST /sessions
Content-Type: application/json

{
  "companyId": "company-123",
  "instanceName": "whatsapp-company-123"
}
```

#### Obtener Sesión por Empresa
```http
GET /sessions/company/{companyId}
```

#### Obtener Estado de Sesión
```http
GET /sessions/{sessionId}/status
```

#### Eliminar Sesión
```http
DELETE /sessions/{sessionId}
```

### Envío de Mensajes

#### Enviar Mensaje de Texto
```http
POST /messages/send/text
Content-Type: application/json

{
  "to": "+1234567890",
  "message": "Hola, este es un mensaje de prueba",
  "companyId": "company-123"
}
```

#### Enviar Mensaje con Media
```http
POST /messages/send/media
Content-Type: application/json

{
  "to": "+1234567890",
  "message": "Mira esta imagen",
  "mediaUrl": "https://example.com/image.jpg",
  "type": "image",
  "fileName": "imagen.jpg",
  "companyId": "company-123"
}
```

#### Enviar Mensaje (Genérico)
```http
POST /messages/send
Content-Type: application/json

{
  "to": "+1234567890",
  "message": "Mensaje de prueba",
  "type": "text",
  "companyId": "company-123"
}
```

#### Enviar Mensaje de Plantilla
```http
POST /messages/send/template
Content-Type: application/json

{
  "companyId": "company-123",
  "to": "+56977414617",
  "templateName": "send_documents_missing_3378594",
  "templateParameters": [
    { "type": "text", "text": "Diego ordenes" },
    { "type": "text", "text": "Nombre archivo 1" },
    { "type": "text", "text": "Nombre archivo 2" }
  ],
  "userName": "Diego ordenes"
}
```

### Webhooks

#### Procesar Webhook de Evolution API
```http
POST /webhook
Content-Type: application/json
apikey: change-me

{
  "event": "MESSAGES_UPSERT",
  "data": {
    "sessionId": "whatsapp-company-123",
    "message": {
      "from": "+1234567890",
      "text": "Mensaje recibido"
    }
  }
}
```

#### Configurar Webhook
```http
POST /webhook/set
Content-Type: application/json

{
  "sessionId": "whatsapp-company-123",
  "webhookUrl": "https://api.example.com/webhook"
}
```

## Flujo de Trabajo

1. **Crear Sesión**: Crear una nueva sesión de WhatsApp para una empresa
2. **Escanear QR**: Usar el QR code devuelto para conectar WhatsApp
3. **Enviar Mensajes**: Una vez conectado, enviar mensajes
4. **Recibir Mensajes**: Los webhooks procesan mensajes entrantes

## Estructura de Datos

### WhatsAppSession
```typescript
{
  sessionId: string;
  instanceName: string;
  status: 'connected' | 'disconnected' | 'connecting';
  qrCode?: string;
  createdAt: number;
  lastActivity: number;
  companyId: string;
}
```

### WhatsAppMessage
```typescript
{
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: number;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    url?: string;
  };
}
```

## Despliegue

### Desplegar WhatsApp Service
```bash
cd backend/whatsapp-service

# Instalar dependencias
npm install

# Configurar variables de entorno (opcional, ya están configuradas por defecto)
export EVOLUTION_API_URL="https://whatsappchatbothardcoded-production.up.railway.app"
export EVOLUTION_API_KEY=""

# Desplegar a AWS
serverless deploy --stage dev

# Desplegar offline para desarrollo
serverless offline
```

## Integración con API Gateway

El servicio se integra automáticamente con el API Gateway principal a través de la ruta `/whatsapp/*`.

## Notas Importantes

- Cada empresa puede tener una sola sesión de WhatsApp activa
- Las sesiones se almacenan en DynamoDB con TTL automático
- El servicio de WhatsApp ya está funcionando en Railway
- No se requiere configuración adicional de Evolution API
- Los mensajes de plantilla deben estar previamente creados en Meta Business
