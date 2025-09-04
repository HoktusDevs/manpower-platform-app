#!/bin/bash

# Manpower Platform Rollback Script
# Usage: ./rollback.sh [stack]
# Example: ./rollback.sh backend
# Rolls back to the previous version of a stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

STACK=${1:-all}
AWS_REGION=${AWS_REGION:-us-east-1}

# Get previous version from CloudFormation
get_previous_version() {
    local STACK_NAME=$1
    echo -e "${BLUE}Getting previous version of $STACK_NAME...${NC}"
    
    # Get the previous successful deployment
    PREVIOUS_VERSION=$(aws cloudformation list-stack-set-operations \
        --stack-set-name $STACK_NAME \
        --query "Summaries[?Status=='SUCCEEDED'][0].OperationId" \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "")
    
    if [ -n "$PREVIOUS_VERSION" ] && [ "$PREVIOUS_VERSION" != "None" ]; then
        echo -e "${GREEN}Found previous version: $PREVIOUS_VERSION${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  No previous version found for $STACK_NAME${NC}"
        return 1
    fi
}

# Rollback a specific stack
rollback_stack() {
    local STACK_NAME=$1
    echo -e "${BLUE}Rolling back $STACK_NAME...${NC}"
    
    # Cancel any in-progress updates
    aws cloudformation cancel-update-stack \
        --stack-name $STACK_NAME \
        --region $AWS_REGION 2>/dev/null || true
    
    # Continue rollback if needed
    aws cloudformation continue-update-rollback \
        --stack-name $STACK_NAME \
        --region $AWS_REGION 2>/dev/null || true
    
    # Wait for rollback to complete
    echo -e "${BLUE}Waiting for rollback to complete...${NC}"
    aws cloudformation wait stack-rollback-complete \
        --stack-name $STACK_NAME \
        --region $AWS_REGION 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Rollback wait timed out or stack is in different state${NC}"
    }
    
    # Check final status
    STATUS=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].StackStatus" \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "NOT_FOUND")
    
    if [[ "$STATUS" == *"ROLLBACK_COMPLETE" ]]; then
        echo -e "${GREEN}✅ Rollback completed for $STACK_NAME${NC}"
        return 0
    else
        echo -e "${RED}❌ Rollback status: $STATUS${NC}"
        return 1
    fi
}

# Restore frontend from backup
restore_frontend() {
    echo -e "${BLUE}Restoring frontend from backup...${NC}"
    
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    BUCKET_NAME="manpower-frontend-$AWS_ACCOUNT_ID-$AWS_REGION"
    BACKUP_BUCKET="manpower-frontend-backup-$AWS_ACCOUNT_ID-$AWS_REGION"
    
    # Check if backup exists
    if aws s3api head-bucket --bucket $BACKUP_BUCKET --region $AWS_REGION 2>/dev/null; then
        echo -e "${BLUE}Syncing from backup bucket...${NC}"
        aws s3 sync s3://$BACKUP_BUCKET/ s3://$BUCKET_NAME/ --delete
        
        # Invalidate CloudFront cache
        DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
            --stack-name ManpowerPlatformFrontend \
            --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
            --output text \
            --region $AWS_REGION 2>/dev/null)
        
        if [ "$DISTRIBUTION_ID" != "None" ] && [ -n "$DISTRIBUTION_ID" ]; then
            echo -e "${BLUE}Invalidating CloudFront cache...${NC}"
            aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
        fi
        
        echo -e "${GREEN}✅ Frontend restored from backup${NC}"
    else
        echo -e "${YELLOW}⚠️  No backup bucket found${NC}"
    fi
}

# Main rollback flow
main() {
    echo -e "${BLUE}🔄 Starting Manpower Platform rollback${NC}"
    echo -e "${BLUE}Stack: $STACK${NC}"
    echo -e "${BLUE}Region: $AWS_REGION${NC}"
    echo ""
    
    # Confirm rollback
    echo -e "${YELLOW}⚠️  WARNING: This will rollback the deployment to the previous version${NC}"
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Rollback cancelled${NC}"
        exit 1
    fi
    
    case $STACK in
        "database")
            rollback_stack "ManpowerPlatformDatabase"
            ;;
        "storage")
            rollback_stack "ManpowerPlatformStorage"
            ;;
        "backend")
            rollback_stack "ManpowerPlatformBackend"
            ;;
        "frontend")
            rollback_stack "ManpowerPlatformFrontend"
            restore_frontend
            ;;
        "monitoring")
            rollback_stack "ManpowerPlatformMonitoring"
            ;;
        "all")
            echo -e "${BLUE}Rolling back all stacks...${NC}"
            rollback_stack "ManpowerPlatformMonitoring" || true
            rollback_stack "ManpowerPlatformFrontend" || true
            rollback_stack "ManpowerPlatformBackend" || true
            rollback_stack "ManpowerPlatformStorage" || true
            rollback_stack "ManpowerPlatformDatabase" || true
            restore_frontend
            ;;
        *)
            echo -e "${RED}❌ Invalid stack: $STACK${NC}"
            echo "Valid stacks: database, storage, backend, frontend, monitoring, all"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}🔄 Rollback process completed${NC}"
    echo -e "${YELLOW}Please run ./validate-deployment.sh to check the system status${NC}"
}

# Run main function
main