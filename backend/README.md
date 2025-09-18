# Backend - Manpower Platform

## Reglas de Negocio

### Autenticación y Autorización
- **Usuarios autenticados**: Solo usuarios registrados y autenticados con Cognito pueden acceder a las APIs
- **Dos tipos de usuario únicamente**:
  - `postulante`: Usuario estándar que busca empleo
  - `admin`: Usuario administrador del sistema

#### Permisos por Tipo de Usuario

**POSTULANTE puede:**
- Ver ofertas de trabajo publicadas
- Aplicar a ofertas de trabajo
- Ver sus propias aplicaciones
- Eliminar sus aplicaciones (solo si están en PENDING)
- Gestionar sus documentos y formularios personales

**POSTULANTE NO puede:**
- Ver aplicaciones de otros usuarios
- Cambiar estados de aplicaciones
- Crear/editar ofertas de trabajo
- Acceder a funciones administrativas

**ADMIN puede:**
- Todo lo que puede hacer un postulante
- Ver todas las aplicaciones del sistema
- Cambiar estados de aplicaciones
- Crear, editar y gestionar ofertas de trabajo
- Cambiar estados de ofertas (publicar, pausar, cerrar)
- Ver estadísticas y reportes del sistema

**ADMIN NO puede:**
- Aplicar a ofertas de trabajo (conflicto de interés)
- Eliminar aplicaciones de usuarios

### Gestión de Aplicaciones
- **Aplicación única**: Un usuario NO puede aplicar dos veces al mismo trabajo
- **Estados de aplicación**: `PENDING`, `REVIEWED`, `ACCEPTED`, `REJECTED`
- **Solo el admin** puede cambiar el estado de una aplicación
- **El postulante** puede eliminar sus propias aplicaciones solo si están en estado `PENDING`

### Ofertas de Trabajo
- **Estados de oferta**: `DRAFT`, `PUBLISHED`, `PAUSED`, `CLOSED`
- **Solo ofertas PUBLISHED** son visibles para postulantes
- **Solo admins** pueden crear, editar y cambiar estados de ofertas
- **Información requerida**: título, descripción, empresa, ubicación, salario (opcional)

### Gestión de Carpetas Jerárquicas
- **Sistema de carpetas dinámico**: Sin tipos predefinidos, estructura completamente libre
- **Anidamiento infinito**: `parentId` define jerarquía (null = carpeta raíz)
- **Flexibilidad total**: Admin puede crear cualquier estructura organizacional
- **Ejemplos de uso**:
  ```
  📁 Walmart (parentId: null)
  └── 📁 Metropolitana (parentId: walmart-id)
      └── 📁 Sucursal Centro (parentId: metropolitana-id)
          └── 💼 Jobs asociados a esta carpeta

  📁 Tecnología (parentId: null)
  └── 📁 Frontend (parentId: tecnologia-id)
      └── 📁 React (parentId: frontend-id)
          └── 💼 Jobs específicos de React
  ```

### Gestión de Jobs y Carpetas
- **Jobs asociados a carpetas**: Cada job tiene un `folderId` específico
- **Herencia automática**: Job hereda toda la jerarquía hacia arriba
- **Resolución de contexto**: Sistema resuelve empresa/región automáticamente
- **Navegación jerárquica**: Breadcrumbs y navegación por niveles
- **Consultas eficientes**: Buscar jobs por carpeta incluye subcarpetas

### Gestión de Documentos y Formularios
- **Estructura jerárquica**: Misma lógica de carpetas que jobs
- **Propiedad**: Cada usuario solo puede ver/editar sus propios documentos
- **Formularios**: Pueden estar asociados a ofertas específicas
- **Estados de formulario**: `DRAFT`, `PUBLISHED`, `PAUSED`

## Flujo de Datos

### 1. Registro y Autenticación
```
Usuario -> Cognito -> JWT Token -> Backend APIs
```

### 2. Aplicación a Trabajo
```
1. Postulante ve ofertas publicadas (getActiveJobPostings)
2. Postulante aplica a trabajo (applyToJob)
3. Sistema valida:
   - Usuario autenticado
   - Oferta existe y está PUBLISHED
   - No hay aplicación previa
4. Crea aplicación con estado PENDING
5. Enriquece respuesta con datos de la oferta
```

### 3. Gestión de Aplicaciones (Admin)
```
1. Admin consulta todas las aplicaciones (getAllApplications)
2. Admin cambia estado de aplicación (updateApplicationStatus)
3. Sistema valida:
   - Usuario es admin
   - Aplicación existe
   - Estado es válido
4. Actualiza aplicación
```

### 4. Consulta de Aplicaciones (Postulante)
```
1. Postulante consulta sus aplicaciones (getMyApplications)
2. Sistema:
   - Obtiene aplicaciones del usuario
   - Enriquece con datos de ofertas usando BatchGetItem
   - Retorna aplicaciones con información completa de ofertas
```

## Arquitectura de Datos

### Tablas DynamoDB

#### applications-table
- **PK**: `userId` (string)
- **SK**: `applicationId` (string)
- **Atributos**: `jobId`, `status`, `createdAt`, `updatedAt`
- **GSI**: Por estado para consultas admin

#### job-postings-table
- **PK**: `jobId` (string)
- **Atributos**: `title`, `description`, `companyName`, `location`, `salary`, `status`, `createdAt`, `updatedAt`
- **GSI**: Por estado para filtrar ofertas publicadas

#### documents-table, forms-table, folders-table
- **Estructura**: Similar con `userId` como PK
- **Propósito**: Gestión de documentos y formularios por usuario

## Principios de Diseño

### 1. Backend Resuelve Todo
- **El frontend NUNCA resuelve lógica de datos**
- **Backend siempre retorna datos completos y enriquecidos**
- **No hardcodeo de valores en frontend**

### 2. Consistencia de Estados
- **Estados definidos y validados en backend**
- **Transiciones de estado controladas**
- **Auditoría con timestamps**

### 3. Seguridad
- **Validación de permisos en cada endpoint**
- **Datos filtrados por usuario cuando corresponde**
- **No exposición de datos sensibles**

### 4. Performance
- **BatchGetItem para consultas relacionales**
- **Índices GSI para consultas eficientes**
- **Respuestas optimizadas con datos pre-calculados**

## APIs Principales

### Mutations
- `applyToJob(jobId)` - Aplicar a trabajo
- `applyToMultipleJobs(jobIds)` - Aplicar a múltiples trabajos
- `updateApplicationStatus(applicationId, status)` - Cambiar estado (admin)
- `deleteMyApplication(applicationId)` - Eliminar aplicación propia

### Queries
- `getMyApplications()` - Aplicaciones del usuario actual
- `getAllApplications(status?, limit?, nextToken?)` - Todas las aplicaciones (admin)
- `getActiveJobPostings()` - Ofertas publicadas
- `getJobPosting(jobId)` - Detalle de oferta específica

## Validaciones y Errores

### Errores Comunes
- `400 Bad Request`: Datos inválidos o faltantes
- `401 Unauthorized`: Usuario no autenticado
- `403 Forbidden`: Sin permisos para la acción
- `404 Not Found`: Recurso no encontrado
- `409 Conflict`: Aplicación duplicada

### Validaciones
- **Formato de IDs**: UUID válido
- **Estados válidos**: Solo transiciones permitidas
- **Permisos de usuario**: Validación en cada endpoint
- **Datos requeridos**: Validación de campos obligatorios