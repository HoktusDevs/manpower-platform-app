#!/bin/bash

# Manpower Platform Destroy Script
# Usage: ./destroy.sh [environment]
# Example: ./destroy.sh dev

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}

# Warning function
show_warning() {
    echo -e "${RED}⚠️  WARNING: This will destroy all AWS resources for the Manpower Platform!${NC}"
    echo -e "${RED}   - All data in DynamoDB tables will be lost${NC}"
    echo -e "${RED}   - All files in S3 buckets will be deleted${NC}"
    echo -e "${RED}   - CloudFront distributions will be removed${NC}"
    echo -e "${RED}   - Lambda functions will be deleted${NC}"
    echo ""
    echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Region: $AWS_REGION${NC}"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
    echo
    if [[ ! $REPLY =~ ^yes$ ]]; then
        echo -e "${GREEN}Destruction cancelled.${NC}"
        exit 0
    fi
}

# Check AWS credentials
check_aws_credentials() {
    echo -e "${BLUE}Checking AWS credentials...${NC}"
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        echo -e "${RED}❌ AWS credentials not configured or invalid${NC}"
        echo "Please run 'aws configure' or set AWS environment variables"
        exit 1
    fi
    echo -e "${GREEN}✅ AWS credentials valid${NC}"
}

# Empty S3 buckets before destruction
empty_s3_buckets() {
    echo -e "${BLUE}Emptying S3 buckets...${NC}"
    
    # Get account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # List of bucket patterns
    BUCKET_PATTERNS=(
        "manpower-frontend-$AWS_ACCOUNT_ID-$AWS_REGION"
        "manpower-files-$AWS_ACCOUNT_ID-$AWS_REGION"
        "manpower-temp-$AWS_ACCOUNT_ID-$AWS_REGION"
    )
    
    for BUCKET_PATTERN in "${BUCKET_PATTERNS[@]}"; do
        if aws s3api head-bucket --bucket "$BUCKET_PATTERN" 2>/dev/null; then
            echo -e "${BLUE}Emptying bucket: $BUCKET_PATTERN${NC}"
            aws s3 rm s3://$BUCKET_PATTERN --recursive
            
            # Remove all versions if versioned
            aws s3api list-object-versions --bucket "$BUCKET_PATTERN" \
                --query 'Versions[].{Key:Key,VersionId:VersionId}' \
                --output json | \
            jq -r '.[] | "--key \(.Key) --version-id \(.VersionId)"' | \
            while read -r line; do
                if [ -n "$line" ]; then
                    aws s3api delete-object --bucket "$BUCKET_PATTERN" $line
                fi
            done 2>/dev/null || true
            
            # Remove delete markers
            aws s3api list-object-versions --bucket "$BUCKET_PATTERN" \
                --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' \
                --output json | \
            jq -r '.[] | "--key \(.Key) --version-id \(.VersionId)"' | \
            while read -r line; do
                if [ -n "$line" ]; then
                    aws s3api delete-object --bucket "$BUCKET_PATTERN" $line
                fi
            done 2>/dev/null || true
            
            echo -e "${GREEN}✅ Bucket $BUCKET_PATTERN emptied${NC}"
        else
            echo -e "${YELLOW}⚠️  Bucket $BUCKET_PATTERN not found or already deleted${NC}"
        fi
    done
}

# Destroy CDK stacks
destroy_infrastructure() {
    echo -e "${BLUE}Destroying infrastructure...${NC}"
    cd ../cdk
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${BLUE}Installing CDK dependencies...${NC}"
        npm ci
    fi
    
    # Destroy stacks in reverse dependency order
    STACKS=(
        "ManpowerPlatformMonitoring"
        "ManpowerPlatformFrontend"
        "ManpowerPlatformBackend"
        "ManpowerPlatformStorage"
        "ManpowerPlatformDatabase"
    )
    
    for STACK in "${STACKS[@]}"; do
        echo -e "${BLUE}Destroying stack: $STACK${NC}"
        if aws cloudformation describe-stacks --stack-name "$STACK" > /dev/null 2>&1; then
            npx cdk destroy "$STACK" --force
            echo -e "${GREEN}✅ Stack $STACK destroyed${NC}"
        else
            echo -e "${YELLOW}⚠️  Stack $STACK not found or already destroyed${NC}"
        fi
    done
    
    cd ../scripts
    echo -e "${GREEN}✅ All infrastructure destroyed${NC}"
}

# Clean up CDK bootstrap (optional)
cleanup_bootstrap() {
    echo ""
    read -p "Do you want to remove CDK bootstrap resources? (y/N): " -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Removing CDK bootstrap resources...${NC}"
        
        # Get CDK bootstrap stack name
        CDK_BOOTSTRAP_STACK="CDKToolkit"
        
        if aws cloudformation describe-stacks --stack-name "$CDK_BOOTSTRAP_STACK" > /dev/null 2>&1; then
            # Empty the CDK bootstrap bucket
            BOOTSTRAP_BUCKET=$(aws cloudformation describe-stacks \
                --stack-name "$CDK_BOOTSTRAP_STACK" \
                --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
                --output text 2>/dev/null || echo "")
            
            if [ -n "$BOOTSTRAP_BUCKET" ] && [ "$BOOTSTRAP_BUCKET" != "None" ]; then
                echo -e "${BLUE}Emptying CDK bootstrap bucket: $BOOTSTRAP_BUCKET${NC}"
                aws s3 rm s3://$BOOTSTRAP_BUCKET --recursive
            fi
            
            # Delete the bootstrap stack
            aws cloudformation delete-stack --stack-name "$CDK_BOOTSTRAP_STACK"
            aws cloudformation wait stack-delete-complete --stack-name "$CDK_BOOTSTRAP_STACK"
            echo -e "${GREEN}✅ CDK bootstrap resources removed${NC}"
        else
            echo -e "${YELLOW}⚠️  CDK bootstrap stack not found${NC}"
        fi
    else
        echo -e "${BLUE}CDK bootstrap resources kept (can be reused for future deployments)${NC}"
    fi
}

# Main destruction flow
main() {
    echo -e "${BLUE}🗑️  Manpower Platform Destruction Script${NC}"
    echo ""
    
    show_warning
    check_aws_credentials
    empty_s3_buckets
    destroy_infrastructure
    cleanup_bootstrap
    
    echo ""
    echo -e "${GREEN}🎉 Destruction completed successfully!${NC}"
    echo -e "${GREEN}All AWS resources have been removed.${NC}"
}

# Run main function
main