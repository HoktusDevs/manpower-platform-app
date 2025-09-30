# Email Service - AWS SES

Microservicio dedicado para envío de emails usando AWS SES nativo.

## ⚠️ Requisitos Previos AWS SES

### 1. Verificar Email Sender

Antes de enviar emails, debes verificar el email en AWS SES:

```bash
# Opción 1: Via AWS Console
1. Ir a AWS SES Console
2. Verified identities → Create identity
3. Email address → noreply@manpower.com (o el dominio)
4. Verificar el email

# Opción 2: Via AWS CLI
aws ses verify-email-identity --email-address noreply@manpower.com --region us-east-1
```

### 2. Salir del Sandbox Mode (Producción)

Por defecto, SES está en **sandbox mode** con limitaciones:
- ❌ Solo puedes enviar a emails verificados
- ❌ Máximo 200 emails/día
- ❌ 1 email/segundo

Para salir del sandbox:

```bash
# Via AWS Console:
1. Ir a AWS SES Console
2. Account dashboard → Request production access
3. Completar el formulario explicando tu caso de uso
4. AWS responde en 24-48 horas

# En producción tendrás:
✅ Envío a cualquier email
✅ 50,000 emails/día (gratis)
✅ Después: $0.10 por 1,000 emails
```

### 3. Variables de Entorno

```bash
# En .env o en AWS Systems Manager Parameter Store
EMAIL_FROM=noreply@manpower.com
EMAIL_FROM_NAME=Manpower Platform
```

## 🚀 Deployment

```bash
# Instalar dependencias
npm install

# Deploy a dev
serverless deploy --stage dev

# Deploy a prod
serverless deploy --stage prod

# Obtener URL del servicio desplegado
serverless info --stage dev
```

## 📡 Endpoints

### POST /email/send
Enviar un email individual

```json
{
  "to": {
    "email": "candidate@example.com",
    "name": "Juan Pérez"
  },
  "subject": "Confirmación de Entrevista",
  "templateId": "interview-confirmation",
  "templateData": {
    "candidateName": "Juan Pérez",
    "interviewDate": "25 de septiembre",
    "interviewTime": "10:00 AM",
    "location": "Oficina Central",
    "interviewerName": "María González"
  }
}
```

### POST /email/send-bulk
Envío masivo de emails

```json
{
  "recipients": [
    { "email": "user1@example.com", "name": "User 1" },
    { "email": "user2@example.com", "name": "User 2" }
  ],
  "subject": "Actualización Importante",
  "templateId": "application-status-update",
  "templateData": {
    "positionTitle": "Desarrollador Backend",
    "status": "En Revisión",
    "statusMessage": "Tu postulación está siendo revisada"
  }
}
```

### GET /email/{emailId}/status
Obtener estado de un email

### GET /email/history?recipientEmail=user@example.com
Historial de emails enviados

## 📧 Templates Disponibles

1. **interview-confirmation** - Confirmación de entrevista
2. **interview-reminder** - Recordatorio de entrevista
3. **application-received** - Postulación recibida
4. **application-status-update** - Actualización de estado
5. **welcome** - Bienvenida
6. **password-reset** - Recuperación de contraseña

## 🔧 Testing Local

```bash
# Con serverless offline
serverless offline --stage local

# El servicio estará en:
http://localhost:3007
```

## ⚙️ Integración con API Gateway

Después de desplegar, agregar al api-gateway-service:

```yaml
# En api-gateway-service/serverless.yml
EmailResource:
  Type: AWS::ApiGateway::Resource
  Properties:
    RestApiId:
      Ref: MainApiGateway
    ParentId:
      Fn::GetAtt: [MainApiGateway, RootResourceId]
    PathPart: email

EmailProxyResource:
  Type: AWS::ApiGateway::Resource
  Properties:
    RestApiId:
      Ref: MainApiGateway
    ParentId:
      Ref: EmailResource
    PathPart: "{proxy+}"

EmailProxyMethod:
  Type: AWS::ApiGateway::Method
  Properties:
    RestApiId:
      Ref: MainApiGateway
    ResourceId:
      Ref: EmailProxyResource
    HttpMethod: ANY
    AuthorizationType: NONE
    Integration:
      Type: HTTP_PROXY
      IntegrationHttpMethod: ANY
      Uri: https://YOUR-EMAIL-SERVICE-URL.execute-api.us-east-1.amazonaws.com/dev/{proxy}
```

## 📊 Monitoreo

- CloudWatch Logs: Todos los envíos se loguean
- DynamoDB: Tracking de todos los emails con TTL de 90 días
- SES Dashboard: Métricas de bounce rate, complaints, etc.

## 🔒 Seguridad

- IAM roles mínimos necesarios
- Solo permisos de SES:SendEmail
- DynamoDB con encriptación en reposo
- CORS configurado
- Rate limiting en SES