# 📡 WebSocket Service - Tiempo Real

Servicio WebSocket para actualizaciones en tiempo real de la tabla de carpetas usando API Gateway WebSocket y DynamoDB.

## 🏗️ Arquitectura

```
Frontend WebSocket Client
          ↓
API Gateway WebSocket
          ↓
Lambda Functions (connect/disconnect/broadcast)
          ↓
DynamoDB (connections) + Broadcast to clients
          ↑
HTTP Endpoint (/broadcast)
          ↑
folders-service (DynamoDB Stream)
```

## 🚀 Despliegue

```bash
cd backend/websocket-service
npm install
sls deploy --stage dev
```

## 📋 Endpoints y Rutas

### WebSocket Routes
- `$connect` - Establece conexión WebSocket
- `$disconnect` - Cierra conexión WebSocket
- `$default` - Maneja mensajes del cliente

### HTTP Endpoints
- `POST /broadcast` - Endpoint para recibir eventos de broadcast
- `GET /health` - Health check del servicio

## 🔧 Variables de Entorno

```bash
CONNECTIONS_TABLE=manpower-websocket-connections-dev
FOLDERS_TABLE=manpower-folders-dev
WEBSOCKET_ENDPOINT=wss://your-api.execute-api.us-east-1.amazonaws.com/dev
```

## 🔌 Conexión desde Frontend

### 1. URL de Conexión
```javascript
const websocketUrl = 'wss://your-websocket-api.execute-api.us-east-1.amazonaws.com/dev';
const authToken = localStorage.getItem('cognito_access_token');

// Conectar con token de autenticación
const socket = new WebSocket(`${websocketUrl}?token=${encodeURIComponent(authToken)}`);
```

### 2. Eventos del Cliente

#### Conectar
```javascript
socket.onopen = () => {
  console.log('Conectado a WebSocket');

  // Suscribirse a actualizaciones de carpetas
  socket.send(JSON.stringify({
    action: 'subscribe_folders'
  }));
};
```

#### Recibir Mensajes
```javascript
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'realtime_update':
      handleFolderUpdate(message);
      break;
    case 'connection_established':
      console.log('Conexión establecida');
      break;
  }
};
```

#### Manejar Actualizaciones
```javascript
function handleFolderUpdate(message) {
  const { action, data } = message;

  switch (action) {
    case 'folder_created':
      // Agregar nueva carpeta a la UI
      addFolderToUI(data.folder);
      break;

    case 'folder_updated':
      // Actualizar carpeta existente
      updateFolderInUI(data.folder);
      break;

    case 'folder_deleted':
      // Remover carpeta de la UI
      removeFolderFromUI(data.folderId);
      break;
  }
}
```

## 📨 Formato de Mensajes

### Mensaje de Actualización en Tiempo Real
```json
{
  "type": "realtime_update",
  "action": "folder_created",
  "data": {
    "folderId": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "user-123",
    "eventType": "INSERT",
    "folder": {
      "folderId": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Nueva Carpeta",
      "type": "Cargo",
      "parentId": null,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "timestamp": 1640995200000
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Tipos de Acciones
- `folder_created` - Nueva carpeta creada
- `folder_updated` - Carpeta modificada
- `folder_deleted` - Carpeta eliminada

## 🗄️ Gestión de Conexiones

### Tabla de Conexiones
```javascript
// Estructura de conexión en DynamoDB
{
  connectionId: "L12345678=", // ID único de la conexión
  userId: "user-123",         // Usuario autenticado
  email: "user@example.com",  // Email del usuario
  role: "admin",              // Rol del usuario
  connectedAt: "2024-01-15T10:30:00Z",
  lastActivity: "2024-01-15T10:35:00Z",
  ttl: 1640995200             // Auto-cleanup después de 2 horas
}
```

### Auto-cleanup
- Conexiones expiran automáticamente después de 2 horas
- Conexiones stale se remueven automáticamente al enviar mensajes
- TTL de DynamoDB limpia conexiones automáticamente

## 🔐 Autenticación

### Token JWT en Query Parameters
```javascript
// El token JWT se envía como query parameter al conectar
const websocketUrl = `wss://api.execute-api.us-east-1.amazonaws.com/dev?token=${authToken}`;
```

### Validación del Token
```javascript
// El handler de conexión extrae y valida el token
const userInfo = extractUserFromEvent(event);
if (!userInfo) {
  return { statusCode: 401, body: 'Authorization required' };
}
```

## 📡 Broadcasting

### Desde otros servicios (folders-service)
```javascript
// Enviar mensaje de broadcast vía HTTP
const response = await fetch(`${websocketServiceUrl}/broadcast`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.INTERNAL_API_KEY
  },
  body: JSON.stringify({
    action: 'folder_created',
    data: {
      folderId: '123',
      userId: 'user-123',
      eventType: 'INSERT',
      folder: folderData,
      timestamp: Date.now()
    }
  })
});
```

### Broadcast Directo (Lambda)
```javascript
// Invocar función Lambda directamente
const lambda = new AWS.Lambda();
await lambda.invoke({
  FunctionName: 'websocket-service-dev-broadcastHandler',
  Payload: JSON.stringify(broadcastEvent)
}).promise();
```

## 🔍 Monitoreo

### CloudWatch Logs
- `/aws/lambda/websocket-service-dev-connectHandler`
- `/aws/lambda/websocket-service-dev-disconnectHandler`
- `/aws/lambda/websocket-service-dev-broadcastHandler`

### Métricas Importantes
- Número de conexiones activas
- Mensajes broadcast exitosos/fallidos
- Conexiones por usuario
- Duración promedio de conexiones

### Health Check
```bash
curl https://your-api.execute-api.us-east-1.amazonaws.com/dev/health
```

```json
{
  "success": true,
  "message": "Broadcast service is healthy",
  "activeConnections": 15,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🛠️ Desarrollo Local

### Testing WebSocket Connection
```javascript
// Usar websocat para testing
websocat "wss://your-api.execute-api.us-east-1.amazonaws.com/dev?token=YOUR_JWT_TOKEN"

// Enviar mensaje
{"action": "subscribe_folders"}
```

### Mock de Broadcast
```bash
# Testear endpoint de broadcast
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/dev/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "action": "folder_created",
    "data": {
      "folderId": "test-123",
      "userId": "user-123",
      "eventType": "INSERT",
      "folder": {"name": "Test Folder"},
      "timestamp": 1640995200000
    }
  }'
```

## ⚡ Optimizaciones

### Filtrado por Usuario
```javascript
// Solo enviar a usuarios específicos
const broadcastEvent = {
  action: 'folder_updated',
  data: folderData,
  targetUsers: ['user-123', 'user-456'] // Opcional
};
```

### Batch Processing
- Los mensajes se procesan en batches para mejor performance
- Reconexión automática con exponential backoff
- Heartbeat para mantener conexiones activas

## 🔄 Integración con Frontend

Ver `example-client.js` para un cliente completo con:
- ✅ Reconexión automática
- ✅ Heartbeat/ping-pong
- ✅ Manejo de errores
- ✅ Event handlers tipados
- ✅ Gestión del estado de conexión

## 📦 Outputs del Despliegue

Después del despliegue:
```yaml
WebSocketURL: wss://abc123.execute-api.us-east-1.amazonaws.com/dev
WebSocketApiId: abc123
ConnectionsTableName: manpower-websocket-connections-dev
```