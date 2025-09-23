# API Documentation - WhatsApp Evolution Service

## 📋 Endpoints Disponibles

### **1. Health Check**
```
GET /api/whatsapp/health
```
Verifica el estado del servicio.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0",
  "services": {
    "evolution_api": "connected",
    "lambda": "healthy"
  }
}
```

### **2. Estado de Conexión**
```
GET /api/whatsapp/status
```
Obtiene el estado de la conexión con WhatsApp.

**Response:**
```json
{
  "connected": true,
  "instance_name": "manpower-whatsapp",
  "last_seen": "2024-01-01T00:00:00Z",
  "qr_code": "data:image/png;base64,..."
}
```

### **3. Enviar Mensaje Simple**
```
POST /api/whatsapp/send-message
```
Envía un mensaje de texto simple.

**Request:**
```json
{
  "phone_number": "+56912345678",
  "message": "Hola, tu documento ha sido procesado exitosamente."
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "msg_123456",
  "status": "sent",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### **4. Enviar Template**
```
POST /api/whatsapp/send-template
```
Envía un template de mensaje.

**Request:**
```json
{
  "phone_number": "+56912345678",
  "template_name": "document_processed",
  "parameters": {
    "document_type": "Cédula de Identidad",
    "status": "Aprobado",
    "date": "2024-01-01"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "msg_123456",
  "status": "sent",
  "template_used": "document_processed"
}
```

### **5. Conectar Instancia**
```
POST /api/whatsapp/connect
```
Conecta una nueva instancia de WhatsApp.

**Request:**
```json
{
  "instance_name": "manpower-whatsapp",
  "webhook_url": "https://your-api.com/webhook"
}
```

**Response:**
```json
{
  "success": true,
  "instance_name": "manpower-whatsapp",
  "qr_code": "data:image/png;base64,...",
  "status": "connecting"
}
```

### **6. Desconectar Instancia**
```
POST /api/whatsapp/disconnect
```
Desconecta la instancia actual.

**Response:**
```json
{
  "success": true,
  "instance_name": "manpower-whatsapp",
  "status": "disconnected"
}
```

### **7. Webhook (Recibir Mensajes)**
```
POST /api/whatsapp/webhook
```
Recibe mensajes y eventos de WhatsApp.

**Request (Ejemplo de mensaje recibido):**
```json
{
  "event": "messages.upsert",
  "instance": "manpower-whatsapp",
  "data": {
    "key": {
      "remoteJid": "56912345678@s.whatsapp.net",
      "fromMe": false,
      "id": "msg_123456"
    },
    "message": {
      "conversation": "Hola, necesito ayuda con mi documento"
    },
    "messageTimestamp": 1640995200
  }
}
```

## 🔧 Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Datos de entrada inválidos |
| 401 | Unauthorized - API Key inválida |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error interno |
| 503 | Service Unavailable - Evolution API no disponible |

## 📝 Ejemplos de Uso

### **Notificación de Documento Procesado**
```bash
curl -X POST https://your-api.com/api/whatsapp/send-message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "phone_number": "+56912345678",
    "message": "✅ Tu documento ha sido procesado exitosamente. Tipo: Cédula de Identidad, Estado: Aprobado"
  }'
```

### **Template de Documento Rechazado**
```bash
curl -X POST https://your-api.com/api/whatsapp/send-template \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "phone_number": "+56912345678",
    "template_name": "document_rejected",
    "parameters": {
      "document_type": "Cédula de Identidad",
      "reason": "Calidad de imagen insuficiente",
      "date": "2024-01-01"
    }
  }'
```

## 🔐 Autenticación

Todos los endpoints requieren autenticación mediante API Key en el header:

```
X-API-Key: your-evolution-api-key
```

## 📊 Rate Limiting

- **Mensajes por minuto**: 60
- **Templates por minuto**: 30
- **Webhooks por minuto**: 100

## 🔄 Webhooks

El servicio puede recibir los siguientes tipos de eventos:

- `messages.upsert` - Nuevo mensaje recibido
- `connection.update` - Cambio en estado de conexión
- `message.update` - Actualización de estado de mensaje
- `instance.update` - Actualización de instancia
