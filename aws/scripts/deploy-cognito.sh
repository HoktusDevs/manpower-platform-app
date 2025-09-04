#!/bin/bash

# Deploy Cognito Authentication Stack
# Usage: ./deploy-cognito.sh [environment] [action]
# Example: ./deploy-cognito.sh dev deploy
# Example: ./deploy-cognito.sh prod dual-deploy

set -e

# Configuration
ENVIRONMENT=${1:-dev}
ACTION=${2:-deploy}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CDK_DIR="$SCRIPT_DIR/../cdk"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Deploying Cognito Authentication Stack${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Action: $ACTION${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found${NC}"
        exit 1
    fi
    
    # Check CDK
    if ! command -v cdk &> /dev/null; then
        echo -e "${RED}❌ AWS CDK not found${NC}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites met${NC}"
}

# Deploy Cognito stack
deploy_cognito() {
    echo -e "${BLUE}Deploying Cognito stack...${NC}"
    cd "$CDK_DIR"
    
    # Set environment variables
    export ENVIRONMENT="$ENVIRONMENT"
    export USE_COGNITO="true"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${BLUE}Installing CDK dependencies...${NC}"
        npm ci
    fi
    
    # Build CDK project
    echo -e "${BLUE}Building CDK project...${NC}"
    npm run build
    
    # Deploy the stack
    echo -e "${BLUE}Deploying ManpowerCognitoAuth stack...${NC}"
    npx cdk deploy ManpowerCognitoAuth --require-approval never
    
    echo -e "${GREEN}✅ Cognito stack deployed successfully${NC}"
}

# Deploy both systems in parallel (for migration period)
deploy_dual() {
    echo -e "${BLUE}Deploying dual authentication system...${NC}"
    cd "$CDK_DIR"
    
    # First deploy current auth service
    echo -e "${BLUE}Deploying current auth service...${NC}"
    export USE_COGNITO="false"
    npx cdk deploy ManpowerAuthService --require-approval never
    
    # Then deploy Cognito
    echo -e "${BLUE}Deploying Cognito auth...${NC}"
    export USE_COGNITO="true"
    npx cdk deploy ManpowerCognitoAuth --require-approval never
    
    echo -e "${GREEN}✅ Dual system deployed successfully${NC}"
}

# Get Cognito configuration for frontend
get_cognito_config() {
    echo -e "${BLUE}Retrieving Cognito configuration...${NC}"
    
    STACK_NAME="ManpowerCognitoAuth"
    
    USER_POOL_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
        --output text)
    
    USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
        --output text)
    
    IDENTITY_POOL_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='IdentityPoolId'].OutputValue" \
        --output text)
    
    AWS_REGION=$(aws configure get region)
    
    echo -e "${GREEN}Cognito Configuration:${NC}"
    echo "USER_POOL_ID=$USER_POOL_ID"
    echo "USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID"
    echo "IDENTITY_POOL_ID=$IDENTITY_POOL_ID"
    echo "AWS_REGION=$AWS_REGION"
    
    # Create .env file for frontend
    ENV_FILE="../../frontend/.env.cognito"
    cat > "$ENV_FILE" << EOF
# Cognito Configuration for Manpower Platform
VITE_USE_COGNITO=true
VITE_AWS_REGION=$AWS_REGION
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
VITE_IDENTITY_POOL_ID=$IDENTITY_POOL_ID

# App Configuration
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Manpower Platform
VITE_APP_VERSION=1.0.0
EOF
    
    echo -e "${GREEN}✅ Configuration saved to $ENV_FILE${NC}"
    echo -e "${YELLOW}⚠️  Remember to copy these values to your main .env file${NC}"
}

# Validate deployment
validate_deployment() {
    echo -e "${BLUE}Validating Cognito deployment...${NC}"
    
    # Check if stack exists and is in good state
    STACK_STATUS=$(aws cloudformation describe-stacks \
        --stack-name "ManpowerCognitoAuth" \
        --query "Stacks[0].StackStatus" \
        --output text 2>/dev/null || echo "STACK_NOT_FOUND")
    
    if [ "$STACK_STATUS" = "CREATE_COMPLETE" ] || [ "$STACK_STATUS" = "UPDATE_COMPLETE" ]; then
        echo -e "${GREEN}✅ Stack deployment successful${NC}"
        
        # Test user pool
        USER_POOL_ID=$(aws cloudformation describe-stacks \
            --stack-name "ManpowerCognitoAuth" \
            --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
            --output text)
        
        if [ -n "$USER_POOL_ID" ] && [ "$USER_POOL_ID" != "None" ]; then
            echo -e "${GREEN}✅ User Pool created: $USER_POOL_ID${NC}"
            
            # Check user pool configuration
            aws cognito-idp describe-user-pool --user-pool-id "$USER_POOL_ID" > /dev/null
            echo -e "${GREEN}✅ User Pool configuration validated${NC}"
        else
            echo -e "${RED}❌ User Pool ID not found${NC}"
            exit 1
        fi
        
    else
        echo -e "${RED}❌ Stack deployment failed: $STACK_STATUS${NC}"
        exit 1
    fi
}

# Create test users
create_test_users() {
    if [ "$ENVIRONMENT" != "dev" ]; then
        echo -e "${YELLOW}⚠️  Test users only created in dev environment${NC}"
        return
    fi
    
    echo -e "${BLUE}Creating test users for development...${NC}"
    
    USER_POOL_ID=$(aws cloudformation describe-stacks \
        --stack-name "ManpowerCognitoAuth" \
        --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
        --output text)
    
    # Create admin user
    echo -e "${BLUE}Creating admin test user...${NC}"
    aws cognito-idp admin-create-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "admin@test.com" \
        --user-attributes Name="email",Value="admin@test.com" Name="given_name",Value="Admin" Name="family_name",Value="Test" Name="custom:role",Value="admin" \
        --temporary-password "TempPass123!" \
        --message-action SUPPRESS \
        2>/dev/null || echo "Admin user might already exist"
    
    # Create postulante user
    echo -e "${BLUE}Creating postulante test user...${NC}"
    aws cognito-idp admin-create-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "postulante@test.com" \
        --user-attributes Name="email",Value="postulante@test.com" Name="given_name",Value="Postulante" Name="family_name",Value="Test" Name="custom:role",Value="postulante" \
        --temporary-password "TempPass123!" \
        --message-action SUPPRESS \
        2>/dev/null || echo "Postulante user might already exist"
    
    echo -e "${GREEN}✅ Test users created${NC}"
    echo -e "${YELLOW}Test credentials:${NC}"
    echo "  Admin: admin@test.com / TempPass123!"
    echo "  Postulante: postulante@test.com / TempPass123!"
    echo -e "${YELLOW}⚠️  Users will be prompted to change password on first login${NC}"
}

# Main execution
main() {
    case $ACTION in
        "deploy")
            check_prerequisites
            deploy_cognito
            get_cognito_config
            validate_deployment
            create_test_users
            ;;
        "dual-deploy")
            check_prerequisites
            deploy_dual
            get_cognito_config
            validate_deployment
            create_test_users
            ;;
        "config")
            get_cognito_config
            ;;
        "validate")
            validate_deployment
            ;;
        "test-users")
            create_test_users
            ;;
        *)
            echo -e "${RED}Invalid action: $ACTION${NC}"
            echo "Valid actions: deploy, dual-deploy, config, validate, test-users"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}🎉 Cognito deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "${BLUE}1. Copy Cognito configuration to your frontend .env file${NC}"
    echo -e "${BLUE}2. Install amazon-cognito-identity-js in your frontend${NC}"
    echo -e "${BLUE}3. Test authentication with the provided test users${NC}"
    echo -e "${BLUE}4. Plan user migration from current system${NC}"
}

# Run main function
main