# Postman Collection - Files Stream Testing

## 🧪 Commands para probar el sistema de archivos en tiempo real

### 1. Crear Archivo (Trigger Stream)
**POST** `https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev/files/upload-url`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "folderId": "cb1d9596-1e18-439e-adae-c6921b1dbf4e",
  "originalName": "test-postman-{{$timestamp}}.txt",
  "fileType": "text/plain",
  "fileSize": 214
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Upload URL generated successfully",
  "file": {
    "documentId": "uuid-here",
    "userId": "test-user-123",
    "folderId": "cb1d9596-1e18-439e-adae-c6921b1dbf4e",
    "originalName": "test-postman-1234567890.txt",
    "fileName": "test-postman-1234567890.txt",
    "fileType": "text/plain",
    "fileSize": 214,
    "uploadedAt": "2025-09-26T18:22:41.554Z",
    "isActive": true
  },
  "uploadUrl": "https://s3-url-here"
}
```

### 2. Verificar Archivo Individual
**GET** `https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev/files/{documentId}`

**Variables:**
- `{documentId}`: El ID del archivo creado en el paso anterior

**Expected Response:**
```json
{
  "success": true,
  "message": "File retrieved successfully",
  "file": {
    "documentId": "uuid-here",
    "fileName": "test-postman-1234567890.txt",
    "folderId": "cb1d9596-1e18-439e-adae-c6921b1dbf4e",
    "fileType": "text/plain",
    "fileSize": 214,
    "isActive": true
  }
}
```

### 3. Obtener Todos los Archivos
**GET** `https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev/files`

**Expected Response:**
```json
{
  "success": true,
  "files": [
    {
      "documentId": "uuid-here",
      "fileName": "test-postman-1234567890.txt",
      "folderId": "cb1d9596-1e18-439e-adae-c6921b1dbf4e",
      "fileType": "text/plain",
      "fileSize": 214
    }
  ]
}
```

### 4. Obtener Archivos por Carpeta (PROBLEMA ACTUAL)
**GET** `https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev/files/folder/cb1d9596-1e18-439e-adae-c6921b1dbf4e`

**Expected Response:**
```json
{
  "success": true,
  "files": [
    {
      "documentId": "uuid-here",
      "fileName": "test-postman-1234567890.txt",
      "folderId": "cb1d9596-1e18-439e-adae-c6921b1dbf4e",
      "fileType": "text/plain",
      "fileSize": 214
    }
  ]
}
```

**Current Response (ERROR):**
```json
{
  "success": false,
  "message": "Failed to retrieve files"
}
```

## 🔍 Verificación del Stream Handler

### Comando para verificar logs:
```bash
aws logs describe-log-streams --log-group-name '/aws/lambda/files-service-dev-filesStreamHandler' --region us-east-1 --order-by LastEventTime --descending
```

### Comando para ver logs recientes:
```bash
aws logs get-log-events --log-group-name '/aws/lambda/files-service-dev-filesStreamHandler' --log-stream-name 'STREAM_NAME_HERE' --region us-east-1 --query 'events[-10:].message' --output text
```

## 📡 Verificación del WebSocket

1. **Abrir el frontend** en el navegador
2. **Abrir DevTools** (F12)
3. **Ir a la pestaña Console**
4. **Ejecutar el comando 1** (Crear Archivo)
5. **Verificar en la consola** si aparecen mensajes como:
   - `🔄 Real-time file update received`
   - `📄 New file created in real-time`
   - `✅ Folders refreshed after file creation`

## 🎯 Estado Actual del Sistema

### ✅ Funcionando:
- ✅ Creación de archivos en DynamoDB
- ✅ WebSocket conectado en frontend
- ✅ Stream handler desplegado
- ✅ Frontend configurado para recibir eventos de archivos

### ❌ Problemas Identificados:
- ❌ Stream handler no se ejecuta automáticamente
- ❌ Endpoint `getFilesByFolder` devuelve error
- ❌ Archivos no aparecen en la interfaz

### 🔧 Próximos Pasos:
1. **Investigar por qué el stream handler no se ejecuta**
2. **Arreglar el endpoint `getFilesByFolder`**
3. **Verificar que los archivos se muestren en el frontend**

## 📋 Comandos curl para Testing

### Crear archivo:
```bash
curl -X POST "https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev/files/upload-url" \
  -H "Content-Type: application/json" \
  -d '{
    "folderId": "cb1d9596-1e18-439e-adae-c6921b1dbf4e",
    "originalName": "test-curl.txt",
    "fileType": "text/plain",
    "fileSize": 214
  }'
```

### Verificar archivo:
```bash
curl -X GET "https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev/files/{documentId}"
```

### Obtener todos los archivos:
```bash
curl -X GET "https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev/files"
```
