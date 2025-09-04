#!/bin/bash

# Build script for auth-service Lambda deployment

set -e

echo "Building auth-service for Lambda deployment..."

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist lambda-deployment.zip

# Build TypeScript
echo "Compiling TypeScript..."
npm run build

# Prepare Lambda package
echo "Preparing Lambda package..."
cd dist

# Copy package files
cp ../package.json .
cp ../package-lock.json .

# Install production dependencies
echo "Installing production dependencies..."
npm ci --omit=dev

# Create deployment package
echo "Creating deployment package..."
zip -r ../lambda-deployment.zip . -q

cd ..

echo "✅ Lambda deployment package created: lambda-deployment.zip"
echo "Package size: $(du -h lambda-deployment.zip | cut -f1)"