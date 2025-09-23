# WebSocket Implementation for OCR Service

## Overview

Este documento describe la implementación del WebSocket para el OCR service que permite recibir notificaciones en tiempo real sobre el estado de los documentos procesados.

## Arquitectura

### Componentes principales:

1. **WebSocket Handler** (`src/handlers/websocket.ts`)
   - Maneja conexiones, desconexiones y mensajes
   - Procesa diferentes tipos de mensajes del cliente

2. **WebSocket Service** (`src/services/webSocketService.ts`)
   - Gestiona las conexiones activas
   - Envía notificaciones a clientes conectados
   - Maneja el broadcast de mensajes

3. **Integración con Callback** (`src/handlers/ocr.ts`)
   - Notifica automáticamente cuando se actualiza un documento
   - Envía datos del OCR result a clientes conectados

## Endpoints WebSocket

### Conexión WebSocket
```
wss://xtspcl5cj6.execute-api.us-east-1.amazonaws.com/dev
```

### Endpoints HTTP adicionales:

1. **Notificar actualización de documento**
   ```
   POST /api/ocr/notify-update
   ```
   - Permite notificar manualmente sobre cambios en documentos

2. **Obtener estado de documento**
   ```
   GET /api/ocr/document/{documentId}
   ```
   - Obtiene el estado actual de un documento específico

3. **Obtener documentos por estado**
   ```
   GET /api/ocr/documents?status={status}
   ```
   - Obtiene todos los documentos con un estado específico

## Protocolo WebSocket

### Mensajes del Cliente al Servidor:

#### 1. Ping
```json
{
  "type": "ping"
}
```

#### 2. Suscribirse a actualizaciones
```json
{
  "type": "subscribe_documents"
}
```

#### 3. Obtener estado de documento
```json
{
  "type": "get_document_status",
  "documentId": "document-123"
}
```

### Mensajes del Servidor al Cliente:

#### 1. Conexión establecida
```json
{
  "type": "connection_established",
  "message": "Connected to OCR service",
  "connectionId": "abc123",
  "timestamp": "2025-01-22T10:30:00Z"
}
```

#### 2. Pong (respuesta a ping)
```json
{
  "type": "pong",
  "timestamp": "2025-01-22T10:30:00Z"
}
```

#### 3. Actualización de documento
```json
{
  "type": "document_update",
  "documentId": "document-123",
  "status": "completed",
  "ocrResult": {
    "success": true,
    "confidence": 95,
    "extractedText": "...",
    "fields": {...}
  },
  "timestamp": "2025-01-22T10:30:00Z"
}
```

#### 4. Estado de documento
```json
{
  "type": "document_status",
  "documentId": "document-123",
  "message": "Document status requested",
  "timestamp": "2025-01-22T10:30:00Z"
}
```

## Estados de Documentos

- `pending`: Documento enviado, esperando procesamiento
- `processing`: Documento siendo procesado por Hoktus
- `completed`: Procesamiento completado exitosamente
- `failed`: Procesamiento falló

## Implementación en el Frontend

### JavaScript/TypeScript Example:

```typescript
class OCRWebSocketClient {
  private ws: WebSocket;
  private reconnectInterval: number = 5000;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;

  constructor(url: string) {
    this.connect(url);
  }

  private connect(url: string) {
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.subscribeToDocuments();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(url);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'connection_established':
        console.log('Connection established:', data.message);
        break;
        
      case 'document_update':
        this.onDocumentUpdate(data);
        break;
        
      case 'document_status':
        this.onDocumentStatus(data);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private onDocumentUpdate(data: any) {
    console.log('Document updated:', data.documentId, data.status);
    // Actualizar UI con el nuevo estado
    this.updateDocumentUI(data.documentId, data.status, data.ocrResult);
  }

  private onDocumentStatus(data: any) {
    console.log('Document status:', data);
    // Manejar respuesta de estado de documento
  }

  private subscribeToDocuments() {
    this.send({
      type: 'subscribe_documents'
    });
  }

  private send(message: any) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private attemptReconnect(url: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(url);
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  public getDocumentStatus(documentId: string) {
    this.send({
      type: 'get_document_status',
      documentId: documentId
    });
  }

  public ping() {
    this.send({
      type: 'ping'
    });
  }

  public disconnect() {
    this.ws.close();
  }
}

// Uso:
const wsClient = new OCRWebSocketClient('wss://your-api-gateway-url/dev');
```

## Configuración del Servidor

### Variables de entorno necesarias:

- `WEBSOCKET_ENDPOINT`: URL del WebSocket API Gateway
- `AWS_REGION`: Región de AWS
- `STAGE`: Etapa de despliegue (dev/staging/prod)

### Permisos IAM requeridos:

- `execute-api:ManageConnections`: Para enviar mensajes a conexiones WebSocket
- `dynamodb:*`: Para acceder a la tabla de documentos OCR
- `s3:GetObject`: Para acceder a archivos S3

## Despliegue

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Desplegar el servicio:
   ```bash
   serverless deploy --stage dev
   ```

3. Obtener la URL del WebSocket:
   ```bash
   serverless info --stage dev
   ```

## Monitoreo

### Logs importantes:

- Conexiones establecidas: `Connection established`
- Desconexiones: `Connection removed`
- Notificaciones enviadas: `Document update notification sent`
- Errores de conexión: `Failed to send message to connection`

### Métricas útiles:

- Número de conexiones activas
- Tiempo de respuesta de notificaciones
- Tasa de errores de conexión
- Latencia del WebSocket

## Troubleshooting

### Problemas comunes:

1. **Conexión no se establece**
   - Verificar URL del WebSocket
   - Revisar permisos IAM
   - Comprobar configuración de CORS
   - Verificar que el API Gateway esté desplegado correctamente

2. **No se reciben notificaciones**
   - Verificar que el callback esté funcionando
   - Revisar logs del WebSocket service
   - Comprobar que el documento existe en DynamoDB
   - Verificar que el WebSocket service esté usando el handler correcto

3. **Conexiones se pierden frecuentemente**
   - Implementar heartbeat/ping
   - Revisar timeout de conexión
   - Verificar estabilidad de red
   - Comprobar configuración de CloudFront

4. **Problemas específicos con S3/CloudFront**
   - Verificar que el frontend esté usando la URL correcta del WebSocket
   - Comprobar que CORS esté configurado para permitir WebSocket
   - Verificar que el API Gateway tenga permisos para WebSocket
   - Revisar que el WebSocket endpoint esté accesible desde CloudFront

### Configuración para S3/CloudFront:

1. **URLs del WebSocket por entorno:**
   - Desarrollo: `wss://xtspcl5cj6.execute-api.us-east-1.amazonaws.com/dev`
   - Staging: `wss://staging-websocket.manpower-platform.com`
   - Producción: `wss://websocket.manpower-platform.com`

2. **Configuración CORS necesaria:**
   ```yaml
   Access-Control-Allow-Origin: "*"
   Access-Control-Allow-Headers: "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, Sec-WebSocket-Protocol, Sec-WebSocket-Version, Sec-WebSocket-Key"
   ```

3. **Verificación de conectividad:**
   ```bash
   # Probar conexión WebSocket
   wscat -c wss://xtspcl5cj6.execute-api.us-east-1.amazonaws.com/dev
   ```

### Debug:

```bash
# Ver logs en tiempo real
serverless logs -f websocketConnect --tail

# Ver logs de notificaciones
serverless logs -f notifyDocumentUpdate --tail
```
