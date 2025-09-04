# AWS DevOps Infrastructure - Manpower Platform

Esta carpeta contiene toda la infraestructura DevOps para el stack fullstack optimizado para **ALTA DEMANDA** (15000+ archivos/día, admin/postulante workflow, datos sensibles).

## 🏆 **REDISEÑO COMPLETO - HITOS LOGRADOS**

### ✅ **HITO 1: Database Schema Redesignado** 
- **8 tablas especializadas** para workflow admin/postulante
- **Customer-managed encryption** para datos sensibles
- **Índices GSI optimizados** para consultas de alta frecuencia
- **Audit trail** completo para compliance

### ✅ **HITO 2: Security Stack Implementado**
- **VPC con 3 capas** (public, private, isolated)
- **KMS encryption** con rotación automática
- **Secrets Manager** para credenciales sensibles
- **WAF con reglas AWS Managed** contra ataques comunes
- **VPC Endpoints** para reducir costos y mejorar seguridad

### ✅ **HITO 3: File Processing Optimizado para 15K/día**
- **4 buckets especializados** (temp, files, virus-scan, archive)
- **SQS queues** para procesamiento asíncrono
- **Transfer Acceleration** habilitado
- **Virus scanning** automático con cuarentena
- **Lifecycle policies** inteligentes para optimización de costos

## 🏗️ Arquitectura Rediseñada

```
React Vite → CloudFront + WAF → S3 (Frontend)
     ↓
VPC (3-tier: Public/Private/Isolated)
     ↓
API Discovery → Dynamic Config & Schema
     ↓  
API Gateway → Lambda (NestJS) → 8x DynamoDB Tables (Encrypted)
     ↓
File Upload Pipeline: Temp S3 → Virus Scan → Production S3
     ↓
SQS Queues → Async Processing → Archive S3
     ↓
KMS Encryption + Secrets Manager + Audit Trail
     ↓
CloudWatch (Enhanced Monitoring)
```

## 📊 **Database Schema Completo**

### **Tablas Principales:**
1. **users** - Admin/Postulante con roles (EmailIndex, RoleIndex)
2. **jobPostings** - Ofertas laborales (StatusIndex)  
3. **forms** - Formularios dinámicos de inscripción
4. **applications** - Postulaciones (UserIndex, JobIndex, StatusIndex)
5. **formSubmissions** - Respuestas de formularios (ApplicationIndex)
6. **files** - Archivos con metadata (UserIndex, ApplicationIndex, TypeIndex)
7. **sessions** - Autenticación JWT con TTL
8. **auditTrail** - Trazabilidad completa (UserIndex, ActionIndex)

## 🔄 **API Discovery Dinámico**

### ✨ Características Nuevas:
- **Zero Hardcode**: Frontend obtiene rutas dinámicamente del backend
- **Auto Schema Validation**: Payloads se validan automáticamente
- **Live Documentation**: Endpoints y schemas actualizados en tiempo real
- **Debug Panel**: Testing de APIs integrado en el frontend

### Endpoints Discovery:
```bash
GET /api/config        # Configuración base y features
GET /api/endpoints     # Lista todos los endpoints por servicio
GET /api/schemas       # Todos los schemas de payloads
GET /api/schemas/{name}# Schema específico con ejemplos
```

## 📁 Estructura

```
aws/
├── cdk/                    # Infraestructura CDK (TypeScript)
│   ├── lib/
│   │   ├── api-discovery-stack.ts   # 🆕 API Discovery service
│   │   ├── frontend-stack.ts        # S3 + CloudFront
│   │   ├── backend-stack.ts         # Lambda + API Gateway
│   │   ├── database-stack.ts        # DynamoDB tables
│   │   ├── storage-stack.ts         # S3 buckets
│   │   └── monitoring-stack.ts      # CloudWatch dashboards
│   └── bin/app.ts         # Entry point
├── scripts/               # Scripts de deployment
│   ├── setup.sh          # Configuración inicial
│   ├── deploy.sh         # Deployment completo
│   └── destroy.sh        # Limpieza de recursos
├── cicd/                 # CI/CD pipeline
│   └── github-actions.yml
└── README.md
```

## 🚀 Quick Start

```bash
# 1. Configuración inicial (solo primera vez)
cd aws/scripts
./setup.sh

# 2. Deploy completo (incluye API Discovery)
./deploy.sh prod all

# 3. URLs disponibles después del deploy
# - Frontend: https://xyz.cloudfront.net
# - API Main: https://xyz.execute-api.region.amazonaws.com
# - API Discovery: https://abc.execute-api.region.amazonaws.com
# - Dashboard: CloudWatch console
```

## 🔌 Integración Frontend-Backend

### Frontend (Auto-Config):
```typescript
// ✅ Se conecta automáticamente
import { apiClient } from './services/api-client';

// Auto-discovery de endpoints
await apiClient.auth.login({ email, password });
await apiClient.files.upload(formData);

// Validación automática de schemas
const validation = await apiClient.validatePayload('LoginPayload', data);
```

### Backend (Schema Definition):
```typescript
// ✅ Define una vez, usa en todas partes
const LoginPayload = {
  email: { type: 'string', required: true, format: 'email' },
  password: { type: 'string', required: true, minLength: 8 }
};
```

### Debug Panel (Development):
- Panel integrado para testing de APIs
- Validación en tiempo real
- Ejemplos automáticos de payloads
- Testing de endpoints sin Postman

## ⚙️ Optimizaciones para Alta Carga

### Lambda Functions
- **Concurrent executions**: 100 para files, 50 para auth/users  
- **Memory**: 1024MB para files, 512MB para otros
- **Timeout**: 5min para files, 30s para otros

### DynamoDB
- **Billing mode**: On-demand (auto-scaling)
- **Encryption**: AWS managed
- **Backup**: Point-in-time recovery
- **GSI**: Optimized queries para user files

### S3 + CloudFront
- **Transfer acceleration**: Habilitado
- **Lifecycle policies**: IA después 30 días, Glacier después 90 días
- **CloudFront**: Global edge locations, HTTP/2+3
- **Caching**: Optimizado para static assets

### API Gateway
- **Throttling**: 1000 requests/sec, burst 2000
- **CORS**: Configurado automáticamente
- **Regional**: Latencia optimizada

## 📊 Monitoreo Automático

- **Dashboards**: Métricas en tiempo real (incluye Discovery API)
- **Alarms**: Email notifications para errores y alta latencia
- **Logs**: Centralizados en CloudWatch
- **Métricas**: Lambda, DynamoDB, CloudFront, API Discovery

## 💰 Costos Estimados (mensual)

```
Lambda (100 concurrent):    ~$50-100
DynamoDB (on-demand):       ~$30-80
S3 (files + transfer):      ~$20-50
CloudFront:                 ~$15-40
API Gateway:                ~$15-35  # +Discovery API
CloudWatch:                 ~$5-15
Total:                      ~$135-320/mes
```

## 🔧 Comandos Útiles

```bash
# Deploy por stacks individuales
./deploy.sh prod database
./deploy.sh prod api-discovery  # 🆕 Deploy discovery first
./deploy.sh prod storage  
./deploy.sh prod backend
./deploy.sh prod frontend
./deploy.sh prod monitoring

# Test API Discovery
curl https://abc.execute-api.us-east-1.amazonaws.com/api/config
curl https://abc.execute-api.us-east-1.amazonaws.com/api/endpoints

# Destruir todo (¡cuidado!)
./destroy.sh prod
```

## 🔒 Seguridad

- **IAM roles**: Mínimos permisos necesarios
- **Encryption**: At rest y in transit
- **CORS**: Configurado automáticamente
- **SSL**: Certificados automáticos via CloudFront
- **Schema Validation**: Previene payloads maliciosos

## 📋 Variables de Entorno

Después del deploy, **automáticamente configurado**:

**Frontend (.env.production)**
```bash
VITE_DISCOVERY_API_URL=https://abc.execute-api.us-east-1.amazonaws.com
# ✅ El resto se obtiene dinámicamente
```

**Backend (.env)**
```bash
DISCOVERY_API_URL=https://abc.execute-api.us-east-1.amazonaws.com
# ✅ Tablas y buckets se configuran automáticamente
```

## ⚡ CI/CD Automático

GitHub Actions configurado para:
- **Tests**: Frontend + Backend + Discovery API
- **Build**: Optimized builds
- **Deploy**: Automático en push a main (deploy discovery first)
- **Rollback**: Manual si es necesario

## 🔧 Development Features

### API Debug Panel:
```typescript
// Activar en development
import { ApiDebugPanel } from './components/ApiDebugPanel';

// Panel completo de testing:
// - Lista todos los endpoints dinámicamente
// - Muestra schemas con ejemplos
// - Testing en tiempo real
// - Validación automática
```

### Schema Hot Reload:
- Cambios en backend se reflejan inmediatamente en frontend
- No need to restart development servers
- Cache automático con TTL de 5 minutos

## 🚨 Troubleshooting

1. **Permission denied**: Revisar AWS credentials
2. **Stack dependency error**: Deploy en orden: database → api-discovery → storage → backend → frontend
3. **Schema not found**: Verificar que discovery API esté deployed
4. **CORS issues**: Discovery API incluye CORS automático
5. **High latency**: Verificar concurrent execution limits

## 🆕 Migration Guide

Para apps existentes:
1. Deploy API Discovery stack
2. Actualizar frontend con nuevo api-client
3. Backend define schemas una vez
4. Remove hardcoded endpoints del frontend

**Resultado**: Zero-maintenance API integration 🎉