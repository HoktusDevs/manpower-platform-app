# Guía de Migración a la Capa Compartida de DynamoDB

Esta guía te ayudará a migrar tus servicios existentes para usar la nueva capa compartida de DynamoDB.

## 🎯 Beneficios de la Migración

- **Reducción de código**: De ~200 líneas a ~20 líneas por servicio
- **Operaciones cross-service**: Queries entre servicios
- **Configuración centralizada**: Un solo lugar para gestionar tablas
- **Operaciones batch**: Optimizadas automáticamente
- **Búsqueda global**: Across múltiples servicios

## 📋 Plan de Migración

### Fase 1: Preparación
1. ✅ Crear capa compartida
2. ✅ Configurar TableRegistry
3. ✅ Implementar CrossServiceQuery
4. 🔄 Refactorizar servicios uno por uno

### Fase 2: Migración Gradual
1. **jobs-service** (Prioridad Alta)
2. **applications-service** (Prioridad Alta)
3. **document-types-service** (Ya implementado)
4. **folders-service** (Prioridad Media)
5. **files-service** (Prioridad Media)

## 🚀 Migración del Jobs-Service

### Paso 1: Instalar Dependencias

```bash
cd backend/jobs-service
npm install ../../shared/dynamo
```

### Paso 2: Crear Servicio Refactorizado

```typescript
// backend/jobs-service/src/services/jobServiceRefactored.ts
import { BaseDynamoService, TableConfig } from '../../../shared/dynamo/BaseDynamoService';
import { TableRegistry, CrossServiceQuery, initializeTableRegistry } from '../../../shared/dynamo';

export class JobServiceRefactored extends BaseDynamoService {
  constructor() {
    const tableConfig: TableConfig = {
      tableName: process.env.JOBS_TABLE || `manpower-jobs-${process.env.STAGE || 'dev'}`,
      keySchema: [
        { AttributeName: 'jobId', KeyType: 'HASH' },
        { AttributeName: 'createdBy', KeyType: 'RANGE' }
      ],
      attributeDefinitions: [
        { AttributeName: 'jobId', AttributeType: 'S' },
        { AttributeName: 'createdBy', AttributeType: 'S' },
        { AttributeName: 'status', AttributeType: 'S' },
        { AttributeName: 'createdAt', AttributeType: 'S' },
        { AttributeName: 'companyName', AttributeType: 'S' }
      ],
      billingMode: 'PAY_PER_REQUEST',
      globalSecondaryIndexes: [
        {
          IndexName: 'StatusIndex',
          KeySchema: [
            { AttributeName: 'status', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' }
        }
      ]
    };

    super(tableConfig);
  }

  // Métodos específicos del negocio
  async createJob(job: JobModel): Promise<Job> {
    return this.putItem(job.toJSON());
  }

  async getJob(jobId: string, createdBy: string): Promise<Job | null> {
    return this.getItem({ jobId, createdBy });
  }

  // Cross-service operations
  async getJobsWithApplications(jobIds: string[]): Promise<any[]> {
    const registry = TableRegistry.getInstance();
    const crossServiceQuery = new CrossServiceQuery(registry);
    
    crossServiceQuery.registerService('jobs-service', this);

    const result = await crossServiceQuery.queryRelatedTables(
      'jobs-service',
      'jobs',
      { jobId: { $in: jobIds } },
      [
        {
          serviceName: 'applications-service',
          tableName: 'applications',
          query: { jobId: { $in: jobIds } }
        }
      ]
    );

    return result.primary;
  }
}
```

### Paso 3: Actualizar Handlers

```typescript
// backend/jobs-service/src/handlers/jobs.ts
import { JobServiceRefactored, createJobService } from '../services/jobServiceRefactored';

export const createJob = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const jobService = createJobService(); // Usar factory function
    const input = JSON.parse(event.body || '{}');
    const createdBy = extractUserFromEvent(event).userId;
    
    const job = await jobService.createJob(input, createdBy);
    
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

### Paso 4: Testing

```typescript
// backend/jobs-service/src/tests/jobService.test.ts
import { JobServiceRefactored } from '../services/jobServiceRefactored';

describe('JobServiceRefactored', () => {
  let jobService: JobServiceRefactored;

  beforeEach(() => {
    jobService = new JobServiceRefactored();
  });

  it('should create a job', async () => {
    const jobData = {
      title: 'Test Job',
      description: 'Test Description',
      companyName: 'Test Company'
    };

    const result = await jobService.createJob(jobData, 'user123');
    expect(result).toBeDefined();
    expect(result.title).toBe('Test Job');
  });

  it('should get jobs with applications', async () => {
    const jobIds = ['job1', 'job2'];
    const result = await jobService.getJobsWithApplications(jobIds);
    
    expect(result.jobs).toBeDefined();
    expect(result.applications).toBeDefined();
  });
});
```

## 🔄 Migración de Applications-Service

### Paso 1: Crear Servicio Refactorizado

```typescript
// backend/applications-service/src/services/applicationServiceRefactored.ts
import { BaseDynamoService, TableConfig } from '../../../shared/dynamo/BaseDynamoService';

export class ApplicationServiceRefactored extends BaseDynamoService {
  constructor() {
    const tableConfig: TableConfig = {
      tableName: process.env.APPLICATIONS_TABLE || `manpower-applications-${process.env.STAGE || 'dev'}`,
      keySchema: [
        { AttributeName: 'applicationId', KeyType: 'HASH' },
        { AttributeName: 'jobId', KeyType: 'RANGE' }
      ],
      attributeDefinitions: [
        { AttributeName: 'applicationId', AttributeType: 'S' },
        { AttributeName: 'jobId', AttributeType: 'S' },
        { AttributeName: 'applicantId', AttributeType: 'S' },
        { AttributeName: 'status', AttributeType: 'S' }
      ],
      billingMode: 'PAY_PER_REQUEST',
      globalSecondaryIndexes: [
        {
          IndexName: 'ApplicantIndex',
          KeySchema: [
            { AttributeName: 'applicantId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' }
        }
      ]
    };

    super(tableConfig);
  }

  async createApplication(application: any): Promise<any> {
    return this.putItem(application);
  }

  async getApplication(applicationId: string, jobId: string): Promise<any | null> {
    return this.getItem({ applicationId, jobId });
  }

  async getApplicationsByApplicant(applicantId: string): Promise<any[]> {
    const result = await this.query('applicantId = :applicantId', {
      expressionAttributeValues: { ':applicantId': applicantId }
    });
    return result.items;
  }
}
```

## 🎯 Nuevas Capacidades Post-Migración

### 1. Dashboard Completo

```typescript
// Nuevo endpoint para dashboard
export const getDashboardData = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const jobService = createJobService();
  
  // Obtener datos de múltiples servicios
  const analytics = await jobService.getJobAnalytics({
    start: '2024-01-01',
    end: '2024-12-31'
  });

  const jobsWithDetails = await jobService.getJobsWithApplications(['job1', 'job2']);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analytics,
      jobsWithDetails
    })
  };
};
```

### 2. Búsqueda Global

```typescript
// Nuevo endpoint para búsqueda global
export const globalSearch = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const jobService = createJobService();
  const searchTerm = event.queryStringParameters?.q || '';
  
  const results = await jobService.globalJobSearch(searchTerm);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(results)
  };
};
```

### 3. Reportes Avanzados

```typescript
// Nuevo endpoint para reportes
export const getAdvancedReports = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const jobService = createJobService();
  
  const reports = await jobService.getJobsWithDocumentTypes(['job1', 'job2']);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reports)
  };
};
```

## 📊 Comparación Antes vs Después

### Código Original (jobs-service)

```typescript
// ~200 líneas de código duplicado
export class DynamoService {
  private client: DynamoDBDocumentClient;
  private rawClient: DynamoDBClient;
  private tableName: string;
  private tableInitialized: boolean = false;

  constructor() {
    this.rawClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      ...(process.env.STAGE === 'local' && {
        endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
        credentials: {
          accessKeyId: 'dummy',
          secretAccessKey: 'dummy'
        }
      })
    });
    this.client = DynamoDBDocumentClient.from(this.rawClient);
    this.tableName = process.env.JOBS_TABLE || `manpower-jobs-${process.env.STAGE || 'dev'}`;
  }

  // ... 150+ líneas más de código duplicado
}
```

### Código Refactorizado

```typescript
// ~20 líneas de código específico del negocio
export class JobServiceRefactored extends BaseDynamoService {
  constructor() {
    super(COMMON_TABLE_CONFIGS.JOBS);
  }

  async createJob(job: JobModel): Promise<Job> {
    return this.putItem(job.toJSON());
  }

  // Cross-service operations automáticamente disponibles
}
```

## 🚀 Próximos Pasos

1. **Migrar jobs-service** (Prioridad Alta)
2. **Migrar applications-service** (Prioridad Alta)
3. **Implementar nuevos endpoints** con cross-service queries
4. **Agregar tests** para las nuevas funcionalidades
5. **Documentar** las nuevas capacidades

## ⚠️ Consideraciones Importantes

- **Compatibilidad**: El código existente sigue funcionando
- **Migración gradual**: Se puede migrar servicio por servicio
- **Testing**: Probar cada migración antes de continuar
- **Rollback**: Mantener el código original hasta confirmar que todo funciona
- **Performance**: Las operaciones cross-service pueden ser más lentas

## 📝 Checklist de Migración

- [ ] Instalar dependencias compartidas
- [ ] Crear servicio refactorizado
- [ ] Actualizar handlers
- [ ] Agregar tests
- [ ] Probar en desarrollo
- [ ] Desplegar a staging
- [ ] Probar en staging
- [ ] Desplegar a producción
- [ ] Monitorear performance
- [ ] Eliminar código antiguo
