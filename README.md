# 🚀 Enterprise Manpower Platform

## 📋 Quick Start

```bash
# Install dependencies
cd frontend && npm install

# Start development
npm run dev

# Quality checks (REQUIRED before commit)
npm run validate
```

## 🎯 Code Quality Standards

**⚠️ OBLIGATORIO**: Todo código debe pasar estrictos controles de calidad antes de commit.

### Pre-Commit Requirements
```bash
# ✅ MUST PASS
npm run validate

# Individual checks
npm run type-check    # TypeScript strict checking
npm run lint         # ESLint validation  
npm run build        # Production build test
```

### Quick Commands
```bash
# From project root:
npm run pre-commit   # Run all quality checks
npm run fix-all      # Auto-fix linting issues
npm run quality-check # Check without build
```

📚 **Ver [CODING_STANDARDS.md](./CODING_STANDARDS.md) para estándares completos**

---

# 🚀 Manpower Platform - AWS-Native

Una plataforma moderna de gestión de recursos humanos construida con **arquitectura AWS-Native**: React + Cognito + DynamoDB + AppSync.

## ⚡ Instalación en Nueva Cuenta AWS

**Un solo comando despliega todo el stack completo:**

```bash
./deploy.sh
```

> ✅ **Script actualizado**: Ya incluye `--require-approval never` para deployment totalmente automático.

### ✅ **Prueba de Fuego Realizada** 

**Tiempos reales de deployment completo:**

| Fase | Tiempo | Estado |
|------|--------|---------|
| Destruir stack completo | ⏱️ **4.0 min** | ✅ Exitoso |
| Reconstruir stack completo | ⏱️ **5.2 min** | ✅ Exitoso |
| **TOTAL** | ⏱️ **9.2 min** | 🎉 **Confirmado** |

**Resultado:** Stack 100% funcional desplegado en menos de 10 minutos, incluyendo:
- Cognito User Pool + Identity Pool + Grupos
- DynamoDB Tables + AppSync GraphQL API
- S3 Bucket + CloudFront Distribution + OAC
- Lambda Triggers (Pre-signup, Post-confirmation)
- Usuarios de prueba creados automáticamente
- Frontend funcionando en desarrollo y producción

### Prerrequisitos

1. **AWS CLI instalado y configurado:**
   ```bash
   aws configure
   ```

2. **Node.js 18+ instalado**

3. **Permisos AWS necesarios** (AdminitratorAccess recomendado para primera instalación)

### Variables de Entorno

```bash
# Opcional - valores por defecto
export ENVIRONMENT=dev          # dev | prod
export AWS_REGION=us-east-1    # región AWS
```

## 🏗️ Arquitectura AWS-Native

### Servicios AWS Desplegados

- **Amazon Cognito**: Autenticación y autorización (único sistema)
- **DynamoDB**: Base de datos NoSQL para applications y documentos
- **AppSync**: API GraphQL para queries en tiempo real
- **S3**: Hosting del frontend y almacenamiento de documentos
- **CloudFront**: CDN global
- **Lambda**: Triggers de Cognito (pre-signup, post-confirmation)
- **IAM**: Roles y políticas de acceso

### Stacks CDK

1. **ManpowerCognitoAuth**: Sistema de autenticación con Cognito
2. **ManpowerDataStack**: DynamoDB + AppSync GraphQL API
3. **ManpowerPlatformFrontend**: Frontend React en S3/CloudFront

## 🔐 Autenticación - Solo Cognito

### Sistema Único

La plataforma utiliza **únicamente Amazon Cognito** para autenticación:

- ✅ **Seguro**: MFA, password policies, account recovery
- ✅ **Escalable**: Millones de usuarios sin gestión de infraestructura
- ✅ **Compliance**: GDPR, HIPAA, SOC2 automático
- ✅ **JWT Tokens**: Estándar de la industria
- ✅ **Social Login**: Google, Facebook, Apple (configurable)

### Usuarios de Prueba

| Usuario | Email | Password | Role |
|---------|-------|----------|------|
| Admin | admin@test.com | TempPass123! | admin |
| Postulante | postulante@test.com | TempPass123! | postulante |

> 🔄 **Cambio automático de password**: Los usuarios deben cambiar la contraseña temporal en el primer login.

## 📊 Data Layer - AWS-Native

### DynamoDB Tables

- **manpower-applications-dev**: Aplicaciones de trabajo
- **manpower-documents-dev**: Metadatos de documentos

### AppSync GraphQL API

Endpoint: `https://u65zxvenhvb4bcm43g7ex5pnnu.appsync-api.us-east-1.amazonaws.com/graphql`

**Queries disponibles:**
- `getMyApplications`: Obtener mis aplicaciones (postulante)
- `getAllApplications`: Obtener todas las aplicaciones (admin)
- `getApplicationById`: Obtener aplicación específica

**Mutations disponibles:**
- `createApplication`: Crear nueva aplicación
- `updateApplication`: Actualizar aplicación
- `updateApplicationStatus`: Cambiar estado (admin)

## 🚀 Desarrollo

### Iniciar servidor local
```bash
cd frontend
npm run dev
# http://localhost:5174
```

### Desplegar frontend a S3/CloudFront
```bash
./scripts/deploy-frontend.sh
```

### Ver logs de Lambda
```bash
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/manpower
```

## 🔧 Comandos Útiles

### Backend (CDK)
```bash
cd aws/cdk

# Lista stacks disponibles
npx cdk list

# Deploy específico
npx cdk deploy ManpowerCognitoAuth

# Destroy todo
npx cdk destroy --all
```

### Frontend
```bash
cd frontend

# Desarrollo
npm run dev

# Build producción
npm run build

# Preview build
npm run preview

# Lint
npm run lint

# Type check
npm run type-check
```

### AWS Utilidades
```bash
# Ver usuarios en Cognito
aws cognito-idp list-users --user-pool-id us-east-1_uRCDemTcQ

# Ver tablas DynamoDB
aws dynamodb list-tables --query "TableNames[?contains(@, 'manpower')]"

# Ver distributions CloudFront
aws cloudfront list-distributions --query "DistributionList.Items[].{Id:Id,DomainName:DomainName}"
```

## 📁 Estructura del Proyecto

```
manpower-platform-app/
├── frontend/                 # React + TypeScript app
│   ├── src/
│   │   ├── services/
│   │   │   └── cognitoAuthService.ts    # Cognito integration
│   │   ├── hooks/
│   │   │   └── useAuth.ts               # Auth hook
│   │   └── components/
│   └── .env                 # Environment variables
├── aws/cdk/                 # AWS CDK infrastructure
│   ├── lib/
│   │   ├── cognito-auth-stack.ts       # Cognito setup
│   │   ├── data-stack.ts               # DynamoDB + AppSync
│   │   └── frontend-stack.ts           # S3 + CloudFront
│   └── bin/app.ts           # CDK app entry point
└── backend/                 # AWS-Native (no microservices)
    └── package.json         # Info sobre arquitectura
```

## 🚦 Estados de la Aplicación

| Estado | Descripción | Acciones Disponibles |
|---------|-------------|---------------------|
| PENDING | Aplicación enviada | Ver detalles |
| IN_REVIEW | En revisión por RRHH | Seguimiento |
| INTERVIEW_SCHEDULED | Entrevista programada | Confirmar/Reagendar |
| APPROVED | Aprobada para siguiente fase | Preparar documentos |
| REJECTED | Rechazada | Ver feedback |
| HIRED | Contratado | Onboarding |

## 🔒 Seguridad

### Políticas Implementadas

- **MFA**: Multi-factor authentication opcional
- **Password Policy**: Mínimo 8 caracteres, mayúsculas, números
- **JWT Tokens**: Tokens seguros con expiración configurable
- **Role-based Access**: Admin vs Postulante permissions
- **Route Guards**: Protección de rutas por rol
- **CORS**: Configurado solo para dominios permitidos
- **HTTPS**: Forzado en producción via CloudFront

### Logging & Monitoring

- **CloudWatch**: Logs de Lambda functions
- **Cognito Events**: Login attempts, password changes
- **Application Logs**: User actions tracking
- **Error Monitoring**: Automatic error capture

## 🚀 Production Deployment

### DNS Setup (Opcional)
```bash
# Configurar dominio custom
export DOMAIN_NAME=app.yourcompany.com
npx cdk deploy --parameters domainName=$DOMAIN_NAME
```

### SSL Certificate
```bash
# ACM certificate (manual)
aws acm request-certificate \
  --domain-name app.yourcompany.com \
  --validation-method DNS \
  --region us-east-1
```

### Environment Variables
```bash
# Production
export ENVIRONMENT=prod
export VITE_ENABLE_DEBUG=false
./deploy.sh
```

## 📚 Recursos

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

## 🆘 Soporte

Para problemas o preguntas:

1. **Issues**: Crear issue en el repositorio
2. **AWS Support**: Para problemas de infraestructura
3. **Logs**: Revisar CloudWatch logs primero

---

**🎯 Objetivo**: Plataforma de RRHH moderna, escalable y segura con AWS-Native architecture.