#!/bin/bash

# Manpower Platform Setup Script
# This script sets up the development environment and prepares for deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        echo "Please install Node.js 18 or later"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}❌ Node.js version is too old (${NODE_VERSION})${NC}"
        echo "Please install Node.js 18 or later"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js $(node --version)${NC}"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ npm $(npm --version)${NC}"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI is not installed${NC}"
        echo "Please install AWS CLI v2: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
    echo -e "${GREEN}✅ AWS CLI $(aws --version | cut -d' ' -f1)${NC}"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  AWS credentials not configured${NC}"
        echo "Please run 'aws configure' to set up your credentials"
        echo "You'll need:"
        echo "  - AWS Access Key ID"
        echo "  - AWS Secret Access Key"
        echo "  - Default region (e.g., us-east-1)"
        echo ""
        read -p "Do you want to configure AWS credentials now? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            aws configure
        else
            echo -e "${RED}❌ AWS credentials required for deployment${NC}"
            exit 1
        fi
    fi
    
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region)
    echo -e "${GREEN}✅ AWS credentials configured (Account: $AWS_ACCOUNT, Region: $AWS_REGION)${NC}"
    
    # Check jq for JSON processing
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq is not installed (optional but recommended)${NC}"
        echo "Install jq for better JSON processing: https://stedolan.github.io/jq/download/"
    else
        echo -e "${GREEN}✅ jq $(jq --version)${NC}"
    fi
}

# Install CDK dependencies
setup_cdk() {
    echo -e "${BLUE}Setting up CDK...${NC}"
    cd ../cdk
    
    # Install CDK globally if not present
    if ! command -v cdk &> /dev/null; then
        echo -e "${BLUE}Installing AWS CDK globally...${NC}"
        npm install -g aws-cdk
    fi
    
    echo -e "${GREEN}✅ CDK $(cdk --version)${NC}"
    
    # Install CDK project dependencies
    echo -e "${BLUE}Installing CDK project dependencies...${NC}"
    npm install
    
    # Build CDK project
    echo -e "${BLUE}Building CDK project...${NC}"
    npm run build
    
    cd ../scripts
    echo -e "${GREEN}✅ CDK setup completed${NC}"
}

# Set up environment configuration
setup_environment() {
    echo -e "${BLUE}Setting up environment configuration...${NC}"
    
    # Create .env file for backend
    if [ ! -f "../../backend/.env" ]; then
        echo -e "${BLUE}Creating backend .env file...${NC}"
        cat > ../../backend/.env << EOF
# Environment
NODE_ENV=development

# AWS Configuration
AWS_REGION=${AWS_REGION:-us-east-1}

# Database Configuration (will be set after deployment)
USERS_TABLE=manpower-users
FILES_TABLE=manpower-files
SESSIONS_TABLE=manpower-sessions

# Storage Configuration (will be set after deployment)
FILES_BUCKET=
TEMP_BUCKET=

# API Configuration
API_BASE_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx,txt

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
EOF
        echo -e "${GREEN}✅ Backend .env created${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend .env already exists${NC}"
    fi
    
    # Create .env file for frontend
    if [ ! -f "../../frontend/.env" ]; then
        echo -e "${BLUE}Creating frontend .env file...${NC}"
        cat > ../../frontend/.env << EOF
# Development API URL
VITE_API_URL=http://localhost:3000/api

# Production API URL (will be updated after deployment)
VITE_PROD_API_URL=

# App Configuration
VITE_APP_NAME=Manpower Platform
VITE_APP_VERSION=1.0.0

# File Upload Configuration
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx,txt

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
EOF
        echo -e "${GREEN}✅ Frontend .env created${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend .env already exists${NC}"
    fi
}

# Make scripts executable
setup_scripts() {
    echo -e "${BLUE}Making scripts executable...${NC}"
    chmod +x deploy.sh
    chmod +x destroy.sh
    chmod +x setup.sh
    echo -e "${GREEN}✅ Scripts are now executable${NC}"
}

# Create deployment guide
create_guide() {
    echo -e "${BLUE}Creating deployment guide...${NC}"
    cat > ../DEPLOYMENT_GUIDE.md << 'EOF'
# Manpower Platform Deployment Guide

## Prerequisites

- Node.js 18+
- AWS CLI v2
- AWS Account with appropriate permissions
- Configured AWS credentials

## Quick Start

1. **Setup (first time only)**
   ```bash
   cd aws/scripts
   ./setup.sh
   ```

2. **Deploy everything**
   ```bash
   ./deploy.sh prod all
   ```

## Deployment Commands

### Deploy specific stacks
```bash
./deploy.sh prod database    # Deploy database only
./deploy.sh prod storage     # Deploy storage only
./deploy.sh prod backend     # Deploy backend only
./deploy.sh prod frontend    # Deploy frontend only
./deploy.sh prod monitoring  # Deploy monitoring only
```

### Destroy resources
```bash
./destroy.sh prod
```

## Project Structure

```
aws/
├── cdk/                 # Infrastructure as Code
│   ├── lib/            # CDK stack definitions
│   └── bin/            # CDK app entry point
├── scripts/            # Deployment scripts
├── cicd/              # CI/CD configurations
└── DEPLOYMENT_GUIDE.md
```

## Infrastructure Components

- **Frontend**: S3 + CloudFront for global delivery
- **Backend**: Lambda functions with API Gateway
- **Database**: DynamoDB with auto-scaling
- **Storage**: S3 buckets for file storage
- **Monitoring**: CloudWatch dashboards and alarms

## Environment Variables

After deployment, update your environment files with the actual resource names:

### Backend (.env)
- `FILES_BUCKET`: From ManpowerPlatformStorage stack output
- `USERS_TABLE`, `FILES_TABLE`, `SESSIONS_TABLE`: From ManpowerPlatformDatabase stack output

### Frontend (.env)
- `VITE_PROD_API_URL`: From ManpowerPlatformBackend stack output

## Monitoring

- CloudWatch Dashboard: Available in AWS Console
- Alarms: Email notifications for errors and high load
- Logs: CloudWatch Logs for Lambda functions

## Troubleshooting

1. **Permission Issues**: Ensure your AWS user has necessary permissions
2. **Stack Dependencies**: Deploy in order: database → storage → backend → frontend → monitoring
3. **S3 Bucket Names**: Must be globally unique, script uses account ID suffix
4. **Lambda Limits**: Check concurrent execution limits in high-load scenarios

## Production Checklist

- [ ] Update JWT_SECRET in backend .env
- [ ] Configure proper CORS_ORIGINS
- [ ] Set up custom domain name
- [ ] Configure SSL certificate
- [ ] Set up proper monitoring alerts
- [ ] Configure backup strategies
- [ ] Set up log retention policies
EOF
    echo -e "${GREEN}✅ Deployment guide created: aws/DEPLOYMENT_GUIDE.md${NC}"
}

# Main setup function
main() {
    echo -e "${BLUE}🚀 Manpower Platform Setup${NC}"
    echo -e "${BLUE}This script will prepare your environment for deployment${NC}"
    echo ""
    
    check_prerequisites
    setup_scripts
    setup_cdk
    setup_environment
    create_guide
    
    echo ""
    echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "${BLUE}1. Review and update environment files in frontend/ and backend/${NC}"
    echo -e "${BLUE}2. Deploy the infrastructure: ./deploy.sh prod all${NC}"
    echo -e "${BLUE}3. Check the deployment guide: ../DEPLOYMENT_GUIDE.md${NC}"
}

# Run main function
main