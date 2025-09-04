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
