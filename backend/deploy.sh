#!/bin/bash

# Deploy script for Manpower Platform Backend
# This script deploys all microservices and generates frontend configuration

set -e  # Exit on any error

STAGE=${1:-dev}
REGION=${2:-us-east-1}

echo "🚀 Starting deployment for stage: $STAGE in region: $REGION"

# Function to deploy a service
deploy_service() {
    local service_name=$1
    local service_dir=$2

    echo "📦 Deploying $service_name..."

    cd "$service_dir"

    # Install dependencies if package.json exists
    if [ -f "package.json" ]; then
        echo "   Installing dependencies..."
        npm install --silent
    fi

    # Deploy with Serverless
    echo "   Deploying to AWS..."
    npx serverless deploy --stage $STAGE --region $REGION --verbose

    echo "✅ $service_name deployed successfully"
    cd - > /dev/null
}

# Function to check if service is healthy
check_service_health() {
    local service_name=$1
    local max_attempts=30
    local attempt=1

    echo "🔍 Checking $service_name health..."

    while [ $attempt -le $max_attempts ]; do
        # Get the service URL from CloudFormation
        local stack_name="${service_name}-${STAGE}"
        local service_url=$(aws cloudformation describe-stacks \
            --stack-name "$stack_name" \
            --region $REGION \
            --query 'Stacks[0].Outputs[?contains(OutputKey, `Url`) || contains(OutputKey, `Endpoint`)].OutputValue' \
            --output text 2>/dev/null || echo "")

        if [ -n "$service_url" ]; then
            # Remove trailing slash
            service_url=$(echo "$service_url" | sed 's/\/*$//')

            # Check health endpoint
            if curl -s -f "$service_url/health" > /dev/null 2>&1; then
                echo "✅ $service_name is healthy"
                return 0
            fi
        fi

        echo "   Attempt $attempt/$max_attempts - waiting for $service_name to be ready..."
        sleep 10
        ((attempt++))
    done

    echo "⚠️  $service_name health check timed out"
    return 1
}

# Main deployment process
main() {
    echo "🏗️  Deploying Manpower Platform Backend"
    echo "   Stage: $STAGE"
    echo "   Region: $REGION"
    echo ""

    # Array of services to deploy in order
    services=(
        "config-service:config-service"
        "auth-service:auth-service"
        "folders-service:folders-service"
        "jobs-service:jobs-service"
        "files-service:files-service"
        "api-gateway-service:api-gateway-service"
    )

    # Deploy each service
    for service in "${services[@]}"; do
        IFS=':' read -r service_name service_dir <<< "$service"

        if [ -d "$service_dir" ]; then
            deploy_service "$service_name" "$service_dir"
        else
            echo "⚠️  Warning: $service_dir directory not found, skipping $service_name"
        fi

        echo ""
    done

    echo "🔍 Running health checks..."

    # Health check for core services
    health_services=("config-service" "api-gateway-service" "files-service")

    for service in "${health_services[@]}"; do
        check_service_health "$service" || true  # Don't fail deployment on health check
    done

    echo ""
    echo "🎯 Generating frontend configuration..."

    # Set environment variables for config generation
    export STAGE=$STAGE
    export AWS_REGION=$REGION

    # Run frontend config generation
    cd scripts
    node generate-frontend-config.js
    cd - > /dev/null

    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Summary:"
    echo "   - Stage: $STAGE"
    echo "   - Region: $REGION"
    echo "   - Services deployed: ${#services[@]}"
    echo ""

    # Get API Gateway URL
    local api_gateway_url=$(aws cloudformation describe-stacks \
        --stack-name "api-gateway-service-${STAGE}" \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`MainApiGatewayUrl`].OutputValue' \
        --output text 2>/dev/null || echo "Not found")

    if [ "$api_gateway_url" != "Not found" ]; then
        echo "🌐 Main API Gateway URL: $api_gateway_url"
        echo "   Health: $api_gateway_url/health"
        echo "   Services: $api_gateway_url/services"
        echo "   Config: Check frontend/src/config/ for generated files"
    fi

    echo ""
    echo "⚡ Next steps:"
    echo "   1. Update frontend to use generated config files"
    echo "   2. Test API endpoints"
    echo "   3. Configure domain name (optional)"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    echo "🔧 Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI is required but not installed"
        exit 1
    fi

    # Check Serverless Framework
    if ! command -v serverless &> /dev/null && ! command -v npx &> /dev/null; then
        echo "❌ Serverless Framework or npx is required"
        exit 1
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is required but not installed"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "❌ AWS credentials not configured or invalid"
        exit 1
    fi

    echo "✅ Prerequisites check passed"
    echo ""
}

# Handle script arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [STAGE] [REGION]"
    echo ""
    echo "Arguments:"
    echo "  STAGE     Deployment stage (default: dev)"
    echo "  REGION    AWS region (default: us-east-1)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy to dev stage in us-east-1"
    echo "  $0 prod               # Deploy to prod stage in us-east-1"
    echo "  $0 staging us-west-2  # Deploy to staging in us-west-2"
    exit 0
fi

# Run deployment
check_prerequisites
main