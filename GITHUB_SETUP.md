# 🚀 GitHub Actions Setup Guide

## Required GitHub Secrets

Para que el pipeline de deployment funcione, necesitas configurar los siguientes secrets en GitHub:

### 1. Ir a GitHub Repository Settings
- Ve a tu repositorio en GitHub
- Click en "Settings"
- En el sidebar izquierdo, click en "Secrets and variables" > "Actions"

### 2. Agregar AWS Credentials
Click "New repository secret" y agrega:

**AWS_ACCESS_KEY_ID**
```
Tu AWS Access Key ID
```

**AWS_SECRET_ACCESS_KEY**
```
Tu AWS Secret Access Key
```

### 3. Obtener AWS Credentials

#### Opción A: Usuario IAM existente
Si ya tienes un usuario IAM con permisos de deployment:
```bash
aws configure list
```

#### Opción B: Crear nuevo usuario IAM
```bash
# Crear usuario IAM para GitHub Actions
aws iam create-user --user-name github-actions-deployment

# Crear access key
aws iam create-access-key --user-name github-actions-deployment

# Asignar políticas necesarias
aws iam attach-user-policy --user-name github-actions-deployment --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
aws iam attach-user-policy --user-name github-actions-deployment --policy-arn arn:aws:iam::aws:policy/IAMFullAccess
```

### 4. Permisos Requeridos

El usuario IAM necesita los siguientes permisos:
- CloudFormation (crear/actualizar/eliminar stacks)
- S3 (crear buckets, subir archivos)
- CloudFront (crear/actualizar distribuciones, invalidaciones)
- Cognito (crear/configurar user pools)
- Lambda (si usas funciones Lambda)
- CDK Bootstrap permissions

## Workflow Behavior

### 🔍 Change Detection
El pipeline detecta automáticamente qué partes del código han cambiado:

- **frontend/**: Despliega solo el frontend (React → S3 + CloudFront)
- **backend/**: Despliega solo el backend (placeholder para Lambda functions)
- **aws/**: Despliega toda la infraestructura (CDK stacks)

### 🌟 Branch Strategy
- **main**: Deploys to production environment
- **develop**: Deploys to development environment
- **Pull Requests**: Runs tests and validation only

### 📋 Pipeline Steps

1. **detect-changes**: Identifica qué archivos cambiaron
2. **test-***: Ejecuta tests y validaciones
3. **deploy-infrastructure**: Despliega CDK stacks (si cambió aws/)
4. **deploy-frontend**: Build y deploy a S3/CloudFront (si cambió frontend/)
5. **deploy-backend**: Despliega backend services (si cambió backend/)

## Manual Deployment

Para deployment manual (sin GitHub Actions):
```bash
# Deploy completo
./deploy.sh

# Solo frontend
./scripts/deploy-frontend.sh

# Solo infraestructura
cd aws/cdk && npm run deploy
```

## Troubleshooting

### Error: AWS credentials not found
```bash
# Verificar configuración
aws sts get-caller-identity

# Si no funciona, configurar:
aws configure
```

### Error: CDK not bootstrapped
```bash
cd aws/cdk
npx cdk bootstrap
```

### Error: Stack does not exist
- El pipeline crea los stacks automáticamente
- Para primera ejecución, ejecuta `./deploy.sh` localmente primero

## Environment Variables

El pipeline automáticamente configura:
- `ENVIRONMENT`: `prod` para main, `dev` para develop
- `USE_COGNITO`: `true`
- `AWS_REGION`: `us-east-1`

## Next Steps

1. Configurar secrets en GitHub
2. Hacer push a `develop` o `main`
3. Verificar que el pipeline se ejecute correctamente
4. Acceder a la URL generada por CloudFront