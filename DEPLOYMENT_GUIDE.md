# 🚀 Guía de Deployment a S3/CloudFront

Esta guía te lleva paso a paso para migrar todos los frontends de Manpower Platform a AWS S3/CloudFront.

## 📋 **Prerrequisitos**

- AWS CLI configurado con credenciales válidas
- Node.js y npm instalados
- Acceso a la cuenta AWS donde están los microservicios
- Dominio personalizado (opcional)

## 🏗️ **Paso 1: Desplegar Infraestructura**

### 1.1 Crear buckets S3 y distribuciones CloudFront

```bash
# Desplegar infraestructura base
aws cloudformation deploy \
  --template-file infrastructure/s3-cloudfront.yml \
  --stack-name manpower-frontends-dev \
  --parameter-overrides Environment=dev \
  --region us-east-1
```

### 1.2 Verificar que la infraestructura se creó correctamente

```bash
# Verificar stack
aws cloudformation describe-stacks \
  --stack-name manpower-frontends-dev \
  --region us-east-1
```

## 🔧 **Paso 2: Actualizar CORS en Microservicios**

### 2.1 Ejecutar script de actualización CORS

```bash
# Actualizar CORS en todos los microservicios
node scripts/update-cors-config.js
```

### 2.2 Desplegar microservicios actualizados

```bash
# Desplegar todos los microservicios
cd backend
npm run deploy:all
```

## 🚀 **Paso 3: Desplegar Frontends**

### 3.1 Construir y desplegar todos los frontends

```bash
# Desplegar todos los frontends a S3/CloudFront
./scripts/deploy-frontends-to-s3.sh dev
```

### 3.2 Verificar deployment

```bash
# Probar configuración completa
./scripts/test-production-setup.sh dev
```

## 🔒 **Paso 4: Configurar Dominios Personalizados (Opcional)**

### 4.1 Crear certificado SSL

```bash
# Crear certificado SSL en us-east-1 (requerido para CloudFront)
aws acm request-certificate \
  --domain-name admin.manpower-platform.com \
  --subject-alternative-names applicant.manpower-platform.com auth.manpower-platform.com \
  --validation-method DNS \
  --region us-east-1
```

### 4.2 Validar certificado

```bash
# Obtener información de validación
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID \
  --region us-east-1
```

### 4.3 Desplegar dominios personalizados

```bash
# Desplegar configuración de dominios
aws cloudformation deploy \
  --template-file infrastructure/ssl-domains.yml \
  --stack-name manpower-domains-dev \
  --parameter-overrides \
    Environment=dev \
    SSLCertificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID \
  --region us-east-1
```

## 🧪 **Paso 5: Testing y Validación**

### 5.1 Ejecutar tests completos

```bash
# Probar toda la configuración
./scripts/test-production-setup.sh dev
```

### 5.2 Tests manuales

1. **Probar URLs de frontends:**
   - Admin: `https://d1234567890abc.cloudfront.net`
   - Applicant: `https://d0987654321xyz.cloudfront.net`
   - Auth: `https://d1111111111def.cloudfront.net`

2. **Probar funcionalidad:**
   - Login/logout
   - Navegación entre páginas
   - Llamadas a APIs
   - Carga de archivos

3. **Probar CORS:**
   - Verificar que las llamadas a APIs funcionan desde CloudFront
   - Verificar headers CORS en respuestas

## 📊 **Monitoreo y Mantenimiento**

### 6.1 CloudWatch Alarms

```bash
# Crear alarmas para monitoreo
aws cloudwatch put-metric-alarm \
  --alarm-name "Frontend-4xx-Errors" \
  --alarm-description "Alert on 4xx errors" \
  --metric-name 4xxErrorRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

### 6.2 Logs de CloudFront

```bash
# Habilitar logs de CloudFront
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

## 🔄 **Automatización con GitHub Actions**

### 7.1 Crear workflow de CI/CD

```yaml
# .github/workflows/deploy-frontends.yml
name: Deploy Frontends to S3/CloudFront

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Deploy frontends
        run: ./scripts/deploy-frontends-to-s3.sh prod
```

## 🚨 **Solución de Problemas**

### Problemas Comunes

1. **Error 403 en CloudFront:**
   ```bash
   # Verificar política de bucket
   aws s3api get-bucket-policy --bucket BUCKET_NAME
   ```

2. **CORS no funciona:**
   ```bash
   # Verificar headers CORS
   curl -I https://api-endpoint/health
   ```

3. **Certificado SSL no válido:**
   ```bash
   # Verificar estado del certificado
   aws acm describe-certificate --certificate-arn CERT_ARN
   ```

### Comandos de Diagnóstico

```bash
# Verificar estado de CloudFront
aws cloudfront get-distribution --id DISTRIBUTION_ID

# Verificar contenido de S3
aws s3 ls s3://BUCKET_NAME/

# Probar conectividad
curl -v https://FRONTEND_URL
```

## 📈 **Optimizaciones**

### 8.1 Cache Headers

```yaml
# Configurar cache headers en CloudFront
CacheBehaviors:
  - PathPattern: "*.js"
    TargetOriginId: S3Origin
    ViewerProtocolPolicy: redirect-to-https
    CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad  # Managed-CachingOptimized
```

### 8.2 Compresión

```yaml
# Habilitar compresión
DefaultCacheBehavior:
  Compress: true
```

### 8.3 Security Headers

```yaml
# Agregar security headers
ResponseHeadersPolicy:
  SecurityHeadersPolicy:
    StrictTransportSecurity:
      AccessControlMaxAgeSec: 31536000
      IncludeSubdomains: true
```

## 🎯 **Resultados Esperados**

Después de completar todos los pasos, deberías tener:

- ✅ 3 frontends funcionando en S3/CloudFront
- ✅ CORS configurado correctamente
- ✅ APIs funcionando sin problemas
- ✅ Certificados SSL (si se configuraron dominios)
- ✅ Monitoreo y alertas configuradas
- ✅ Pipeline de CI/CD funcionando

## 📞 **Soporte**

Si encuentras problemas:

1. Revisa los logs de CloudWatch
2. Verifica la configuración de CORS
3. Comprueba que los buckets S3 tengan el contenido correcto
4. Valida que las distribuciones CloudFront estén desplegadas

---

**¡Tu plataforma Manpower ahora está completamente migrada a S3/CloudFront! 🎉**
