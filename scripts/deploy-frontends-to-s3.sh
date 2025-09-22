#!/bin/bash

# Deploy Frontends to S3/CloudFront Script
# This script builds and deploys all frontends to S3 with CloudFront

set -e  # Exit on any error

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}

echo "🚀 Deploying Frontends to S3/CloudFront"
echo "   Environment: $ENVIRONMENT"
echo "   Region: $REGION"
echo ""

# Function to build and deploy a frontend
deploy_frontend() {
    local frontend_name=$1
    local frontend_dir=$2
    local bucket_name=$3
    local distribution_id=$4

    echo "📦 Building and deploying $frontend_name..."

    # Navigate to frontend directory
    cd "$frontend_dir"

    # Install dependencies
    echo "   Installing dependencies..."
    npm install --silent

    # Build for production
    echo "   Building for production..."
    npm run build

    # Check if build was successful
    if [ ! -d "dist" ]; then
        echo "❌ Build failed for $frontend_name - no dist directory found"
        exit 1
    fi

    # Sync to S3
    echo "   Syncing to S3 bucket: $bucket_name..."
    aws s3 sync dist/ s3://$bucket_name --delete --region $REGION

    # Invalidate CloudFront cache
    if [ ! -z "$distribution_id" ]; then
        echo "   Invalidating CloudFront cache..."
        aws cloudfront create-invalidation \
            --distribution-id $distribution_id \
            --paths "/*" \
            --region $REGION > /dev/null
    fi

    echo "✅ $frontend_name deployed successfully"
    cd - > /dev/null
    echo ""
}

# Function to get CloudFront distribution ID from CloudFormation
get_distribution_id() {
    local stack_name=$1
    local output_key=$2
    
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region $REGION \
        --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
        --output text 2>/dev/null || echo ""
}

# Main deployment process
main() {
    echo "🏗️  Starting frontend deployment process"
    echo ""

    # Get CloudFormation stack outputs
    STACK_NAME="manpower-frontends-$ENVIRONMENT"
    
    echo "🔍 Getting CloudFormation outputs..."
    ADMIN_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region $REGION \
        --query "Stacks[0].Outputs[?OutputKey=='AdminFrontendBucketName'].OutputValue" \
        --output text 2>/dev/null || echo "")

    APPLICANT_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region $REGION \
        --query "Stacks[0].Outputs[?OutputKey=='ApplicantFrontendBucketName'].OutputValue" \
        --output text 2>/dev/null || echo "")

    AUTH_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region $REGION \
        --query "Stacks[0].Outputs[?OutputKey=='AuthFrontendBucketName'].OutputValue" \
        --output text 2>/dev/null || echo "")

    ADMIN_DISTRIBUTION=$(get_distribution_id "$STACK_NAME" "AdminFrontendDistributionId")
    APPLICANT_DISTRIBUTION=$(get_distribution_id "$STACK_NAME" "ApplicantFrontendDistributionId")
    AUTH_DISTRIBUTION=$(get_distribution_id "$STACK_NAME" "AuthFrontendDistributionId")

    # Check if buckets exist
    if [ -z "$ADMIN_BUCKET" ] || [ -z "$APPLICANT_BUCKET" ] || [ -z "$AUTH_BUCKET" ]; then
        echo "❌ S3 buckets not found. Please deploy infrastructure first:"
        echo "   aws cloudformation deploy --template-file infrastructure/s3-cloudfront.yml --stack-name $STACK_NAME --parameter-overrides Environment=$ENVIRONMENT"
        exit 1
    fi

    echo "✅ Found S3 buckets:"
    echo "   Admin: $ADMIN_BUCKET"
    echo "   Applicant: $APPLICANT_BUCKET"
    echo "   Auth: $AUTH_BUCKET"
    echo ""

    # Deploy each frontend
    deploy_frontend "Admin Frontend" "admin-frontend" "$ADMIN_BUCKET" "$ADMIN_DISTRIBUTION"
    deploy_frontend "Applicant Frontend" "applicant-frontend" "$APPLICANT_BUCKET" "$APPLICANT_DISTRIBUTION"
    deploy_frontend "Auth Frontend" "auth-frontend" "$AUTH_BUCKET" "$AUTH_DISTRIBUTION"

    echo "🎉 All frontends deployed successfully!"
    echo ""
    echo "📋 Deployment Summary:"
    echo "   Environment: $ENVIRONMENT"
    echo "   Region: $REGION"
    echo "   Admin Frontend: https://$ADMIN_DISTRIBUTION.cloudfront.net"
    echo "   Applicant Frontend: https://$APPLICANT_DISTRIBUTION.cloudfront.net"
    echo "   Auth Frontend: https://$AUTH_DISTRIBUTION.cloudfront.net"
    echo ""
    echo "⚡ Next steps:"
    echo "   1. Test all frontend URLs"
    echo "   2. Configure custom domains (optional)"
    echo "   3. Set up monitoring and alerts"
}

# Check prerequisites
check_prerequisites() {
    echo "🔧 Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI is required but not installed"
        exit 1
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is required but not installed"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is required but not installed"
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
    echo "Usage: $0 [ENVIRONMENT] [REGION]"
    echo ""
    echo "Arguments:"
    echo "  ENVIRONMENT  Deployment environment (default: dev)"
    echo "  REGION       AWS region (default: us-east-1)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy to dev environment in us-east-1"
    echo "  $0 prod               # Deploy to prod environment in us-east-1"
    echo "  $0 staging us-west-2  # Deploy to staging in us-west-2"
    echo ""
    echo "Prerequisites:"
    echo "  - AWS CLI configured"
    echo "  - Node.js and npm installed"
    echo "  - S3 buckets and CloudFront distributions created"
    exit 0
fi

# Run deployment
check_prerequisites
main
