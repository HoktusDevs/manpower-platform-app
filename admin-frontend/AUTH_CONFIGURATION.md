# 🔐 Authentication Configuration Guide

## Overview
This application uses AWS Cognito for authentication with support for both User Pool and Identity Pool authentication methods to work seamlessly with AppSync GraphQL.

## 🏗️ Architecture

### Authentication Flow
```
User Login → Cognito User Pool → ID/Access Tokens → AppSync GraphQL
     ↓
Identity Pool (Optional) → IAM Credentials → AWS Services
```

### Current Configuration

#### 1. **Cognito User Pool** (Primary Authentication)
- **Purpose**: User registration, login, and JWT token management
- **Used for**: AppSync GraphQL API authentication
- **Environment Variables**:
  - `VITE_USER_POOL_ID=us-east-1_uRCDemTcQ`
  - `VITE_USER_POOL_CLIENT_ID=5jt63usa3sgmaeju2pqojr7io1`

#### 2. **Cognito Identity Pool** (Secondary - IAM)
- **Purpose**: Provides IAM credentials for direct AWS service access
- **Used for**: S3 uploads, direct DynamoDB access (if needed)
- **Environment Variables**:
  - `VITE_IDENTITY_POOL_ID=us-east-1:fb4db648-574b-42fd-b1d4-e7b02e2cd0cb`

## 🔧 Implementation Details

### useAuth Hook
- Initializes Cognito with **both** User Pool and Identity Pool
- Primary authentication method: User Pool (JWT tokens)
- Fallback/enhanced access: Identity Pool (IAM credentials)

### GraphQL Service
- **Primary Mode**: `AMAZON_COGNITO_USER_POOLS`
- **Auth Mode**: `userPool` (uses JWT ID tokens)
- **Hybrid Support**: Can use Identity Pool credentials when needed

### Configuration Hierarchy
1. Environment variables (`.env`)
2. Fallback to hardcoded defaults
3. Runtime configuration validation

## 🚀 Usage

### Login Process
```typescript
// User logs in via useAuth hook
const success = await login({ email, password });

// GraphQL automatically uses:
// 1. ID Token from User Pool for API calls
// 2. Identity Pool credentials for AWS services (optional)
```

### AppSync Authorization
- **GraphQL Queries/Mutations**: User Pool ID Token
- **File Uploads**: Identity Pool IAM credentials
- **Admin Operations**: Role-based access via JWT claims

## 🔒 Security Features

### JWT Token Validation
- Validates token structure and role claims
- Automatic token refresh
- Logout on token expiration

### Role-based Access
- `custom:role` claim in JWT tokens
- Roles: `admin`, `postulante`
- Component-level route protection

## 🛠️ Configuration Files

### App.tsx
```typescript
const config = {
  authenticationType: 'AMAZON_COGNITO_USER_POOLS',
  userPoolId: import.meta.env.VITE_USER_POOL_ID,
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
  identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID // Added for hybrid support
};
```

### useAuth.ts
```typescript
cognitoAuthService.initialize({
  userPoolId: import.meta.env.VITE_USER_POOL_ID,
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
  identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID, // Now included
  region: import.meta.env.VITE_AWS_REGION
});
```

## 🔍 Troubleshooting

### Common Issues

#### 1. "No authentication token" errors
- **Cause**: Missing or expired JWT tokens
- **Solution**: User needs to log in again

#### 2. "Authorization failed" errors
- **Cause**: Invalid role claims or expired session
- **Solution**: Check JWT token structure and role assignment

#### 3. AppSync connection issues
- **Cause**: Misconfigured authentication mode
- **Solution**: Verify User Pool configuration matches AppSync settings

### Debug Information
The app logs authentication configuration on startup:
```javascript
console.log('🔧 Environment variables check:', {
  VITE_USER_POOL_ID: '...',
  VITE_USER_POOL_CLIENT_ID: '...',
  VITE_IDENTITY_POOL_ID: '...' // Now included in logs
});
```

## ✅ Benefits of Current Setup

1. **Robust Authentication**: User Pool for primary auth
2. **Enhanced AWS Access**: Identity Pool for direct AWS service access
3. **AppSync Compatibility**: Full GraphQL API support
4. **Flexible Architecture**: Can switch between auth modes as needed
5. **Security**: Role-based access control with JWT validation

## 🔄 Recent Changes (Fixed)

- ✅ **Fixed**: Identity Pool now properly included in configuration
- ✅ **Fixed**: Consistent authentication setup across all services
- ✅ **Fixed**: AppSync authentication mode compatibility
- ✅ **Fixed**: Hybrid User Pool + Identity Pool support