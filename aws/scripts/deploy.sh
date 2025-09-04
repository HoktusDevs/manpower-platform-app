#!/bin/bash

# Manpower Platform Deployment Script
# Usage: ./deploy.sh [environment] [stack]
# Example: ./deploy.sh prod all

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
STACK=${2:-all}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}

# Validate AWS credentials
check_aws_credentials() {
    echo -e "${BLUE}Checking AWS credentials...${NC}"
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        echo -e "${RED}❌ AWS credentials not configured or invalid${NC}"
        echo "Please run 'aws configure' or set AWS environment variables"
        exit 1
    fi
    
    if [ -z "$AWS_ACCOUNT_ID" ]; then
        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    fi
    
    echo -e "${GREEN}✅ AWS credentials valid (Account: $AWS_ACCOUNT_ID)${NC}"
}

# Build auth service
build_auth_service() {
    echo -e "${BLUE}Building auth service microservice...${NC}"
    cd ../../backend/services/auth-service
    
    # Install dependencies
    npm ci
    
    # Build TypeScript
    echo -e "${BLUE}Compiling TypeScript...${NC}"
    npm run build
    
    # Package Lambda function
    echo -e "${BLUE}Packaging Lambda function...${NC}"
    if [ -d "dist" ]; then
        cd dist
        # Copy package.json for Lambda runtime dependencies
        cp ../package.json .
        # Install only production dependencies
        npm ci --omit=dev
        # Create deployment package
        zip -r ../lambda-deployment.zip . -q
        cd ..
        echo -e "${GREEN}✅ Auth service Lambda package created: lambda-deployment.zip${NC}"
    else
        echo -e "${RED}❌ Build directory not found${NC}"
        exit 1
    fi
    
    cd ../../../../aws/scripts
    echo -e "${GREEN}✅ Auth service built successfully${NC}"
}

# Build frontend
build_frontend() {
    echo -e "${BLUE}Building frontend...${NC}"
    cd ../../frontend
    
    # Install dependencies
    npm ci
    
    # Get API Gateway URL from deployed backend stack
    if [ "$STACK" = "frontend" ] || [ "$STACK" = "all" ]; then
        if aws cloudformation describe-stacks --stack-name ManpowerPlatformBackend > /dev/null 2>&1; then
            API_URL=$(aws cloudformation describe-stacks \
                --stack-name ManpowerPlatformBackend \
                --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
                --output text)
            if [ "$API_URL" != "None" ] && [ -n "$API_URL" ]; then
                echo -e "${GREEN}Using API URL: $API_URL${NC}"
                export VITE_API_URL=$API_URL
            else
                echo -e "${YELLOW}⚠️  Warning: API URL not found, using default${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Warning: Backend stack not deployed, using default API URL${NC}"
        fi
    fi
    
    # Set environment variables for build
    export VITE_AWS_REGION=$AWS_REGION
    export VITE_ENVIRONMENT=$ENVIRONMENT
    
    # Build with environment variables
    npm run build
    
    cd ../aws/scripts
    echo -e "${GREEN}✅ Frontend built successfully${NC}"
}

# Deploy CDK stacks
deploy_infrastructure() {
    echo -e "${BLUE}Deploying infrastructure...${NC}"
    cd ../cdk
    
    # Install CDK dependencies if not already installed
    if [ ! -d "node_modules" ]; then
        npm ci
    fi
    
    # Build CDK TypeScript
    echo -e "${BLUE}Building CDK TypeScript...${NC}"
    npm run build
    
    # Bootstrap CDK if needed
    echo -e "${BLUE}Bootstrapping CDK (if needed)...${NC}"
    npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
    
    # Set CDK context values
    CDK_CONTEXT="-c environment=$ENVIRONMENT -c accountId=$AWS_ACCOUNT_ID -c region=$AWS_REGION"
    
    case $STACK in
        "database")
            npx cdk deploy ManpowerPlatformDatabase --require-approval never $CDK_CONTEXT
            ;;
        "storage")
            npx cdk deploy ManpowerPlatformStorage --require-approval never $CDK_CONTEXT
            ;;
        "backend")
            npx cdk deploy ManpowerPlatformBackend --require-approval never $CDK_CONTEXT
            ;;
        "frontend")
            npx cdk deploy ManpowerPlatformFrontend --require-approval never $CDK_CONTEXT
            ;;
        "monitoring")
            npx cdk deploy ManpowerPlatformMonitoring --require-approval never $CDK_CONTEXT
            ;;
        "security")
            npx cdk deploy ManpowerPlatformSecurity --require-approval never $CDK_CONTEXT
            ;;
        "auth")
            npx cdk deploy ManpowerAuthService --require-approval never $CDK_CONTEXT
            ;;
        "users")
            npx cdk deploy ManpowerUsersService --require-approval never $CDK_CONTEXT
            ;;
        "jobs")
            npx cdk deploy ManpowerJobsService --require-approval never $CDK_CONTEXT
            ;;
        "microservices")
            # Deploy microservices in parallel (they're independent)
            echo -e "${BLUE}Deploying microservices...${NC}"
            npx cdk deploy ManpowerAuthService --require-approval never $CDK_CONTEXT
            npx cdk deploy ManpowerUsersService --require-approval never $CDK_CONTEXT
            npx cdk deploy ManpowerJobsService --require-approval never $CDK_CONTEXT
            ;;
        "all")
            # Deploy in dependency order
            echo -e "${BLUE}Deploying stacks in dependency order...${NC}"
            npx cdk deploy ManpowerPlatformSecurity --require-approval never $CDK_CONTEXT
            npx cdk deploy ManpowerPlatformDatabase --require-approval never $CDK_CONTEXT
            npx cdk deploy ManpowerPlatformStorage --require-approval never $CDK_CONTEXT
            npx cdk deploy ManpowerPlatformApiDiscovery --require-approval never $CDK_CONTEXT
            npx cdk deploy ManpowerPlatformBackend --require-approval never $CDK_CONTEXT
            npx cdk deploy ManpowerPlatformFrontend --require-approval never $CDK_CONTEXT
            npx cdk deploy ManpowerPlatformMonitoring --require-approval never $CDK_CONTEXT
            ;;
        *)
            echo -e "${RED}❌ Invalid stack: $STACK${NC}"
            echo "Valid stacks: security, auth, users, jobs, microservices, storage, frontend, all"
            exit 1
            ;;
    esac
    
    cd ../scripts
    echo -e "${GREEN}✅ Infrastructure deployed successfully${NC}"
}

# Deploy frontend to S3
deploy_frontend_assets() {
    if [ "$STACK" = "frontend" ] || [ "$STACK" = "all" ]; then
        echo -e "${BLUE}Deploying frontend assets...${NC}"
        
        # Check if frontend build exists
        if [ ! -d "../../frontend/dist" ]; then
            echo -e "${RED}❌ Frontend build directory not found. Run build first.${NC}"
            exit 1
        fi
        
        # Get bucket name from CloudFormation outputs
        BUCKET_NAME=$(aws cloudformation describe-stacks \
            --stack-name ManpowerPlatformFrontend \
            --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
            --output text 2>/dev/null)
        
        if [ -z "$BUCKET_NAME" ] || [ "$BUCKET_NAME" = "None" ]; then
            # Fallback to default naming convention
            BUCKET_NAME="manpower-frontend-$AWS_ACCOUNT_ID-$AWS_REGION"
            echo -e "${YELLOW}⚠️  Using default bucket name: $BUCKET_NAME${NC}"
        fi
        
        # Sync files to S3
        aws s3 sync ../../frontend/dist/ s3://$BUCKET_NAME/ --delete
        
        # Get CloudFront distribution ID and invalidate cache
        DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
            --stack-name ManpowerPlatformFrontend \
            --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
            --output text)
        
        if [ "$DISTRIBUTION_ID" != "None" ] && [ -n "$DISTRIBUTION_ID" ]; then
            echo -e "${BLUE}Invalidating CloudFront cache...${NC}"
            aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
            echo -e "${GREEN}✅ CloudFront cache invalidated${NC}"
        fi
        
        echo -e "${GREEN}✅ Frontend assets deployed successfully${NC}"
    fi
}

# Get deployment outputs
get_outputs() {
    echo -e "${BLUE}Getting deployment outputs...${NC}"
    
    # Website URL
    if aws cloudformation describe-stacks --stack-name ManpowerPlatformFrontend > /dev/null 2>&1; then
        WEBSITE_URL=$(aws cloudformation describe-stacks \
            --stack-name ManpowerPlatformFrontend \
            --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" \
            --output text)
        echo -e "${GREEN}🌐 Website URL: $WEBSITE_URL${NC}"
    fi
    
    # API Gateway URL
    if aws cloudformation describe-stacks --stack-name ManpowerPlatformBackend > /dev/null 2>&1; then
        API_URL=$(aws cloudformation describe-stacks \
            --stack-name ManpowerPlatformBackend \
            --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
            --output text)
        echo -e "${GREEN}🔌 API URL: $API_URL${NC}"
    fi
    
    # Dashboard URL
    if aws cloudformation describe-stacks --stack-name ManpowerPlatformMonitoring > /dev/null 2>&1; then
        DASHBOARD_URL=$(aws cloudformation describe-stacks \
            --stack-name ManpowerPlatformMonitoring \
            --query "Stacks[0].Outputs[?OutputKey=='DashboardUrl'].OutputValue" \
            --output text)
        echo -e "${GREEN}📊 Dashboard URL: $DASHBOARD_URL${NC}"
    fi
}

# Validate prerequisites
validate_prerequisites() {
    echo -e "${BLUE}Validating prerequisites...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI is not installed${NC}"
        exit 1
    fi
    
    # Check CDK
    if ! command -v cdk &> /dev/null; then
        echo -e "${YELLOW}⚠️  CDK CLI not found globally, will use local version${NC}"
    fi
    
    echo -e "${GREEN}✅ Prerequisites validated${NC}"
}

# Main deployment flow
main() {
    echo -e "${BLUE}🚀 Starting Manpower Platform deployment${NC}"
    echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
    echo -e "${BLUE}Stack: $STACK${NC}"
    echo -e "${BLUE}Region: $AWS_REGION${NC}"
    echo ""
    
    validate_prerequisites
    check_aws_credentials
    
    # Build auth service before deploying auth stack
    if [ "$STACK" = "auth" ] || [ "$STACK" = "all" ]; then
        build_auth_service
    fi
    
    # Deploy infrastructure first
    deploy_infrastructure
    
    # Build frontend after backend is deployed (to get API URL)
    if [ "$STACK" = "frontend" ] || [ "$STACK" = "all" ]; then
        build_frontend
        deploy_frontend_assets
    fi
    
    echo ""
    get_outputs
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${YELLOW}Note: It may take a few minutes for CloudFront distribution to be fully propagated${NC}"
}

# Run main function
main