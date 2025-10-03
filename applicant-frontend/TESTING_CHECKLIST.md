# Testing Checklist - Applicant Frontend

## Pre-requisitos
- [ ] Backend services running:
  - applications-service
  - users-service
  - jobs-service
  - folders-service
  - files-service
  - file-upload-service
- [ ] Auth-frontend running (para login)
- [ ] Cognito configurado

## Test 1: Autenticación y Sesión ⚠️ CRÍTICO

### 1.1 Login Flow
- [ ] Abrir `http://localhost:6200`
- [ ] Verificar que redirige a auth-frontend si no hay token
- [ ] Hacer login con credenciales válidas
- [ ] Verificar que redirige de vuelta a applicant-frontend
- [ ] Verificar en DevTools > Application > Local Storage:
  - `cognito_access_token` existe
  - `cognito_id_token` existe
  - `user` existe

### 1.2 Token Injection
- [ ] Abrir DevTools > Network
- [ ] Hacer cualquier acción (ir a "Mis Aplicaciones")
- [ ] Verificar en Headers que incluye:
  ```
  Authorization: Bearer <token>
  ```

### 1.3 Session Expiration
- [ ] Borrar manualmente `cognito_access_token` de localStorage
- [ ] Hacer cualquier acción
- [ ] Verificar que redirige automáticamente a login
- [ ] Verificar en Console el log: "Session expired - redirecting to login"

---

## Test 2: Listado de Aplicaciones

### 2.1 Carga Inicial
- [ ] Ir a `/mis-aplicaciones`
- [ ] Verificar que muestra spinner de "Cargando aplicaciones..."
- [ ] Verificar que carga lista de aplicaciones
- [ ] Verificar que muestra correctamente:
  - `position` o `jobTitle`
  - `title`
  - `location`
  - `salary` (si existe)
  - Fecha de aplicación

### 2.2 Sin Aplicaciones
- [ ] Si no hay aplicaciones, verificar que muestra:
  - Mensaje "No tienes aplicaciones"
  - Botón "Buscar Empleos"

### 2.3 Eliminar Aplicación
- [ ] Click en botón de eliminar (icono de basura)
- [ ] Verificar modal de confirmación aparece
- [ ] Click en "Cancelar" - modal cierra
- [ ] Click de nuevo en eliminar
- [ ] Click en "Confirmar"
- [ ] Verificar que:
  - Aplicación desaparece de la lista
  - No hay errores en Console
  - React Query invalida el cache (ver Network tab - hace refetch)

---

## Test 3: Buscar y Aplicar a Jobs

### 3.1 Búsqueda de Jobs
- [ ] Ir a `/buscar-empleos`
- [ ] Escribir término de búsqueda (ej: "desarrollador")
- [ ] Verificar que filtra jobs
- [ ] Verificar que marca jobs ya aplicados (con ✓)

### 3.2 Selección de Jobs
- [ ] Seleccionar 1-3 jobs
- [ ] Verificar que checkbox se marca
- [ ] Intentar seleccionar job ya aplicado
- [ ] Verificar que NO se puede seleccionar

### 3.3 Aplicar a Jobs
- [ ] Click en "Continuar con Aplicación"
- [ ] Verificar que redirige a `/completar-aplicaciones`
- [ ] Verificar que pre-llena datos del perfil

### 3.4 Subir Documentos
- [ ] Verificar que muestra documentos requeridos por job
- [ ] Subir un archivo PDF válido
- [ ] Verificar que muestra preview/nombre
- [ ] Intentar subir archivo muy grande (>10MB)
- [ ] Verificar que muestra error

### 3.5 Enviar Aplicación
- [ ] Llenar todos los campos requeridos
- [ ] Subir todos los documentos requeridos
- [ ] Click en "Enviar Aplicaciones"
- [ ] Verificar loading state
- [ ] Verificar que:
  - Muestra mensaje de éxito
  - Redirige a "Mis Aplicaciones"
  - Aparecen las nuevas aplicaciones

---

## Test 4: Perfil de Usuario

### 4.1 Carga de Perfil
- [ ] Ir a `/perfil`
- [ ] Verificar que carga datos del usuario:
  - Nombre
  - Email
  - RUT
  - Teléfono
  - Dirección
  - Fecha de nacimiento
  - Nivel de educación
  - Experiencia laboral
  - Habilidades

### 4.2 Editar Perfil
- [ ] Click en "Editar Perfil"
- [ ] Modificar algunos campos
- [ ] Click en "Cancelar"
- [ ] Verificar que revierte cambios
- [ ] Click de nuevo en "Editar"
- [ ] Modificar y click en "Guardar Cambios"
- [ ] Verificar que:
  - Muestra mensaje de éxito
  - Guarda cambios
  - Sale del modo edición
  - React Query invalida cache

---

## Test 5: Performance y UX

### 5.1 Code Splitting
- [ ] Abrir DevTools > Network
- [ ] Limpiar cache (Ctrl+Shift+Del)
- [ ] Recargar página inicial
- [ ] Verificar que:
  - Carga bundle principal (~258KB)
  - NO carga bundles de otras páginas
- [ ] Ir a "Mis Aplicaciones"
- [ ] Verificar que carga chunk lazy (ApplicationsPage-*.js)
- [ ] Verificar spinner de "Cargando página..."

### 5.2 React Query Cache
- [ ] Ir a "Mis Aplicaciones"
- [ ] Observar Network tab - hace fetch
- [ ] Ir a otra página y volver a "Mis Aplicaciones"
- [ ] Verificar que:
  - Muestra datos inmediatamente (de cache)
  - Hace refetch en background (refetchOnMount: always)

### 5.3 Error Handling
- [ ] Desconectar WiFi / Network
- [ ] Intentar ir a "Mis Aplicaciones"
- [ ] Verificar que muestra error de red
- [ ] Reconectar y recargar
- [ ] Verificar que se recupera

---

## Test 6: Error Boundary

### 6.1 Simular Error
Para probar el Error Boundary, puedes forzar un error temporal:

1. Abrir DevTools > Console
2. Ejecutar:
```javascript
throw new Error('Test error boundary');
```

- [ ] Verificar que muestra UI de error boundary
- [ ] Verificar botones "Intentar de nuevo" e "Ir al inicio"
- [ ] En dev, verificar que muestra detalles del error

---

## Test 7: Logging (Solo Desarrollo)

### 7.1 Logs en Console
- [ ] Abrir DevTools > Console
- [ ] Hacer cualquier acción
- [ ] Verificar logs estructurados:
  ```
  [DEBUG] API Request { method: 'GET', url: '...' }
  [DEBUG] API Response { status: 200, data: {...} }
  ```

### 7.2 Logs de Error
- [ ] Forzar un error (ej: eliminar aplicación que no existe)
- [ ] Verificar en Console:
  ```
  [ERROR] API Error ...
  ```

---

## Test 8: Edge Cases

### 8.1 Jobs sin Documentos Requeridos
- [ ] Aplicar a job que NO requiere documentos
- [ ] Verificar que permite aplicar sin subir nada

### 8.2 Multiple Tabs
- [ ] Abrir applicant-frontend en 2 tabs
- [ ] En Tab 1: Crear una aplicación
- [ ] En Tab 2: Ir a "Mis Aplicaciones"
- [ ] Verificar que aparece (gracias a refetchOnWindowFocus)

### 8.3 Token Refresh
- [ ] Usar la app normalmente por >30 minutos
- [ ] Verificar que sigue funcionando
- [ ] Si falla, verificar que redirige a login (token expirado)

---

## Checklist de Integración Backend

### Verificar Endpoints
- [ ] `GET /applications/my` retorna aplicaciones del usuario
- [ ] `POST /applications` crea aplicación(es)
- [ ] `DELETE /applications/{id}` elimina aplicación
- [ ] `GET /applications/check/{jobId}` verifica si existe aplicación
- [ ] `GET /users/me` retorna perfil del usuario
- [ ] `PUT /users/me` actualiza perfil

### Verificar Datos Enriquecidos
- [ ] Aplicaciones retornan campos:
  - `jobTitle` o `position`
  - `title`
  - `location`
  - `salary`
  - `companyName`
  - `applicantFolderId`

---

## Problemas Comunes y Soluciones

### "Session expired" en cada request
**Causa**: Token no se está guardando correctamente
**Solución**: Verificar que auth-frontend guarda tokens en localStorage

### "CORS error"
**Causa**: Backend no tiene CORS configurado
**Solución**: Agregar headers CORS en serverless.yml

### Aplicaciones no aparecen
**Causa**: userId no coincide entre servicios
**Solución**: Verificar que todos los servicios usan el mismo userId del token

### Files no se suben
**Causa**: file-upload-service no está corriendo o falta permisos S3
**Solución**: Verificar logs del servicio y permisos IAM

---

## Próximos Pasos (Post-Testing)

Después de que todo funcione:

1. **Monitoring en Producción**:
   - [ ] Configurar Sentry
   - [ ] Descomentar código en `logger.ts` y `ErrorBoundary.tsx`
   - [ ] Agregar environment variables para Sentry DSN

2. **Analytics**:
   - [ ] Google Analytics o similar
   - [ ] Track: aplicaciones creadas, páginas vistas, errores

3. **Optimizaciones Adicionales**:
   - [ ] Implementar React Query DevTools (solo dev)
   - [ ] Agregar service worker para offline support
   - [ ] Implementar virtual scrolling para listas largas

---

**Fecha**: 2025-10-03
**Versión**: 1.0.0
**Testeado por**: _________
**Estado**: ☐ Pendiente | ☐ En Progreso | ☐ Completado
