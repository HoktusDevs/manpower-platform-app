# File Upload Service

API para subir archivos a carpetas específicas con estados predefinidos y notificaciones WebSocket en tiempo real.

## 🚀 Endpoints

### Subir Archivo
```
POST https://lp5u5gdahh.execute-api.us-east-1.amazonaws.com/dev/upload
```

### Actualizar Estado de Documento
```
PUT https://lp5u5gdahh.execute-api.us-east-1.amazonaws.com/dev/upload
```

## 📋 Parámetros

### POST - Subir Archivo (Form Data - multipart/form-data)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `folderName` | string | ✅ | Nombre de la carpeta donde subir el archivo |
| `status` | string | ✅ | Estado del archivo: `APPROVED`, `REJECTED`, `PENDING` |
| `file` | file | ✅ | Archivo a subir |
| `explanation` | string | ⚠️ | Requerido solo si `status = "REJECTED"` |

### PUT - Actualizar Estado (JSON)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `documentId` | string | ✅ | ID del documento a actualizar |
| `status` | string | ✅ | Nuevo estado: `APPROVED`, `REJECTED`, `PENDING` |
| `explanation` | string | ⚠️ | Requerido solo si `status = "REJECTED"` |

### Carpetas Disponibles

- `Falabella`
- `30-09-2025`
- `Guardia de Seguridad`
- `Darwin Larrañaga`
- `Clemente Arriagada`

## 📝 Ejemplos

## 📤 Subir Archivos

### cURL - Archivo Aprobado

```bash
curl --location 'https://lp5u5gdahh.execute-api.us-east-1.amazonaws.com/dev/upload' \
--form 'folderName="Darwin Larrañaga"' \
--form 'status="APPROVED"' \
--form 'file=@"/path/to/your/file.pdf"'
```

### cURL - Archivo Rechazado

```bash
curl --location 'https://lp5u5gdahh.execute-api.us-east-1.amazonaws.com/dev/upload' \
--form 'folderName="Falabella"' \
--form 'status="REJECTED"' \
--form 'explanation="Documento ilegible"' \
--form 'file=@"/path/to/your/file.pdf"'
```

### cURL - Archivo Pendiente

```bash
curl --location 'https://lp5u5gdahh.execute-api.us-east-1.amazonaws.com/dev/upload' \
--form 'folderName="Clemente Arriagada"' \
--form 'status="PENDING"' \
--form 'file=@"/path/to/your/file.pdf"'
```

## 🔄 Actualizar Estado de Documentos

### cURL - Aprobar Documento

```bash
curl --location --request PUT 'https://lp5u5gdahh.execute-api.us-east-1.amazonaws.com/dev/upload' \
--header 'Content-Type: application/json' \
--data '{
  "documentId": "doc_1759163001534_o2p0sf1lnxf",
  "status": "APPROVED"
}'
```

### cURL - Rechazar Documento

```bash
curl --location --request PUT 'https://lp5u5gdahh.execute-api.us-east-1.amazonaws.com/dev/upload' \
--header 'Content-Type: application/json' \
--data '{
  "documentId": "doc_1759163001534_o2p0sf1lnxf",
  "status": "REJECTED",
  "explanation": "Documento ilegible o incompleto"
}'
```

### cURL - Marcar como Pendiente

```bash
curl --location --request PUT 'https://lp5u5gdahh.execute-api.us-east-1.amazonaws.com/dev/upload' \
--header 'Content-Type: application/json' \
--data '{
  "documentId": "doc_1759163001534_o2p0sf1lnxf",
  "status": "PENDING"
}'
```

## 🔧 Configuración en Postman

### 📤 Subir Archivo (POST)

**Method:** POST
**URL:** `https://lp5u5gdahh.execute-api.us-east-1.amazonaws.com/dev/upload`

**Headers:** No agregar headers (Content-Type se manejará automáticamente)

**Body:** form-data
```
folderName: Darwin Larrañaga
status: APPROVED
file: [Seleccionar archivo]
```

### 🔄 Actualizar Estado (PUT)

**Method:** PUT
**URL:** `https://lp5u5gdahh.execute-api.us-east-1.amazonaws.com/dev/upload`

**Headers:**
- Content-Type: application/json

**Body:** raw (JSON)
```json
{
  "documentId": "doc_1759163001534_o2p0sf1lnxf",
  "status": "APPROVED"
}
```

### Para importar en Postman:
1. Copia cualquier comando cURL de arriba
2. En Postman: **Import** → **Raw text** → Pegar el cURL
3. Click **Continue** → **Import**

## ✅ Respuesta Exitosa

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "documentId": "doc_1759163001534_o2p0sf1lnxf",
    "folderId": "6d3e0f01-022a-4368-a98a-fd718a7ba19f",
    "userId": "test-user-123",
    "fileName": "documento.pdf",
    "originalName": "documento.pdf",
    "fileType": "application/pdf",
    "fileExtension": ".pdf",
    "fileSize": 1024,
    "status": "completed",
    "hoktusDecision": "APPROVED",
    "hoktusProcessingStatus": "COMPLETED",
    "fileUrl": "https://manpower-documents-dev.s3.amazonaws.com/uploads/...",
    "uploadedAt": "2025-09-29T16:23:21.553Z"
  }
}
```

## ❌ Errores Comunes

### Carpeta no encontrada
```json
{
  "success": false,
  "message": "Folder \"Nombre Inexistente\" not found"
}
```

### Faltan campos requeridos
```json
{
  "success": false,
  "message": "Missing required fields: folderName, status, file"
}
```

### Estado inválido
```json
{
  "success": false,
  "message": "Invalid status. Must be APPROVED, REJECTED, or PENDING"
}
```

### Explicación faltante para REJECTED
```json
{
  "success": false,
  "message": "Explanation is required when status is REJECTED"
}
```

## 🔄 Funcionalidades

- ✅ **Subida de archivos** a S3
- ✅ **Metadata en DynamoDB**
- ✅ **Validación de carpetas** existentes
- ✅ **Estados predefinidos** (APPROVED/REJECTED/PENDING)
- ✅ **WebSocket notifications** en tiempo real
- ✅ **Integración con frontend** sin recargar página

## 🏗️ Arquitectura

1. **API Gateway** → Recibe request multipart
2. **Lambda** → Procesa archivo y valida carpeta
3. **S3** → Almacena archivo físico
4. **DynamoDB** → Guarda metadata
5. **DynamoDB Stream** → Detecta cambios
6. **WebSocket** → Notifica al frontend en tiempo real

## 🎯 Caso de Uso

Este servicio permite a sistemas externos subir documentos a carpetas específicas de la plataforma Manpower, con estados predefinidos para el flujo de aprobación, y notificaciones en tiempo real para que aparezcan instantáneamente en el admin panel sin recargar la página.