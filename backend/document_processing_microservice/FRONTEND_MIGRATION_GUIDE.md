# 🔄 Frontend Migration Guide - Document Processing v2.0

## ⚠️ Breaking Change: Async Processing (202 Accepted)

### **Lo que cambió**

**ANTES (v1.x):**
- Endpoint retornaba `200 OK`
- Documento procesado SÍNCRONAMENTE
- Resultado disponible INMEDIATAMENTE en la respuesta

**AHORA (v2.0):**
- Endpoint retorna `202 Accepted`
- Documento procesado ASÍNCRONAMENTE
- Resultado NO disponible inmediatamente
- Debes esperar notificación WebSocket

---

## 📋 Cambios Requeridos en el Frontend

### **1. Actualizar Interface de Respuesta**

**Archivo:** `admin-frontend/src/services/documentProcessingService.ts`

```typescript
// ANTES
export interface ProcessDocumentsResponse {
  message: string;
  status: string;
  owner_user_name: string;
  document_count: number;  // ← Ya no existe
  batch_id: string;
}

// AHORA
export interface ProcessDocumentsResponse {
  message: string;
  status: 'accepted';  // ← Siempre 'accepted', no 'success'
  owner_user_name: string;
  enqueued: number;   // ← Documentos encolados
  failed: number;     // ← Documentos que fallaron al encolar
  total: number;      // ← Total de documentos
  batch_id: string;
  note: string;       // ← Mensaje explicativo
}
```

---

### **2. Actualizar Lógica de Procesamiento**

**Archivo:** Donde se llama `processDocuments()`

#### **❌ CÓDIGO ANTERIOR (INCORRECTO):**

```typescript
try {
  const result = await documentProcessingService.processDocuments({
    owner_user_name: userName,
    documents: docs
  });

  // ❌ ESTO ES INCORRECTO AHORA
  showSuccessNotification(
    `Procesados ${result.document_count} documentos exitosamente`
  );

  // ❌ El documento NO está procesado aún
  refreshDocumentsList();
} catch (error) {
  showErrorNotification('Error procesando documentos');
}
```

#### **✅ CÓDIGO NUEVO (CORRECTO):**

```typescript
try {
  const result = await documentProcessingService.processDocuments({
    owner_user_name: userName,
    documents: docs
  });

  // ✅ Ahora solo confirmamos que se encoló
  showInfoNotification(
    `${result.enqueued} documentos encolados para procesamiento. ` +
    `Recibirás notificaciones cuando estén listos.`
  );

  // ✅ NO refrescar lista aún - esperar WebSocket
  // Los documentos aparecerán con estado 'QUEUED'

  // ✅ Opcional: Guardar batch_id para tracking
  setBatchId(result.batch_id);

} catch (error) {
  showErrorNotification('Error encolando documentos');
}
```

---

### **3. Manejar Estados de Procesamiento**

Ahora los documentos pasan por más estados:

```typescript
type DocumentStatus =
  | 'QUEUED'      // ← NUEVO: Encolado, esperando procesamiento
  | 'PROCESSING'  // En procesamiento (OCR, IA, etc.)
  | 'COMPLETED'   // Procesamiento completado
  | 'FAILED';     // Error en procesamiento
```

**Actualizar UI para mostrar estos estados:**

```typescript
// Ejemplo en DocumentTableRow.tsx
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'QUEUED':
      return <Badge color="blue">⏳ En cola</Badge>;
    case 'PROCESSING':
      return <Badge color="yellow">🔄 Procesando...</Badge>;
    case 'COMPLETED':
      return <Badge color="green">✅ Completado</Badge>;
    case 'FAILED':
      return <Badge color="red">❌ Falló</Badge>;
    default:
      return <Badge color="gray">{status}</Badge>;
  }
};
```

---

### **4. Depender de WebSocket para Resultados**

El frontend YA tiene WebSocket implementado (`useDocumentProcessingWebSocket.ts`), ahora es **obligatorio** usarlo:

```typescript
// En tu componente
import { useDocumentProcessingWebSocket } from '@/hooks/useDocumentProcessingWebSocket';

function MyComponent() {
  const {
    isConnected,
    notifications,  // ← Escucha AQUÍ para actualizaciones
    error
  } = useDocumentProcessingWebSocket();

  // Procesar documentos
  const handleProcess = async () => {
    const result = await documentProcessingService.processDocuments({...});

    // Solo mostrar "encolado"
    showInfo(`${result.enqueued} documentos en cola`);

    // ✅ Los resultados llegarán por WebSocket en 'notifications'
  };

  // Escuchar notificaciones WebSocket
  useEffect(() => {
    const latestNotification = notifications[notifications.length - 1];

    if (latestNotification?.status === 'completed') {
      showSuccess(
        `Documento ${latestNotification.fileName} procesado: ` +
        `${latestNotification.finalDecision}`
      );

      // AHORA sí refrescar la lista
      refreshDocumentsList();
    }
  }, [notifications]);

  return (
    <div>
      {!isConnected && (
        <Alert color="warning">
          WebSocket desconectado - no recibirás actualizaciones en tiempo real
        </Alert>
      )}
      {/* ... rest of UI */}
    </div>
  );
}
```

---

### **5. Actualizar Tests**

**Archivo:** Tests que llaman `processDocuments()`

```typescript
// ANTES
test('should process documents successfully', async () => {
  const result = await service.processDocuments(request);
  expect(result.status).toBe('success');
  expect(result.document_count).toBe(2);
});

// AHORA
test('should enqueue documents successfully', async () => {
  const result = await service.processDocuments(request);
  expect(result.status).toBe('accepted');  // ← Cambió
  expect(result.enqueued).toBe(2);         // ← Cambió
  expect(result.batch_id).toBeDefined();
});

test('should receive WebSocket notification after processing', async (done) => {
  const result = await service.processDocuments(request);

  // Esperar notificación WebSocket
  const notification = await waitForWebSocketMessage(result.batch_id);

  expect(notification.status).toBe('completed');
  expect(notification.finalDecision).toBe('APPROVED');
  done();
});
```

---

## 🔍 Checklist de Migración

Antes de deployar el backend v2.0, verificar:

- [ ] `ProcessDocumentsResponse` interface actualizada
- [ ] Mensajes de éxito cambiados de "procesado" a "encolado"
- [ ] NO se refresca lista inmediatamente después de `processDocuments()`
- [ ] WebSocket listener implementado para recibir resultados
- [ ] UI maneja estado `QUEUED`
- [ ] Loading indicators durante procesamiento asíncrono
- [ ] Tests actualizados
- [ ] Error handling para WebSocket desconectado

---

## ⏱️ Timeline de Procesamiento Esperado

```
Usuario sube documento
    ↓
API responde en <1s con "encolado" (202 Accepted)
    ↓
[5-30 segundos después]
    ↓
WebSocket notifica "completado"
    ↓
UI se actualiza con resultado
```

**Documentos grandes**: Hasta 2-3 minutos de procesamiento

---

## 🐛 Problemas Comunes

### **1. "¿Por qué no aparecen mis documentos procesados?"**
- Verifica que WebSocket esté conectado
- Revisa logs del navegador para notificaciones WebSocket
- Verifica que `batch_id` coincida

### **2. "El usuario no sabe si el documento está procesando"**
- Agregar loading indicator mientras `status === 'QUEUED' || status === 'PROCESSING'`
- Mostrar progress bar o spinner
- Mostrar timestamp de cuando se encoló

### **3. "WebSocket se desconecta"**
- Implementar reconnection logic en `useDocumentProcessingWebSocket`
- Permitir polling manual como fallback
- Mostrar alerta si desconectado >30s

---

## 📊 Ejemplo Completo

```typescript
// TestOCRPage.tsx - Ejemplo completo actualizado

import { useState, useEffect } from 'react';
import { documentProcessingService } from '@/services/documentProcessingService';
import { useDocumentProcessingWebSocket } from '@/hooks/useDocumentProcessingWebSocket';

export function TestOCRPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const { isConnected, notifications } = useDocumentProcessingWebSocket();

  const handleProcessDocuments = async (docs: DocumentData[]) => {
    setIsProcessing(true);

    try {
      // Enviar documentos
      const result = await documentProcessingService.processDocuments({
        owner_user_name: 'Test User',
        documents: docs
      });

      // Guardar batch_id para tracking
      setBatchId(result.batch_id);

      // Mostrar mensaje apropiado
      showInfo(
        `✅ ${result.enqueued} documentos encolados\n` +
        `⏳ Procesando en segundo plano...`
      );

    } catch (error) {
      showError('Error encolando documentos');
      setIsProcessing(false);
    }
  };

  // Escuchar notificaciones WebSocket
  useEffect(() => {
    if (!batchId) return;

    const batchNotifications = notifications.filter(
      n => n.batch_id === batchId  // Filtrar por batch
    );

    const completedCount = batchNotifications.filter(
      n => n.status === 'completed'
    ).length;

    // Todos completados?
    if (completedCount === totalDocuments) {
      setIsProcessing(false);
      showSuccess(`✅ Todos los documentos procesados`);
      refreshList();
    }
  }, [notifications, batchId]);

  return (
    <div>
      {!isConnected && (
        <Alert color="warning">
          ⚠️ WebSocket desconectado - no recibirás actualizaciones
        </Alert>
      )}

      {isProcessing && (
        <div className="processing-indicator">
          <Spinner />
          <p>Procesando documentos en segundo plano...</p>
          <p className="text-sm text-gray-500">
            Recibirás notificación cuando estén listos
          </p>
        </div>
      )}

      <Button onClick={() => handleProcessDocuments(selectedDocs)}>
        Procesar Documentos
      </Button>
    </div>
  );
}
```

---

## 🚀 Deployment Strategy

**Opción 1: Big Bang (No recomendado)**
- Deployar backend v2.0
- Deployar frontend actualizado
- ⚠️ Riesgo: Si algo falla, usuarios sin servicio

**Opción 2: Feature Flag (Recomendado)**
```typescript
const USE_ASYNC_PROCESSING = import.meta.env.VITE_USE_ASYNC_PROCESSING === 'true';

if (USE_ASYNC_PROCESSING) {
  // Lógica nueva (202 Accepted)
} else {
  // Lógica vieja (200 OK) - fallback
}
```

**Opción 3: Dual Endpoints**
- Mantener endpoint viejo: `/process-documents-platform`
- Crear endpoint nuevo: `/process-documents-platform-async`
- Migrar gradualmente

---

**Última actualización:** 2025-09-30
**Versión backend compatible:** v2.0.0+
