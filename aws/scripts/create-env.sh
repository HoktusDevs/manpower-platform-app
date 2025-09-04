#!/bin/bash

# Manpower Platform Environment Configuration Script
# Usage: ./create-env.sh [environment]
# Example: ./create-env.sh prod
# Creates environment configuration files for deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")

# Create backend .env file
create_backend_env() {
    echo -e "${BLUE}Creating backend .env file...${NC}"
    
    # Get deployed resources information
    API_URL=""
    if aws cloudformation describe-stacks --stack-name ManpowerPlatformBackend > /dev/null 2>&1; then
        API_URL=$(aws cloudformation describe-stacks \
            --stack-name ManpowerPlatformBackend \
            --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
            --output text 2>/dev/null || echo "")
    fi
    
    FRONTEND_URL=""
    if aws cloudformation describe-stacks --stack-name ManpowerPlatformFrontend > /dev/null 2>&1; then
        FRONTEND_URL=$(aws cloudformation describe-stacks \
            --stack-name ManpowerPlatformFrontend \
            --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" \
            --output text 2>/dev/null || echo "")
    fi
    
    cat > ../../backend/.env <<EOF
# Environment Configuration
NODE_ENV=$ENVIRONMENT
AWS_REGION=$AWS_REGION
AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID

# API Configuration
API_GATEWAY_URL=$API_URL
PORT=3000

# Frontend Configuration
FRONTEND_URL=$FRONTEND_URL
CORS_ORIGIN=$FRONTEND_URL

# DynamoDB Tables
USERS_TABLE=manpower-users
JOB_POSTINGS_TABLE=manpower-jobPostings
FORMS_TABLE=manpower-forms
APPLICATIONS_TABLE=manpower-applications
FORM_SUBMISSIONS_TABLE=manpower-formSubmissions
FILES_TABLE=manpower-files
SESSIONS_TABLE=manpower-sessions
AUDIT_TRAIL_TABLE=manpower-auditTrail

# S3 Buckets
TEMP_BUCKET=manpower-temp-$AWS_ACCOUNT_ID-$AWS_REGION
FILES_BUCKET=manpower-files-$AWS_ACCOUNT_ID-$AWS_REGION
VIRUS_SCAN_BUCKET=manpower-virus-scan-$AWS_ACCOUNT_ID-$AWS_REGION
ARCHIVE_BUCKET=manpower-archive-$AWS_ACCOUNT_ID-$AWS_REGION

# File Upload Configuration
MAX_FILE_SIZE=104857600
ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,png,jpg,jpeg,zip
PRESIGNED_URL_EXPIRY=3600

# Security
JWT_SECRET=\$(openssl rand -hex 32)
ENCRYPTION_KEY=\$(openssl rand -hex 32)
SESSION_SECRET=\$(openssl rand -hex 32)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
EOF
    
    echo -e "${GREEN}✅ Backend .env file created${NC}"
}

# Create frontend .env file
create_frontend_env() {
    echo -e "${BLUE}Creating frontend .env file...${NC}"
    
    # Get API Gateway URL
    API_URL=""
    if aws cloudformation describe-stacks --stack-name ManpowerPlatformBackend > /dev/null 2>&1; then
        API_URL=$(aws cloudformation describe-stacks \
            --stack-name ManpowerPlatformBackend \
            --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
            --output text 2>/dev/null || echo "https://api.manpower.local")
    fi
    
    cat > ../../frontend/.env <<EOF
# Environment Configuration
VITE_ENVIRONMENT=$ENVIRONMENT
VITE_AWS_REGION=$AWS_REGION

# API Configuration
VITE_API_URL=$API_URL
VITE_API_TIMEOUT=30000

# File Upload Configuration
VITE_MAX_FILE_SIZE=104857600
VITE_ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,png,jpg,jpeg,zip

# Feature Flags
VITE_ENABLE_AUTH=true
VITE_ENABLE_FILE_UPLOAD=true
VITE_ENABLE_ANALYTICS=false

# UI Configuration
VITE_APP_NAME=Manpower Platform
VITE_APP_VERSION=1.0.0
VITE_SUPPORT_EMAIL=support@manpower.com
EOF
    
    echo -e "${GREEN}✅ Frontend .env file created${NC}"
}

# Create CDK context file
create_cdk_context() {
    echo -e "${BLUE}Creating CDK context file...${NC}"
    
    cat > ../cdk/cdk.context.json <<EOF
{
  "environment": "$ENVIRONMENT",
  "accountId": "$AWS_ACCOUNT_ID",
  "region": "$AWS_REGION",
  "vpcMaxAzs": 2,
  "enableMonitoring": true,
  "enableBackup": $([ "$ENVIRONMENT" = "prod" ] && echo "true" || echo "false"),
  "deploymentConfig": {
    "requireApproval": $([ "$ENVIRONMENT" = "prod" ] && echo "true" || echo "false"),
    "enableDeletionProtection": $([ "$ENVIRONMENT" = "prod" ] && echo "true" || echo "false")
  },
  "tags": {
    "Project": "ManpowerPlatform",
    "Environment": "$ENVIRONMENT",
    "ManagedBy": "CDK",
    "CostCenter": "Engineering"
  }
}
EOF
    
    echo -e "${GREEN}✅ CDK context file created${NC}"
}

# Create GitHub Actions secrets file (for reference)
create_github_secrets() {
    echo -e "${BLUE}Creating GitHub secrets reference...${NC}"
    
    cat > ../cicd/.github-secrets.md <<EOF
# GitHub Secrets Configuration

Add these secrets to your GitHub repository:

## AWS Credentials
- \`AWS_ACCESS_KEY_ID\`: Your AWS access key
- \`AWS_SECRET_ACCESS_KEY\`: Your AWS secret key
- \`AWS_REGION\`: $AWS_REGION
- \`AWS_ACCOUNT_ID\`: $AWS_ACCOUNT_ID

## Environment Variables
- \`ENVIRONMENT\`: $ENVIRONMENT
- \`NODE_ENV\`: $ENVIRONMENT

## Deployment Configuration
- \`CDK_DEFAULT_ACCOUNT\`: $AWS_ACCOUNT_ID
- \`CDK_DEFAULT_REGION\`: $AWS_REGION

## Notifications (Optional)
- \`SLACK_WEBHOOK_URL\`: Your Slack webhook for deployment notifications
- \`EMAIL_NOTIFICATION\`: Email for deployment notifications

## Commands to add secrets:
\`\`\`bash
gh secret set AWS_ACCESS_KEY_ID
gh secret set AWS_SECRET_ACCESS_KEY
gh secret set AWS_REGION --body "$AWS_REGION"
gh secret set AWS_ACCOUNT_ID --body "$AWS_ACCOUNT_ID"
gh secret set ENVIRONMENT --body "$ENVIRONMENT"
\`\`\`
EOF
    
    echo -e "${GREEN}✅ GitHub secrets reference created${NC}"
}

# Main flow
main() {
    echo -e "${BLUE}🔧 Creating environment configuration${NC}"
    echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
    echo -e "${BLUE}Region: $AWS_REGION${NC}"
    echo -e "${BLUE}Account: $AWS_ACCOUNT_ID${NC}"
    echo ""
    
    if [ -z "$AWS_ACCOUNT_ID" ]; then
        echo -e "${YELLOW}⚠️  Warning: AWS credentials not configured${NC}"
        echo -e "${YELLOW}Some values will be missing in the configuration files${NC}"
    fi
    
    # Create all configuration files
    create_backend_env
    create_frontend_env
    create_cdk_context
    create_github_secrets
    
    # Create .env.example files
    echo -e "${BLUE}Creating example files...${NC}"
    cp ../../backend/.env ../../backend/.env.example
    cp ../../frontend/.env ../../frontend/.env.example
    
    # Add .env to .gitignore if not already there
    for GITIGNORE in "../../backend/.gitignore" "../../frontend/.gitignore"; do
        if [ -f "$GITIGNORE" ]; then
            if ! grep -q "^.env$" "$GITIGNORE"; then
                echo ".env" >> "$GITIGNORE"
            fi
        fi
    done
    
    echo ""
    echo -e "${GREEN}✅ Environment configuration created successfully!${NC}"
    echo -e "${YELLOW}Note: Review and update the generated .env files with your actual values${NC}"
    echo -e "${YELLOW}Important: Never commit .env files to version control${NC}"
}

# Run main function
main