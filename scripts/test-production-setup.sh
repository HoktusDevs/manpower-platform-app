#!/bin/bash

# Test Production Setup Script
# This script tests the complete S3/CloudFront setup

set -e  # Exit on any error

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}

echo "🧪 Testing Production Setup for S3/CloudFront"
echo "   Environment: $ENVIRONMENT"
echo "   Region: $REGION"
echo ""

# Function to test a URL
test_url() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}

    echo "🔍 Testing $name: $url"
    
    # Test HTTP status
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "   ✅ Status: $status_code (Expected: $expected_status)"
    else
        echo "   ❌ Status: $status_code (Expected: $expected_status)"
        return 1
    fi

    # Test response time
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" "$url")
    echo "   ⏱️  Response time: ${response_time}s"

    # Test if it's a valid HTML page
    local content_type=$(curl -s -I "$url" | grep -i "content-type" | cut -d' ' -f2)
    if [[ "$content_type" == *"text/html"* ]]; then
        echo "   ✅ Content type: $content_type"
    else
        echo "   ⚠️  Content type: $content_type (Expected: text/html)"
    fi

    echo ""
}

# Function to test API endpoints
test_api_endpoint() {
    local url=$1
    local name=$2

    echo "🔍 Testing API: $name"
    echo "   URL: $url"
    
    # Test if endpoint is reachable
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status_code" = "200" ] || [ "$status_code" = "404" ] || [ "$status_code" = "405" ]; then
        echo "   ✅ API reachable (Status: $status_code)"
    else
        echo "   ❌ API not reachable (Status: $status_code)"
        return 1
    fi

    # Test CORS headers
    local cors_origin=$(curl -s -I "$url" | grep -i "access-control-allow-origin" | cut -d' ' -f2)
    if [ ! -z "$cors_origin" ]; then
        echo "   ✅ CORS configured: $cors_origin"
    else
        echo "   ⚠️  CORS headers not found"
    fi

    echo ""
}

# Function to test S3 bucket access
test_s3_bucket() {
    local bucket_name=$1
    local name=$2

    echo "🔍 Testing S3 Bucket: $name"
    echo "   Bucket: $bucket_name"
    
    # Test if bucket exists and is accessible
    if aws s3 ls "s3://$bucket_name" &> /dev/null; then
        echo "   ✅ Bucket accessible"
        
        # Check if index.html exists
        if aws s3 ls "s3://$bucket_name/index.html" &> /dev/null; then
            echo "   ✅ index.html found"
        else
            echo "   ❌ index.html not found"
            return 1
        fi
    else
        echo "   ❌ Bucket not accessible"
        return 1
    fi

    echo ""
}

# Function to test CloudFront distribution
test_cloudfront_distribution() {
    local distribution_id=$1
    local name=$2

    echo "🔍 Testing CloudFront Distribution: $name"
    echo "   Distribution ID: $distribution_id"
    
    # Get distribution status
    local status=$(aws cloudfront get-distribution \
        --id "$distribution_id" \
        --region $REGION \
        --query 'Distribution.Status' \
        --output text 2>/dev/null || echo "ERROR")
    
    if [ "$status" = "Deployed" ]; then
        echo "   ✅ Distribution deployed"
    else
        echo "   ❌ Distribution status: $status"
        return 1
    fi

    echo ""
}

# Main testing function
main() {
    echo "🏗️  Starting production setup tests"
    echo ""

    # Get CloudFormation stack outputs
    STACK_NAME="manpower-frontends-$ENVIRONMENT"
    
    echo "🔍 Getting CloudFormation outputs..."
    
    # Get S3 bucket names
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

    # Get CloudFront distribution IDs
    ADMIN_DISTRIBUTION=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region $REGION \
        --query "Stacks[0].Outputs[?OutputKey=='AdminFrontendDistributionId'].OutputValue" \
        --output text 2>/dev/null || echo "")

    APPLICANT_DISTRIBUTION=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region $REGION \
        --query "Stacks[0].Outputs[?OutputKey=='ApplicantFrontendDistributionId'].OutputValue" \
        --output text 2>/dev/null || echo "")

    AUTH_DISTRIBUTION=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region $REGION \
        --query "Stacks[0].Outputs[?OutputKey=='AuthFrontendDistributionId'].OutputValue" \
        --output text 2>/dev/null || echo "")

    # Check if infrastructure exists
    if [ -z "$ADMIN_BUCKET" ] || [ -z "$APPLICANT_BUCKET" ] || [ -z "$AUTH_BUCKET" ]; then
        echo "❌ Infrastructure not found. Please deploy infrastructure first:"
        echo "   aws cloudformation deploy --template-file infrastructure/s3-cloudfront.yml --stack-name $STACK_NAME --parameter-overrides Environment=$ENVIRONMENT"
        exit 1
    fi

    echo "✅ Infrastructure found"
    echo ""

    # Test S3 buckets
    echo "📦 Testing S3 Buckets..."
    test_s3_bucket "$ADMIN_BUCKET" "Admin Frontend"
    test_s3_bucket "$APPLICANT_BUCKET" "Applicant Frontend"
    test_s3_bucket "$AUTH_BUCKET" "Auth Frontend"

    # Test CloudFront distributions
    echo "☁️  Testing CloudFront Distributions..."
    if [ ! -z "$ADMIN_DISTRIBUTION" ]; then
        test_cloudfront_distribution "$ADMIN_DISTRIBUTION" "Admin Frontend"
    fi
    if [ ! -z "$APPLICANT_DISTRIBUTION" ]; then
        test_cloudfront_distribution "$APPLICANT_DISTRIBUTION" "Applicant Frontend"
    fi
    if [ ! -z "$AUTH_DISTRIBUTION" ]; then
        test_cloudfront_distribution "$AUTH_DISTRIBUTION" "Auth Frontend"
    fi

    # Test frontend URLs
    echo "🌐 Testing Frontend URLs..."
    if [ ! -z "$ADMIN_DISTRIBUTION" ]; then
        test_url "https://$ADMIN_DISTRIBUTION.cloudfront.net" "Admin Frontend"
    fi
    if [ ! -z "$APPLICANT_DISTRIBUTION" ]; then
        test_url "https://$APPLICANT_DISTRIBUTION.cloudfront.net" "Applicant Frontend"
    fi
    if [ ! -z "$AUTH_DISTRIBUTION" ]; then
        test_url "https://$AUTH_DISTRIBUTION.cloudfront.net" "Auth Frontend"
    fi

    # Test API endpoints
    echo "🔌 Testing API Endpoints..."
    test_api_endpoint "https://7pptifb3zk.execute-api.us-east-1.amazonaws.com/dev/health" "Auth Service"
    test_api_endpoint "https://8lmunkvdd5.execute-api.us-east-1.amazonaws.com/dev/health" "Applications Service"
    test_api_endpoint "https://pa3itplx4f.execute-api.us-east-1.amazonaws.com/dev/health" "Jobs Service"
    test_api_endpoint "https://83upriwf35.execute-api.us-east-1.amazonaws.com/dev/health" "Folders Service"
    test_api_endpoint "https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev/health" "Files Service"

    echo "🎉 Production setup tests completed!"
    echo ""
    echo "📋 Test Summary:"
    echo "   Environment: $ENVIRONMENT"
    echo "   Region: $REGION"
    echo "   Admin Frontend: https://$ADMIN_DISTRIBUTION.cloudfront.net"
    echo "   Applicant Frontend: https://$APPLICANT_DISTRIBUTION.cloudfront.net"
    echo "   Auth Frontend: https://$AUTH_DISTRIBUTION.cloudfront.net"
    echo ""
    echo "⚡ Next steps:"
    echo "   1. Configure custom domains (optional)"
    echo "   2. Set up monitoring and alerts"
    echo "   3. Configure SSL certificates"
}

# Check prerequisites
check_prerequisites() {
    echo "🔧 Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI is required but not installed"
        exit 1
    fi

    # Check curl
    if ! command -v curl &> /dev/null; then
        echo "❌ curl is required but not installed"
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
    echo "  $0                    # Test dev environment in us-east-1"
    echo "  $0 prod               # Test prod environment in us-east-1"
    echo "  $0 staging us-west-2  # Test staging in us-west-2"
    echo ""
    echo "Prerequisites:"
    echo "  - AWS CLI configured"
    echo "  - curl installed"
    echo "  - Infrastructure deployed"
    exit 0
fi

# Run tests
check_prerequisites
main
