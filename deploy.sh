#!/bin/bash

# 🚀 Manpower Platform - Complete Deployment Script
# Deploys the entire stack to any AWS account with a single command

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${ENVIRONMENT:-dev}
USE_COGNITO=${USE_COGNITO:-true}
AWS_REGION=${AWS_REGION:-us-east-1}

echo -e "${BLUE}🚀 Manpower Platform - Complete Deployment${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
echo -e "📋 Configuration:"
echo -e "   Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "   Auth System: ${YELLOW}$([ "$USE_COGNITO" = "true" ] && echo "Amazon Cognito" || echo "Custom Auth")${NC}"
echo -e "   AWS Region: ${YELLOW}$AWS_REGION${NC}"
echo ""

# Step 1: Verify AWS Configuration
echo -e "${BLUE}🔍 Step 1: Verifying AWS Configuration${NC}"
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI first.${NC}"
    exit 1
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
if [ -z "$AWS_ACCOUNT" ]; then
    echo -e "${RED}❌ AWS credentials not configured. Run 'aws configure' first.${NC}"
    exit 1
fi

AWS_PROFILE=$(aws configure list | grep profile | awk '{print $2}' | head -1)
echo -e "   ✅ AWS Account: ${GREEN}$AWS_ACCOUNT${NC}"
echo -e "   ✅ AWS Region: ${GREEN}$(aws configure get region)${NC}"
echo -e "   ✅ AWS Profile: ${GREEN}${AWS_PROFILE:-default}${NC}"
echo ""

# Step 2: Install CDK Dependencies
echo -e "${BLUE}🔧 Step 2: Installing CDK Dependencies${NC}"
cd aws/cdk
if [ ! -d "node_modules" ]; then
    echo "   📦 Installing CDK packages..."
    npm install
else
    echo "   ✅ CDK dependencies already installed"
fi
echo ""

# Step 3: Bootstrap CDK (if needed)
echo -e "${BLUE}🏗️  Step 3: Bootstrapping CDK (if needed)${NC}"
BOOTSTRAP_STACK="CDKToolkit"
if aws cloudformation describe-stacks --stack-name $BOOTSTRAP_STACK --region $AWS_REGION >/dev/null 2>&1; then
    echo "   ✅ CDK already bootstrapped in $AWS_REGION"
else
    echo "   🔄 Bootstrapping CDK for account $AWS_ACCOUNT in region $AWS_REGION..."
    npx cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION
    echo "   ✅ CDK bootstrap completed"
fi
echo ""

# Step 4: Deploy Infrastructure
echo -e "${BLUE}🏗️  Step 4: Deploying Infrastructure${NC}"
echo "   🚀 Deploying $([ "$USE_COGNITO" = "true" ] && echo "Cognito" || echo "Custom Auth") stacks..."

export ENVIRONMENT=$ENVIRONMENT
export USE_COGNITO=$USE_COGNITO
export CDK_DEFAULT_REGION=$AWS_REGION

npm run deploy -- --require-approval never
echo ""

# Step 5: Get Stack Outputs
echo -e "${BLUE}📋 Step 5: Extracting Stack Outputs${NC}"

if [ "$USE_COGNITO" = "true" ]; then
    # Get Cognito stack outputs
    USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name ManpowerCognitoAuth --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text --region $AWS_REGION)
    USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name ManpowerCognitoAuth --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text --region $AWS_REGION)
    IDENTITY_POOL_ID=$(aws cloudformation describe-stacks --stack-name ManpowerCognitoAuth --query 'Stacks[0].Outputs[?OutputKey==`IdentityPoolId`].OutputValue' --output text --region $AWS_REGION)
fi

# Get Frontend stack outputs
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name ManpowerPlatformFrontend --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' --output text --region $AWS_REGION)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name ManpowerPlatformFrontend --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' --output text --region $AWS_REGION)
WEBSITE_URL=$(aws cloudformation describe-stacks --stack-name ManpowerPlatformFrontend --query 'Stacks[0].Outputs[?OutputKey==`WebsiteUrl`].OutputValue' --output text --region $AWS_REGION)

echo ""

# Step 6: Create Environment Files
echo -e "${BLUE}🔧 Step 6: Creating Environment Configuration${NC}"
cd ../../frontend

# Create .env file for this deployment
cat > .env << EOF
# Manpower Platform Configuration - $(date)
VITE_USE_COGNITO=$USE_COGNITO
VITE_AWS_REGION=$AWS_REGION

# App Configuration
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Manpower Platform
VITE_APP_VERSION=1.0.0

# File Upload Configuration
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx,txt

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
VITE_ENVIRONMENT=$ENVIRONMENT
EOF

if [ "$USE_COGNITO" = "true" ]; then
    cat >> .env << EOF

# Cognito Configuration
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
VITE_IDENTITY_POOL_ID=$IDENTITY_POOL_ID
EOF
fi

# Create production environment file
cat > .env.production << EOF
# Production Environment - $(date)
VITE_USE_COGNITO=$USE_COGNITO
VITE_AWS_REGION=$AWS_REGION

# Production API Configuration  
VITE_API_URL=https://api.manpower.com/api
VITE_APP_NAME=Manpower Platform
VITE_APP_VERSION=1.0.0

# File Upload Configuration
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx,txt

# Production Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false
VITE_ENVIRONMENT=production
EOF

if [ "$USE_COGNITO" = "true" ]; then
    cat >> .env.production << EOF

# Cognito Configuration
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
VITE_IDENTITY_POOL_ID=$IDENTITY_POOL_ID
EOF
fi

echo "   ✅ Environment files created"

# Add AWS-Native configuration to environment files
if [ "$USE_COGNITO" = "true" ]; then
    echo "
# AWS-Native Configuration (Direct DynamoDB + AppSync)
VITE_USE_AWS_NATIVE=true
VITE_GRAPHQL_URL=\$(aws cloudformation describe-stacks --stack-name ManpowerDataStack --query 'Stacks[0].Outputs[?OutputKey==\`GraphQLURL\`].OutputValue' --output text)
VITE_APPLICATIONS_TABLE=\$(aws cloudformation describe-stacks --stack-name ManpowerDataStack --query 'Stacks[0].Outputs[?OutputKey==\`ApplicationsTableName\`].OutputValue' --output text)
VITE_DOCUMENTS_TABLE=\$(aws cloudformation describe-stacks --stack-name ManpowerDataStack --query 'Stacks[0].Outputs[?OutputKey==\`DocumentsTableName\`].OutputValue' --output text)" >> .env
fi

echo ""

# Step 7: Install Frontend Dependencies
echo -e "${BLUE}📦 Step 7: Installing Frontend Dependencies${NC}"
if [ ! -d "node_modules" ]; then
    echo "   📦 Installing frontend packages..."
    npm install
else
    echo "   ✅ Frontend dependencies already installed"
fi
echo ""

# Step 8: Create Test Users (Cognito only)
if [ "$USE_COGNITO" = "true" ]; then
    echo -e "${BLUE}👥 Step 8: Creating Test Users${NC}"
    
    # Create admin user
    aws cognito-idp admin-create-user \
        --user-pool-id $USER_POOL_ID \
        --username admin@test.com \
        --user-attributes Name=email,Value=admin@test.com Name=given_name,Value=Admin Name=family_name,Value=User Name=custom:role,Value=admin \
        --temporary-password TempPass123! \
        --message-action SUPPRESS \
        --region $AWS_REGION >/dev/null 2>&1 || echo "   ℹ️  Admin user already exists"

    # Create postulante user  
    aws cognito-idp admin-create-user \
        --user-pool-id $USER_POOL_ID \
        --username postulante@test.com \
        --user-attributes Name=email,Value=postulante@test.com Name=given_name,Value=Postulante Name=family_name,Value=User Name=custom:role,Value=postulante \
        --temporary-password TempPass123! \
        --message-action SUPPRESS \
        --region $AWS_REGION >/dev/null 2>&1 || echo "   ℹ️  Postulante user already exists"

    echo "   ✅ Test users created/verified"
    echo ""
fi

# Step 9: Create Deployment Helper Scripts
echo -e "${BLUE}🛠️  Step 9: Creating Helper Scripts${NC}"

# Update deploy-frontend.sh with correct values
cd ../scripts
cat > deploy-frontend.sh << 'EOF'
#!/bin/bash

# Deploy Frontend to S3/CloudFront Script
# This script builds and deploys the React frontend to AWS S3/CloudFront

set -e

echo "🚀 Starting frontend deployment to S3/CloudFront..."

# Navigate to frontend directory
cd "$(dirname "$0")/../frontend"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🔧 Building React application..."
npm run build

# Get stack outputs from environment or AWS
if [ -z "$BUCKET_NAME" ] || [ -z "$DISTRIBUTION_ID" ]; then
    STACK_NAME="ManpowerPlatformFrontend"
    BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' --output text)
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' --output text)
    WEBSITE_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`WebsiteUrl`].OutputValue' --output text)
fi

echo "📋 Deployment Details:"
echo "   S3 Bucket: $BUCKET_NAME"
echo "   Distribution ID: $DISTRIBUTION_ID"
echo "   Website URL: $WEBSITE_URL"

# Sync build files to S3
echo "📤 Uploading files to S3..."
aws s3 sync dist/ "s3://$BUCKET_NAME" --delete --cache-control "public, max-age=31536000, immutable" --exclude "*.html" --exclude "service-worker.js" --exclude "manifest.json"
aws s3 sync dist/ "s3://$BUCKET_NAME" --delete --cache-control "public, max-age=0, must-revalidate" --include "*.html" --include "service-worker.js" --include "manifest.json"

# Create CloudFront invalidation
echo "🔄 Creating CloudFront invalidation..."
INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --query 'Invalidation.Id' --output text)

echo "🎉 Frontend deployment completed!"
echo "🌐 Website URL: $WEBSITE_URL"
echo "⚡ Invalidation ID: $INVALIDATION_ID"
EOF

chmod +x deploy-frontend.sh

echo "   ✅ Helper scripts created"
echo ""

# Final Summary
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo -e "📊 Deployment Summary:"
echo -e "   AWS Account: ${GREEN}$AWS_ACCOUNT${NC}"
echo -e "   Region: ${GREEN}$AWS_REGION${NC}"
echo -e "   Environment: ${GREEN}$ENVIRONMENT${NC}"
echo -e "   Auth System: ${GREEN}$([ "$USE_COGNITO" = "true" ] && echo "Amazon Cognito" || echo "Custom Auth")${NC}"

if [ "$USE_COGNITO" = "true" ]; then
    echo ""
    echo -e "🔐 Cognito Configuration:"
    echo -e "   User Pool ID: ${GREEN}$USER_POOL_ID${NC}"
    echo -e "   Client ID: ${GREEN}$USER_POOL_CLIENT_ID${NC}"
    echo -e "   Identity Pool ID: ${GREEN}$IDENTITY_POOL_ID${NC}"
    echo ""
    echo -e "👥 Test Users Created:"
    echo -e "   Admin: ${YELLOW}admin@test.com${NC} / TempPass123!"
    echo -e "   Postulante: ${YELLOW}postulante@test.com${NC} / TempPass123!"
fi

echo ""
echo -e "🌐 Frontend Infrastructure:"
echo -e "   S3 Bucket: ${GREEN}$BUCKET_NAME${NC}"
echo -e "   CloudFront Distribution: ${GREEN}$DISTRIBUTION_ID${NC}"
echo -e "   Website URL: ${GREEN}$WEBSITE_URL${NC}"
echo ""
echo -e "🚀 Next Steps:"
echo -e "   1. Start development: ${YELLOW}cd frontend && npm run dev${NC}"
echo -e "   2. Deploy frontend: ${YELLOW}./scripts/deploy-frontend.sh${NC}"
echo -e "   3. Access application: ${YELLOW}$WEBSITE_URL${NC}"
echo ""
echo -e "${BLUE}📚 Useful Commands:${NC}"
echo -e "   Deploy frontend: ${YELLOW}./scripts/deploy-frontend.sh${NC}"
echo -e "   Redeploy stack: ${YELLOW}USE_COGNITO=$USE_COGNITO ENVIRONMENT=$ENVIRONMENT ./deploy.sh${NC}"
echo -e "   Destroy stack: ${YELLOW}cd aws/cdk && npm run destroy${NC}"