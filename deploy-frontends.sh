#!/bin/bash

# Deploy Manpower Platform Frontends to S3/CloudFront
# Deploys both applicant-frontend and auth-frontend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying Manpower Platform Frontends${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
STACK_NAME_PREFIX="ManpowerPlatform"

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

echo -e "   ✅ AWS Account: ${GREEN}$AWS_ACCOUNT${NC}"
echo -e "   ✅ AWS Region: ${GREEN}$(aws configure get region || echo $AWS_REGION)${NC}"
echo ""

# Step 2: Build Applicant Frontend
echo -e "${BLUE}🔧 Step 2: Building Applicant Frontend${NC}"
cd applicant-frontend

if [ ! -d "node_modules" ]; then
    echo "   📦 Installing dependencies..."
    npm install
fi

echo "   🔧 Building React application..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed - no dist directory found${NC}"
    exit 1
fi

echo -e "   ✅ Applicant frontend built successfully"
cd ..

# Step 3: Build Auth Frontend
echo -e "${BLUE}🔧 Step 3: Building Auth Frontend${NC}"
cd auth-frontend

if [ ! -d "node_modules" ]; then
    echo "   📦 Installing dependencies..."
    npm install
fi

echo "   🔧 Building React application..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed - no dist directory found${NC}"
    exit 1
fi

echo -e "   ✅ Auth frontend built successfully"
cd ..

# Step 4: Deploy to S3 (create buckets if they don't exist)
echo -e "${BLUE}📤 Step 4: Deploying to S3${NC}"

# Applicant Frontend
APPLICANT_BUCKET_NAME="manpower-applicant-frontend-$(date +%s)"
AUTH_BUCKET_NAME="manpower-auth-frontend-$(date +%s)"

echo "   🪣 Creating S3 buckets..."

# Create applicant bucket
aws s3 mb "s3://$APPLICANT_BUCKET_NAME" --region $AWS_REGION || true

# Disable block public access settings
aws s3api put-public-access-block --bucket "$APPLICANT_BUCKET_NAME" --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Configure bucket for static website hosting
aws s3 website "s3://$APPLICANT_BUCKET_NAME" --index-document index.html --error-document index.html

# Set bucket policy for public read access
cat > /tmp/bucket-policy-applicant.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$APPLICANT_BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket "$APPLICANT_BUCKET_NAME" --policy file:///tmp/bucket-policy-applicant.json

# Create auth bucket
aws s3 mb "s3://$AUTH_BUCKET_NAME" --region $AWS_REGION || true

# Disable block public access settings
aws s3api put-public-access-block --bucket "$AUTH_BUCKET_NAME" --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Configure bucket for static website hosting
aws s3 website "s3://$AUTH_BUCKET_NAME" --index-document index.html --error-document index.html

# Set bucket policy for public read access
cat > /tmp/bucket-policy-auth.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$AUTH_BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket "$AUTH_BUCKET_NAME" --policy file:///tmp/bucket-policy-auth.json

echo -e "   ✅ S3 buckets created and configured"

# Step 5: Upload files
echo -e "${BLUE}📤 Step 5: Uploading Files${NC}"

# Upload applicant frontend
echo "   📤 Uploading applicant frontend to S3..."
aws s3 sync applicant-frontend/dist/ "s3://$APPLICANT_BUCKET_NAME" --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" --exclude "service-worker.js" --exclude "manifest.json"

aws s3 sync applicant-frontend/dist/ "s3://$APPLICANT_BUCKET_NAME" --delete \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "*.html" --include "service-worker.js" --include "manifest.json"

# Upload auth frontend
echo "   📤 Uploading auth frontend to S3..."
aws s3 sync auth-frontend/dist/ "s3://$AUTH_BUCKET_NAME" --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" --exclude "service-worker.js" --exclude "manifest.json"

aws s3 sync auth-frontend/dist/ "s3://$AUTH_BUCKET_NAME" --delete \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "*.html" --include "service-worker.js" --include "manifest.json"

# Step 6: Get website URLs
APPLICANT_URL="http://$APPLICANT_BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"
AUTH_URL="http://$AUTH_BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"

# Clean up temporary files
rm -f /tmp/bucket-policy-*.json

# Final Summary
echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo -e "📊 Deployment Summary:"
echo -e "   AWS Account: ${GREEN}$AWS_ACCOUNT${NC}"
echo -e "   Region: ${GREEN}$AWS_REGION${NC}"
echo ""
echo -e "🌐 Frontend URLs:"
echo -e "   Applicant Frontend: ${GREEN}$APPLICANT_URL${NC}"
echo -e "   Auth Frontend: ${GREEN}$AUTH_URL${NC}"
echo ""
echo -e "🪣 S3 Buckets:"
echo -e "   Applicant: ${GREEN}$APPLICANT_BUCKET_NAME${NC}"
echo -e "   Auth: ${GREEN}$AUTH_BUCKET_NAME${NC}"
echo ""
echo -e "🚀 Next Steps:"
echo -e "   1. Test applicant frontend: ${YELLOW}$APPLICANT_URL${NC}"
echo -e "   2. Test auth frontend: ${YELLOW}$AUTH_URL${NC}"
echo -e "   3. Configure CloudFront distributions for production (optional)"
echo ""
echo -e "📝 Save these URLs for future reference!"