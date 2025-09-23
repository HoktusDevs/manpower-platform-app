#!/bin/bash

# Deploy Document Types Service
# Usage: ./deploy.sh [stage]
# Example: ./deploy.sh dev

STAGE=${1:-dev}

echo "🚀 Deploying Document Types Service to stage: $STAGE"

# Check if serverless is installed
if ! command -v serverless &> /dev/null; then
    echo "❌ Serverless CLI not found. Please install it first:"
    echo "npm install -g serverless"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Deploy to AWS
echo "☁️ Deploying to AWS..."
serverless deploy --stage $STAGE

# Get the service URL
echo "🔗 Getting service URL..."
SERVICE_URL=$(serverless info --stage $STAGE | grep "ServiceEndpoint" | awk '{print $2}')

if [ ! -z "$SERVICE_URL" ]; then
    echo "✅ Document Types Service deployed successfully!"
    echo "🌐 Service URL: $SERVICE_URL"
    echo ""
    echo "📋 Next steps:"
    echo "1. Update the frontend environment variable:"
    echo "   VITE_DOCUMENT_TYPES_SERVICE_URL=$SERVICE_URL"
    echo ""
    echo "2. Update the jobs-service environment variable:"
    echo "   DOCUMENT_TYPES_SERVICE_URL=$SERVICE_URL"
    echo ""
    echo "3. Test the service:"
    echo "   curl $SERVICE_URL/health"
else
    echo "❌ Failed to get service URL"
    exit 1
fi
