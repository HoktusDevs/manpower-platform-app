# CloudFront Distribution - Applicant Frontend

**Fecha de creación**: 2025-10-03
**Estado**: ✅ Creado y desplegándose

---

## 📋 Información de la Distribución

### Detalles Principales
- **Distribution ID**: `E2OW45KYYH2WYM`
- **Domain Name**: `d35vn6jxat3bme.cloudfront.net`
- **ARN**: `arn:aws:cloudfront::041238861016:distribution/E2OW45KYYH2WYM`
- **Status**: `InProgress` (tarda ~15-20 minutos)

### URLs
- **CloudFront (HTTPS)**: https://d35vn6jxat3bme.cloudfront.net
- **S3 Direct (HTTP)**: http://manpower-applicant-frontend-dev.s3-website-us-east-1.amazonaws.com

---

## 🔧 Configuración

### Origen (Origin)
- **Origin ID**: `S3-manpower-applicant-frontend-dev`
- **Origin Domain**: `manpower-applicant-frontend-dev.s3-website-us-east-1.amazonaws.com`
- **Protocol Policy**: HTTP only (S3 website endpoint)
- **Connection Timeout**: 10s
- **Read Timeout**: 30s

### Cache Behavior
- **Viewer Protocol**: `redirect-to-https` (HTTP → HTTPS automático)
- **Allowed Methods**: `GET`, `HEAD`
- **Compress**: ✅ Enabled (gzip/brotli)
- **Min TTL**: 0s (inmediato)
- **Default TTL**: 86400s (24 horas)
- **Max TTL**: 31536000s (1 año)

### Error Pages (SPA Routing)
Redirige errores 403/404 a `index.html` para React Router:

| Error Code | Response Page | Response Code | Cache TTL |
|------------|---------------|---------------|-----------|
| 403        | /index.html   | 200           | 300s      |
| 404        | /index.html   | 200           | 300s      |

### Características
- ✅ **HTTPS**: Certificado SSL de CloudFront
- ✅ **Compression**: Gzip/Brotli automático
- ✅ **HTTP/2**: Habilitado
- ✅ **IPv6**: Habilitado
- ✅ **CDN Global**: PriceClass_All (todos los edge locations)

---

## 🚀 Deployment Workflow

### 1. Build Local
```bash
cd applicant-frontend
npm run build
```

### 2. Deploy a S3
```bash
aws s3 sync dist/ s3://manpower-applicant-frontend-dev/ --delete
```

### 3. Invalidar Cache de CloudFront
```bash
aws cloudfront create-invalidation \
  --distribution-id E2OW45KYYH2WYM \
  --paths "/*"
```

**Ejemplo completo:**
```bash
# Full deployment pipeline
npm run build && \
aws s3 sync dist/ s3://manpower-applicant-frontend-dev/ --delete && \
aws cloudfront create-invalidation \
  --distribution-id E2OW45KYYH2WYM \
  --paths "/*"
```

---

## 📊 Comparación HTTP vs HTTPS

### Antes (Solo S3 - HTTP)
- ❌ Solo HTTP (inseguro)
- ❌ Sin cache global (más lento)
- ❌ Sin compresión automática
- ❌ URL fea: `s3-website-us-east-1.amazonaws.com`
- ✅ Cambios inmediatos (sin cache)

### Ahora (CloudFront - HTTPS)
- ✅ HTTPS con certificado SSL
- ✅ CDN global (edge locations worldwide)
- ✅ Compresión gzip/brotli automática
- ✅ URL más limpia: `cloudfront.net`
- ✅ Mejor performance (cache en edge)
- ⚠️ Requiere invalidación de cache

---

## ⏱️ Estado de Propagación

### Verificar Estado
```bash
aws cloudfront get-distribution \
  --id E2OW45KYYH2WYM \
  --query 'Distribution.Status' \
  --output text
```

**Estados posibles:**
- `InProgress`: Desplegándose (15-20 mins) ⏳
- `Deployed`: Listo para usar ✅

### Cuando esté Deployed
1. Abre: https://d35vn6jxat3bme.cloudfront.net
2. Verifica que carga el applicant-frontend
3. Verifica que HTTP redirige a HTTPS
4. Verifica que rutas SPA funcionan (ej: `/mis-aplicaciones`)

---

## 🔄 Invalidación de Cache

### ¿Cuándo invalidar?
- Después de cada deploy a S3
- Cuando cambias archivos estáticos
- Cuando necesitas forzar actualización

### Comandos útiles
```bash
# Invalidar todo
aws cloudfront create-invalidation \
  --distribution-id E2OW45KYYH2WYM \
  --paths "/*"

# Invalidar solo archivos específicos
aws cloudfront create-invalidation \
  --distribution-id E2OW45KYYH2WYM \
  --paths "/index.html" "/assets/*"

# Ver invalidaciones activas
aws cloudfront list-invalidations \
  --distribution-id E2OW45KYYH2WYM
```

---

## 🎯 Próximos Pasos Opcionales

### Dominio Custom (Producción)
1. Comprar dominio (ej: `app.manpower.com`)
2. Crear certificado SSL en ACM (us-east-1)
3. Agregar CNAME a distribución
4. Configurar DNS (Route53 o externo)

### Monitoring
- CloudWatch Logs
- CloudFront Analytics
- Real User Monitoring (RUM)

### Security
- AWS WAF (firewall)
- AWS Shield (DDoS protection)
- Origin Access Control (OAC) para S3 privado

---

## 📝 Notas

- **Costo**: ~$0.085 por GB transferido (primeros 10TB/mes)
- **Free Tier**: 1TB salida gratis por mes (12 meses)
- **Cache Hit Ratio**: Monitorear en CloudWatch para optimizar TTL
- **Geographic Restrictions**: Ninguna (disponible worldwide)

---

**Última actualización**: 2025-10-03
**Creado por**: Claude Code
