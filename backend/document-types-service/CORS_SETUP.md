# CORS Configuration for Document Types Service

## Overview
This document describes the CORS (Cross-Origin Resource Sharing) configuration for the Document Types Service, covering both local development and production deployment.

## Local Development

### Port Configuration
- **Document Types Service**: `http://localhost:3006`
- **Admin Frontend**: `http://localhost:6500` (or Vite default port)
- **Jobs Service**: `http://localhost:3004`

### CORS Headers
The service includes comprehensive CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent, X-User-Id
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

### Environment Variables
Set the following environment variables for local development:

**Backend (jobs-service)**:
```bash
export DOCUMENT_TYPES_SERVICE_URL=http://localhost:3006
```

**Frontend (admin-frontend)**:
```bash
export REACT_APP_DOCUMENT_TYPES_SERVICE_URL=http://localhost:3006
```

## Production Deployment

### API Gateway URLs
- **Development**: `https://document-types-service-dev.execute-api.us-east-1.amazonaws.com/dev`
- **Staging**: `https://document-types-service-staging.execute-api.us-east-1.amazonaws.com/staging`
- **Production**: `https://document-types-service-prod.execute-api.us-east-1.amazonaws.com/prod`

### CORS Configuration
The service uses AWS API Gateway's built-in CORS support with the following configuration:

```yaml
httpApi:
  cors:
    allowedOrigins:
      - "*"  # Restrict in production to specific domains
    allowedHeaders:
      - Content-Type
      - Authorization
      - X-Amz-Date
      - X-Api-Key
      - X-Amz-Security-Token
      - X-Amz-User-Agent
      - X-User-Id
    allowedMethods:
      - GET
      - POST
      - PUT
      - DELETE
      - OPTIONS
    allowCredentials: true
    maxAge: 86400
```

## Security Considerations

### Development
- CORS is configured to allow all origins (`*`) for ease of development
- All necessary headers are included for API Gateway compatibility

### Production
- **IMPORTANT**: Restrict `allowedOrigins` to specific domains:
  ```yaml
  allowedOrigins:
    - "https://admin.manpower-platform.com"
    - "https://applicant.manpower-platform.com"
    - "https://auth.manpower-platform.com"
  ```

## Testing CORS

### Local Testing
```bash
# Test CORS preflight
curl -X OPTIONS \
  -H "Origin: http://localhost:6500" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://localhost:3006/document-types

# Test actual request
curl -X GET \
  -H "Origin: http://localhost:6500" \
  http://localhost:3006/document-types
```

### Production Testing
```bash
# Test CORS preflight
curl -X OPTIONS \
  -H "Origin: https://admin.manpower-platform.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://document-types-service-prod.execute-api.us-east-1.amazonaws.com/prod/document-types
```

## Troubleshooting

### Common Issues

1. **CORS Error in Browser**
   - Check that the frontend URL is included in `allowedOrigins`
   - Verify that the service is running on the correct port
   - Check browser developer tools for detailed error messages

2. **Preflight Request Failing**
   - Ensure OPTIONS method is configured in serverless.yml
   - Check that `handleOptions` handler is properly configured
   - Verify that all required headers are included

3. **Credentials Not Working**
   - Ensure `Access-Control-Allow-Credentials: true` is set
   - Check that `Access-Control-Allow-Origin` is not `*` when using credentials
   - Verify that the frontend is sending credentials with requests

### Debug Commands

```bash
# Check if service is running
curl http://localhost:3006/health

# Test CORS headers
curl -I -X OPTIONS http://localhost:3006/document-types

# Check service logs
cd document-types-service
serverless logs -f checkHealth
```

## Service Integration

### Jobs Service Integration
The jobs-service automatically communicates with the document-types-service:

```typescript
// Environment variable for jobs-service
DOCUMENT_TYPES_SERVICE_URL=http://localhost:3006
```

### Frontend Integration
The admin-frontend uses the document-types-service for autocomplete:

```typescript
// Environment variable for frontend
REACT_APP_DOCUMENT_TYPES_SERVICE_URL=http://localhost:3006
```

## Deployment Checklist

- [ ] CORS headers configured in serverless.yml
- [ ] OPTIONS handler implemented
- [ ] Environment variables set correctly
- [ ] Service URLs updated for production
- [ ] Origins restricted for production
- [ ] Health check endpoint working
- [ ] CORS preflight requests working
- [ ] Actual API requests working
