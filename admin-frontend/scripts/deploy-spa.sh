#!/bin/bash

# Deploy SPA to S3 with proper routing support
BUCKET="manpower-admin-frontend-dev"

echo "🚀 Deploying SPA to S3..."

# Sync all files
aws s3 sync dist/ s3://$BUCKET/ --delete

# Create index.html files for all SPA routes
ROUTES=(
    "admin"
    "admin/migration"
    "admin/applications"
    "admin/jobs"
    "admin/folders&files"
    "admin/test-whatsapp"
    "admin/test-ocr"
    "admin/messaging"
    "admin/settings"
)

echo "📁 Creating index.html files for SPA routes..."

for route in "${ROUTES[@]}"; do
    echo "Creating: $route"
    aws s3 cp dist/index.html s3://$BUCKET/$route
done

echo "✅ SPA deployment completed!"
echo "🌐 Website URL: http://$BUCKET.s3-website-us-east-1.amazonaws.com"
