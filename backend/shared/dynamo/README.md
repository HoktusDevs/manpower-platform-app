# Shared DynamoDB Layer

Esta capa de abstracción compartida proporciona funcionalidades comunes para todos los microservicios, facilitando el acceso a DynamoDB y permitiendo operaciones cross-service.

## 🚀 Características

- **BaseDynamoService**: Clase base con operaciones CRUD comunes
- **TableRegistry**: Registro centralizado de tablas y configuraciones
- **CrossServiceQuery**: Operaciones entre servicios y joins de datos
- **Configuraciones predefinidas**: Tablas comunes ya configuradas
- **Operaciones batch**: Operaciones masivas optimizadas
- **Búsqueda global**: Búsqueda across múltiples servicios

## 📦 Instalación

```bash
# En cada servicio que quiera usar la capa compartida
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## 🔧 Configuración

### 1. Importar las dependencias

```typescript
import { 
  BaseDynamoService, 
  TableRegistry, 
  CrossServiceQuery,
  initializeTableRegistry 
} from '../../shared/dynamo';
```

### 2. Configurar el servicio

```typescript
export class MyService extends BaseDynamoService {
  constructor() {
    const tableConfig = {
      tableName: process.env.MY_TABLE || `my-table-${process.env.STAGE || 'dev'}`,
      keySchema: [
        { AttributeName: 'id', KeyType: 'HASH' },
        { AttributeName: 'createdBy', KeyType: 'RANGE' }
      ],
      attributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'createdBy', AttributeType: 'S' }
      ],
      billingMode: 'PAY_PER_REQUEST'
    };

    super(tableConfig);
  }
}
```

## 🎯 Uso Básico

### Operaciones CRUD

```typescript
const service = new MyService();

// Crear
const item = await service.putItem({ id: '123', name: 'Test' });

// Leer
const item = await service.getItem({ id: '123', createdBy: 'user1' });

// Actualizar
const updated = await service.updateItem(
  { id: '123', createdBy: 'user1' },
  { name: 'Updated Name' }
);

// Eliminar
await service.deleteItem({ id: '123', createdBy: 'user1' });
```

### Consultas y Scans

```typescript
// Query con filtros
const result = await service.query('status = :status', {
  expressionAttributeValues: { ':status': 'ACTIVE' },
  limit: 10
});

// Scan con filtros complejos
const result = await service.scan({
  filterExpression: 'contains(#name, :search) AND #status = :status',
  expressionAttributeNames: { '#name': 'name', '#status': 'status' },
  expressionAttributeValues: { 
    ':search': 'test', 
    ':status': 'ACTIVE' 
  }
});
```

### Operaciones Batch

```typescript
// Batch Get
const items = await service.batchGet([
  { id: '1', createdBy: 'user1' },
  { id: '2', createdBy: 'user1' }
]);

// Batch Write
await service.batchWrite([
  { type: 'put', item: { id: '3', name: 'New Item' } },
  { type: 'delete', key: { id: '4', createdBy: 'user1' } }
]);
```

## 🔗 Operaciones Cross-Service

### Configuración

```typescript
// Inicializar infraestructura compartida
const { registry, crossServiceQuery } = initializeTableRegistry();

// Registrar servicios
crossServiceQuery.registerService('jobs-service', jobsService);
crossServiceQuery.registerService('applications-service', applicationsService);
```

### Consultas Relacionadas

```typescript
// Obtener jobs con sus aplicaciones
const result = await crossServiceQuery.getJobsWithDetails(
  { status: 'PUBLISHED' },
  { limit: 10 }
);

console.log('Jobs:', result.primary);
console.log('Applications:', result.related);
```

### Búsqueda Global

```typescript
// Buscar en múltiples servicios
const results = await crossServiceQuery.globalSearch('developer', [
  {
    serviceName: 'jobs-service',
    tableName: 'jobs',
    searchFields: ['title', 'description']
  },
  {
    serviceName: 'applications-service',
    tableName: 'applications',
    searchFields: ['applicantName', 'coverLetter']
  }
]);
```

### Analytics Cross-Service

```typescript
// Obtener datos de analytics
const analytics = await crossServiceQuery.getAnalyticsData(
  { start: '2024-01-01', end: '2024-12-31' },
  [
    { serviceName: 'jobs-service', tableName: 'jobs', dateField: 'createdAt' },
    { serviceName: 'applications-service', tableName: 'applications', dateField: 'createdAt' }
  ]
);
```

## 🏗️ Refactorización de Servicios Existentes

### Antes (Código duplicado)

```typescript
export class JobsService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    // Configuración duplicada en cada servicio
    this.rawClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      // ... más configuración
    });
    this.client = DynamoDBDocumentClient.from(this.rawClient);
    this.tableName = process.env.JOBS_TABLE || `manpower-jobs-${process.env.STAGE || 'dev'}`;
  }

  async createJob(job: JobModel): Promise<Job> {
    // Lógica duplicada para cada operación
    const command = new PutCommand({
      TableName: this.tableName,
      Item: job.toJSON(),
    });
    await this.client.send(command);
    return job.toJSON();
  }
}
```

### Después (Usando capa compartida)

```typescript
export class JobsService extends BaseDynamoService {
  constructor() {
    super(COMMON_TABLE_CONFIGS.JOBS);
  }

  async createJob(job: JobModel): Promise<Job> {
    return this.putItem(job.toJSON());
  }

  async getJob(jobId: string, createdBy: string): Promise<Job | null> {
    return this.getItem({ jobId, createdBy });
  }
}
```

## 📊 Ventajas

### ✅ Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Código duplicado** | ~200 líneas por servicio | ~20 líneas por servicio |
| **Configuración** | Manual en cada servicio | Centralizada y reutilizable |
| **Cross-service queries** | No disponible | ✅ Disponible |
| **Operaciones batch** | Implementación manual | ✅ Automáticas |
| **Búsqueda global** | No disponible | ✅ Disponible |
| **Analytics** | Limitado por servicio | ✅ Cross-service |
| **Mantenimiento** | Difícil | ✅ Fácil |

### 🚀 Nuevas Capacidades

1. **Consultas Cross-Service**: Obtener datos relacionados de múltiples servicios
2. **Búsqueda Global**: Buscar en todos los servicios simultáneamente
3. **Analytics Avanzados**: Métricas across servicios
4. **Operaciones Batch**: Operaciones masivas optimizadas
5. **Configuración Centralizada**: Un solo lugar para gestionar tablas

## 🔧 Configuraciones Predefinidas

```typescript
import { COMMON_TABLE_CONFIGS } from '../../shared/dynamo';

// Usar configuración predefinida
const jobsService = new BaseDynamoService(COMMON_TABLE_CONFIGS.JOBS);
const applicationsService = new BaseDynamoService(COMMON_TABLE_CONFIGS.APPLICATIONS);
const documentTypesService = new BaseDynamoService(COMMON_TABLE_CONFIGS.DOCUMENT_TYPES);
```

## 🎯 Casos de Uso Comunes

### 1. Dashboard de Admin
```typescript
// Obtener estadísticas completas
const stats = await crossServiceQuery.getAnalyticsData(
  { start: '2024-01-01', end: '2024-12-31' },
  [
    { serviceName: 'jobs-service', tableName: 'jobs', dateField: 'createdAt' },
    { serviceName: 'applications-service', tableName: 'applications', dateField: 'createdAt' },
    { serviceName: 'document-types-service', tableName: 'document-types', dateField: 'createdAt' }
  ]
);
```

### 2. Búsqueda de Empleos
```typescript
// Buscar empleos con detalles completos
const jobsWithDetails = await crossServiceQuery.getJobsWithDetails(
  { status: 'PUBLISHED', location: 'Madrid' },
  { limit: 20 }
);
```

### 3. Reportes de Aplicaciones
```typescript
// Obtener aplicaciones con detalles del empleo
const applicationsWithJobs = await crossServiceQuery.getApplicationsWithDetails(
  { status: 'PENDING' },
  { limit: 50 }
);
```

## 🚀 Próximos Pasos

1. **Refactorizar servicios existentes** para usar la nueva capa
2. **Implementar cross-service queries** en endpoints específicos
3. **Agregar más configuraciones predefinidas** según necesidades
4. **Implementar caching** para operaciones frecuentes
5. **Agregar métricas y monitoring** para operaciones cross-service

## 📝 Notas Importantes

- La capa compartida mantiene compatibilidad con el código existente
- Las operaciones cross-service requieren que los servicios estén registrados
- Para producción, asegúrate de configurar los permisos IAM correctos
- Las operaciones batch están optimizadas para DynamoDB limits
