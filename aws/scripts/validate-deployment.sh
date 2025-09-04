#!/bin/bash

# Manpower Platform Deployment Validation Script
# Usage: ./validate-deployment.sh
# Validates that all components are properly deployed and functioning

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

AWS_REGION=${AWS_REGION:-us-east-1}

# Check stack status
check_stack() {
    local STACK_NAME=$1
    echo -e "${BLUE}Checking stack: $STACK_NAME${NC}"
    
    if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION > /dev/null 2>&1; then
        STATUS=$(aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --query "Stacks[0].StackStatus" \
            --output text \
            --region $AWS_REGION)
        
        if [[ "$STATUS" == *"COMPLETE" ]] && [[ "$STATUS" != *"DELETE"* ]]; then
            echo -e "${GREEN}✅ $STACK_NAME: $STATUS${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  $STACK_NAME: $STATUS${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ $STACK_NAME: Not found${NC}"
        return 1
    fi
}

# Test API endpoint
test_api() {
    echo -e "${BLUE}Testing API endpoint...${NC}"
    
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name ManpowerPlatformBackend \
        --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
        --output text \
        --region $AWS_REGION 2>/dev/null)
    
    if [ -z "$API_URL" ] || [ "$API_URL" = "None" ]; then
        echo -e "${RED}❌ API URL not found${NC}"
        return 1
    fi
    
    echo -e "${BLUE}API URL: $API_URL${NC}"
    
    # Test health endpoint
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" ${API_URL}health || echo "000")
    
    if [ "$RESPONSE" = "200" ]; then
        echo -e "${GREEN}✅ API is responding (HTTP $RESPONSE)${NC}"
        return 0
    else
        echo -e "${RED}❌ API is not responding properly (HTTP $RESPONSE)${NC}"
        return 1
    fi
}

# Test CloudFront distribution
test_cloudfront() {
    echo -e "${BLUE}Testing CloudFront distribution...${NC}"
    
    DISTRIBUTION_URL=$(aws cloudformation describe-stacks \
        --stack-name ManpowerPlatformFrontend \
        --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" \
        --output text \
        --region $AWS_REGION 2>/dev/null)
    
    if [ -z "$DISTRIBUTION_URL" ] || [ "$DISTRIBUTION_URL" = "None" ]; then
        echo -e "${RED}❌ CloudFront URL not found${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Website URL: $DISTRIBUTION_URL${NC}"
    
    # Test website availability
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $DISTRIBUTION_URL || echo "000")
    
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "304" ]; then
        echo -e "${GREEN}✅ Website is accessible (HTTP $RESPONSE)${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Website returned HTTP $RESPONSE${NC}"
        return 1
    fi
}

# Check DynamoDB tables
check_dynamodb() {
    echo -e "${BLUE}Checking DynamoDB tables...${NC}"
    
    TABLES=(
        "manpower-users"
        "manpower-jobPostings"
        "manpower-forms"
        "manpower-applications"
        "manpower-formSubmissions"
        "manpower-files"
        "manpower-sessions"
        "manpower-auditTrail"
    )
    
    local ALL_GOOD=0
    for TABLE in "${TABLES[@]}"; do
        if aws dynamodb describe-table --table-name $TABLE --region $AWS_REGION > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Table exists: $TABLE${NC}"
        else
            echo -e "${RED}❌ Table not found: $TABLE${NC}"
            ALL_GOOD=1
        fi
    done
    
    return $ALL_GOOD
}

# Check S3 buckets
check_s3_buckets() {
    echo -e "${BLUE}Checking S3 buckets...${NC}"
    
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    BUCKETS=(
        "manpower-temp-$AWS_ACCOUNT_ID-$AWS_REGION"
        "manpower-files-$AWS_ACCOUNT_ID-$AWS_REGION"
        "manpower-virus-scan-$AWS_ACCOUNT_ID-$AWS_REGION"
        "manpower-archive-$AWS_ACCOUNT_ID-$AWS_REGION"
        "manpower-frontend-$AWS_ACCOUNT_ID-$AWS_REGION"
    )
    
    local ALL_GOOD=0
    for BUCKET in "${BUCKETS[@]}"; do
        if aws s3api head-bucket --bucket $BUCKET --region $AWS_REGION 2>/dev/null; then
            echo -e "${GREEN}✅ Bucket exists: $BUCKET${NC}"
        else
            echo -e "${RED}❌ Bucket not found: $BUCKET${NC}"
            ALL_GOOD=1
        fi
    done
    
    return $ALL_GOOD
}

# Main validation
main() {
    echo -e "${BLUE}🔍 Starting deployment validation${NC}"
    echo -e "${BLUE}Region: $AWS_REGION${NC}"
    echo ""
    
    ERRORS=0
    
    # Check CloudFormation stacks
    echo -e "${BLUE}=== CloudFormation Stacks ===${NC}"
    check_stack "ManpowerPlatformDatabase" || ((ERRORS++))
    check_stack "ManpowerPlatformStorage" || ((ERRORS++))
    check_stack "ManpowerPlatformBackend" || ((ERRORS++))
    check_stack "ManpowerPlatformFrontend" || ((ERRORS++))
    check_stack "ManpowerPlatformMonitoring" || ((ERRORS++))
    echo ""
    
    # Check DynamoDB
    echo -e "${BLUE}=== DynamoDB Tables ===${NC}"
    check_dynamodb || ((ERRORS++))
    echo ""
    
    # Check S3
    echo -e "${BLUE}=== S3 Buckets ===${NC}"
    check_s3_buckets || ((ERRORS++))
    echo ""
    
    # Test endpoints
    echo -e "${BLUE}=== Endpoint Tests ===${NC}"
    test_api || ((ERRORS++))
    test_cloudfront || ((ERRORS++))
    echo ""
    
    # Summary
    echo -e "${BLUE}=== Validation Summary ===${NC}"
    if [ $ERRORS -eq 0 ]; then
        echo -e "${GREEN}✅ All validations passed!${NC}"
        echo -e "${GREEN}🎉 Deployment is healthy and operational${NC}"
        exit 0
    else
        echo -e "${RED}❌ Found $ERRORS validation error(s)${NC}"
        echo -e "${YELLOW}Please review the errors above and run deployment again if needed${NC}"
        exit 1
    fi
}

# Run main function
main