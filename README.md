# 🚀 Manpower Platform

Una plataforma moderna de gestión de recursos humanos construida con React, AWS CDK, y Amazon Cognito.

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
- S3 Bucket + CloudFront Distribution + OAC
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
export USE_COGNITO=true        # true | false  
export AWS_REGION=us-east-1    # región AWS
```

## 🏗️ Arquitectura

### Servicios AWS Desplegados

- **Amazon Cognito**: Autenticación y autorización
- **S3**: Hosting del frontend y almacenamiento
- **CloudFront**: CDN global
- **DynamoDB**: Base de datos (Auth Service legacy)
- **Lambda**: Funciones serverless
- **API Gateway**: APIs REST
- **IAM**: Roles y políticas

### Stacks CDK

1. **ManpowerCognitoAuth**: Sistema de autenticación con Cognito
2. **ManpowerPlatformFrontend**: Frontend React en S3/CloudFront
3. **ManpowerAuthService**: Servicio de auth legacy (opcional)

## 🔐 Autenticación

### Sistema Híbrido

La plataforma soporta dos sistemas de autenticación:

- **Amazon Cognito** (recomendado): Seguro, escalable, compliance automático
- **Custom Auth Service** (legacy): Para retrocompatibilidad

**Cambiar entre sistemas:**
```bash
# Usar Cognito
export USE_COGNITO=true
./deploy.sh

# Usar sistema custom
export USE_COGNITO=false  
./deploy.sh
```

### Usuarios de Prueba (Cognito)

| Usuario | Email | Password | Role |
|---------|-------|----------|------|
| Admin | admin@test.com | TempPass123! | admin |
| Postulante | postulante@test.com | TempPass123! | postulante |

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

### Comandos útiles
```bash
# Ver diferencias antes de deploy
cd aws/cdk && npm run diff

# Destruir todo el stack
cd aws/cdk && npm run destroy

# Ver logs de CloudFormation
aws cloudformation describe-stack-events --stack-name ManpowerCognitoAuth
```

## 📁 Estructura del Proyecto

```
manpower-platform-app/
├── deploy.sh                 # 🚀 Script de despliegue completo
├── aws/cdk/                  # Infraestructura AWS CDK
│   ├── lib/
│   │   ├── cognito-auth-stack.ts      # Stack Cognito
│   │   ├── auth-service-stack.ts      # Stack Auth legacy
│   │   └── frontend-stack.ts          # Stack Frontend S3/CloudFront
│   └── bin/app.ts            # Punto de entrada CDK
├── frontend/                 # Aplicación React
│   ├── src/
│   │   ├── services/
│   │   │   ├── cognitoAuthService.ts  # Cliente Cognito
│   │   │   └── customAuthService.ts   # Auth service custom
│   │   ├── hooks/useAuth.ts           # Hook auth unificado
│   │   └── types/auth.ts              # Tipos TypeScript
│   ├── .env                  # Config desarrollo
│   ├── .env.production       # Config producción
│   └── .env.cognito          # Config Cognito
└── scripts/
    └── deploy-frontend.sh    # Deploy frontend a S3/CloudFront
```

## 🌐 URLs Post-Deployment

Después del deployment, el script mostrará:

- **Website URL**: `https://xxxx.cloudfront.net`
- **S3 Bucket**: `manpower-frontend-{account}-{region}`
- **Cognito User Pool**: `us-east-1_xxxxxxx`

## 🔄 Migración entre Cuentas

### Proceso Completo

1. **Configurar nueva cuenta AWS:**
   ```bash
   aws configure --profile nueva-cuenta
   export AWS_PROFILE=nueva-cuenta
   ```

2. **Desplegar todo:**
   ```bash
   ./deploy.sh
   ```

3. **Verificar deployment:**
   ```bash
   # Test de salud de los servicios
   curl https://xxxx.cloudfront.net
   ```

### Personalización por Entorno

**Desarrollo:**
```bash
ENVIRONMENT=dev ./deploy.sh
```

**Producción:**
```bash
ENVIRONMENT=prod USE_COGNITO=true ./deploy.sh
```

## 📊 Costos Estimados

| Servicio | Costo/Mes (15K usuarios) |
|----------|--------------------------|
| Cognito | $15-25 |
| CloudFront | $10-20 |  
| S3 | $5-10 |
| Lambda | $5-15 |
| **Total** | **~$50-100** |

## 🛡️ Seguridad

### Características de Seguridad

- **Cognito**: OAuth 2.0, MFA, compliance GDPR/HIPAA
- **CloudFront**: HTTPS obligatorio, OAC para S3
- **S3**: Bucket policies restrictivas, no acceso público
- **IAM**: Principio de menor privilegio

### Configuraciones de Seguridad

```typescript
// Password policy
passwordPolicy: {
  minLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireDigits: true,
  requireSymbols: true
}

// MFA opcional
mfa: cognito.Mfa.OPTIONAL
```

## 🚨 Troubleshooting

### Errores Comunes

**Error: Stack already exists**
```bash
cd aws/cdk && npm run destroy
./deploy.sh
```

**Error: AWS credentials not configured**
```bash
aws configure
export AWS_PROFILE=your-profile
```

**Error: CDK bootstrap needed**
```bash
cd aws/cdk
npx cdk bootstrap aws://ACCOUNT/REGION
```

### Logs y Monitoreo

```bash
# CloudWatch logs para Lambda
aws logs tail /aws/lambda/manpower-pre-signup-dev --follow

# Eventos CloudFormation
aws cloudformation describe-stack-events --stack-name ManpowerCognitoAuth
```

## 📈 Próximos Pasos

1. **Configurar dominio custom** en CloudFront
2. **Implementar CI/CD** con GitHub Actions
3. **Monitoreo avanzado** con CloudWatch Dashboards
4. **Backup y disaster recovery**
5. **Optimización de performance**

## 🤝 Contribución

1. Fork del proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Distribuido bajo licencia MIT. Ver `LICENSE` para más información.

---

**¿Necesitas ayuda?** Abre un issue o contacta al equipo de desarrollo.

🎉 **¡Listo para usar en producción!**