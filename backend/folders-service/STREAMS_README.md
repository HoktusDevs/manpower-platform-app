# DynamoDB Streams para Tiempo Real - Folders Service

## 📡 Resumen

Este servicio implementa **DynamoDB Streams** para capturar cambios en tiempo real en la tabla de carpetas y transmitirlos a través de WebSockets.

## 🏗️ Arquitectura

```
Frontend CRUD Request
        ↓
folders-service API
        ↓
DynamoDB Table (manpower-folders-dev)
        ↓
DynamoDB Stream (enabled)
        ↓
Lambda Function (foldersStreamHandler)
        ↓
WebSocket API Gateway
        ↓
Frontend (tiempo real)
```

## ⚙️ Configuración

### 1. DynamoDB Stream
```yaml
StreamSpecification:
  StreamViewType: NEW_AND_OLD_IMAGES
```
- **NEW_AND_OLD_IMAGES**: Captura el estado completo antes y después de cada cambio
- Se activa en **INSERT**, **MODIFY**, **REMOVE**

### 2. Lambda Stream Handler
```yaml
foldersStreamHandler:
  handler: src/handlers/streamHandler.handleFoldersStream
  events:
    - stream:
        type: dynamodb
        arn: Fn::GetAtt: [FoldersTable, StreamArn]
        batchSize: 10
        startingPosition: LATEST
        maximumBatchingWindowInSeconds: 5
```

### 3. Permisos IAM
```yaml
- dynamodb:DescribeStream
- dynamodb:GetRecords
- dynamodb:GetShardIterator
- dynamodb:ListStreams
- execute-api:ManageConnections
```

## 📨 Eventos de Stream

### Estructura del Evento
```typescript
interface WebSocketMessage {
  action: 'folder_created' | 'folder_updated' | 'folder_deleted';
  data: {
    folderId: string;
    userId: string;
    eventType: 'INSERT' | 'MODIFY' | 'REMOVE';
    folder?: any;
    timestamp: number;
  };
}
```

### Tipos de Eventos
- **INSERT** → `folder_created`
- **MODIFY** → `folder_updated`
- **REMOVE** → `folder_deleted`

## 🔧 Variables de Entorno

```bash
WEBSOCKET_ENDPOINT=wss://your-websocket-api.execute-api.us-east-1.amazonaws.com/dev
FOLDERS_TABLE=manpower-folders-dev
```

## 🚀 Despliegue

```bash
cd backend/folders-service
sls deploy --stage dev
```

## 📋 Outputs del Despliegue

Después del despliegue obtienes:
- `FoldersTableStreamArn`: ARN del stream para debugging
- `FoldersServiceUrl`: URL de la API REST
- `FoldersTableName`: Nombre de la tabla

## 🔍 Monitoreo

### CloudWatch Logs
- Logs del stream: `/aws/lambda/folders-service-dev-foldersStreamHandler`
- Métricas de DynamoDB Streams en CloudWatch

### Ejemplo de Log
```json
{
  "eventName": "INSERT",
  "action": "folder_created",
  "folderId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "user-123",
  "timestamp": 1640995200000
}
```

## 🌐 Próximos Pasos

1. **Crear WebSocket API Gateway** para conexiones del frontend
2. **Implementar gestión de conexiones** (conectar/desconectar usuarios)
3. **Filtrar eventos por usuario/sala** para mayor eficiencia
4. **Agregar autenticación WebSocket** con JWT tokens
5. **Frontend WebSocket client** para recibir actualizaciones

## 🛠️ Uso en Frontend

```typescript
// Ejemplo de conexión WebSocket (futuro)
const ws = new WebSocket('wss://your-websocket-api.amazonaws.com/dev');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch(message.action) {
    case 'folder_created':
      // Actualizar UI con nueva carpeta
      break;
    case 'folder_updated':
      // Actualizar carpeta existente
      break;
    case 'folder_deleted':
      // Remover carpeta de UI
      break;
  }
};
```

## ⚡ Beneficios

- ✅ **Tiempo real**: Actualizaciones instantáneas
- ✅ **Escalable**: DynamoDB Streams maneja millones de eventos
- ✅ **Automático**: No requiere polling del frontend
- ✅ **Eficiente**: Solo envía cambios, no estado completo
- ✅ **Confiable**: Garantía de entrega de AWS