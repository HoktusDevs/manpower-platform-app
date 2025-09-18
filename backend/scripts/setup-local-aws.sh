#!/bin/bash

# Setup local AWS services for development
# This script creates DynamoDB tables and S3 buckets in local environment

set -e

echo "🏗️  Setting up local AWS services..."

# Configuration
DYNAMODB_ENDPOINT="http://localhost:8000"
S3_ENDPOINT="http://localhost:4566"
REGION="us-east-1"
STAGE="local"

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Function to check if service is ready
check_service() {
    local service_name=$1
    local endpoint=$2
    local max_attempts=30
    local attempt=1

    echo "🔍 Checking $service_name..."

    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$endpoint" > /dev/null 2>&1; then
            echo "✅ $service_name is ready"
            return 0
        fi

        echo "   Attempt $attempt/$max_attempts - waiting for $service_name..."
        sleep 2
        ((attempt++))
    done

    echo "❌ $service_name failed to start"
    return 1
}

# Check DynamoDB
check_service "DynamoDB" "$DYNAMODB_ENDPOINT"

# Check LocalStack
check_service "LocalStack" "$S3_ENDPOINT/health"

echo ""
echo "📊 Creating DynamoDB tables..."

# Create Documents table for files-service
aws dynamodb create-table \
    --endpoint-url $DYNAMODB_ENDPOINT \
    --region $REGION \
    --table-name "manpower-documents-${STAGE}" \
    --attribute-definitions \
        AttributeName=fileId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
        AttributeName=folderId,AttributeType=S \
    --key-schema \
        AttributeName=fileId,KeyType=HASH \
        AttributeName=userId,KeyType=RANGE \
    --global-secondary-indexes \
        IndexName=UserIndex,KeySchema=['{AttributeName=userId,KeyType=HASH}'],Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
        IndexName=FolderIndex,KeySchema=['{AttributeName=folderId,KeyType=HASH}'],Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --no-cli-pager

echo "✅ Documents table created"

# Create Folders table for folders-service
aws dynamodb create-table \
    --endpoint-url $DYNAMODB_ENDPOINT \
    --region $REGION \
    --table-name "manpower-folders-${STAGE}" \
    --attribute-definitions \
        AttributeName=folderId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
        AttributeName=parentId,AttributeType=S \
    --key-schema \
        AttributeName=folderId,KeyType=HASH \
        AttributeName=userId,KeyType=RANGE \
    --global-secondary-indexes \
        IndexName=UserIndex,KeySchema=['{AttributeName=userId,KeyType=HASH}'],Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
        IndexName=ParentIndex,KeySchema=['{AttributeName=parentId,KeyType=HASH}'],Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --no-cli-pager

echo "✅ Folders table created"

# Create Jobs table for jobs-service
aws dynamodb create-table \
    --endpoint-url $DYNAMODB_ENDPOINT \
    --region $REGION \
    --table-name "manpower-jobs-${STAGE}" \
    --attribute-definitions \
        AttributeName=jobId,AttributeType=S \
        AttributeName=companyId,AttributeType=S \
        AttributeName=folderId,AttributeType=S \
    --key-schema \
        AttributeName=jobId,KeyType=HASH \
        AttributeName=companyId,KeyType=RANGE \
    --global-secondary-indexes \
        IndexName=CompanyIndex,KeySchema=['{AttributeName=companyId,KeyType=HASH}'],Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
        IndexName=FolderIndex,KeySchema=['{AttributeName=folderId,KeyType=HASH}'],Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --no-cli-pager

echo "✅ Jobs table created"

# Create Applications table for job applications
aws dynamodb create-table \
    --endpoint-url $DYNAMODB_ENDPOINT \
    --region $REGION \
    --table-name "manpower-applications-${STAGE}" \
    --attribute-definitions \
        AttributeName=applicationId,AttributeType=S \
        AttributeName=jobId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
    --key-schema \
        AttributeName=applicationId,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=JobIndex,KeySchema=['{AttributeName=jobId,KeyType=HASH}'],Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
        IndexName=UserIndex,KeySchema=['{AttributeName=userId,KeyType=HASH}'],Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
        IndexName=JobUserIndex,KeySchema=['{AttributeName=jobId,KeyType=HASH},{AttributeName=userId,KeyType=RANGE}'],Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --no-cli-pager

echo "✅ Applications table created"

echo ""
echo "🪣 Creating S3 buckets..."

# Create S3 bucket for files
aws s3 mb s3://manpower-files-${STAGE} \
    --endpoint-url $S3_ENDPOINT \
    --region $REGION

echo "✅ Files bucket created"

# Configure S3 bucket CORS
aws s3api put-bucket-cors \
    --endpoint-url $S3_ENDPOINT \
    --region $REGION \
    --bucket "manpower-files-${STAGE}" \
    --cors-configuration '{
        "CORSRules": [
            {
                "AllowedHeaders": ["*"],
                "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
                "AllowedOrigins": ["*"],
                "MaxAgeSeconds": 3000
            }
        ]
    }'

echo "✅ S3 bucket CORS configured"

echo ""
echo "🔍 Setting up Cognito User Pool (LocalStack)..."

# Create Cognito User Pool
USER_POOL_ID=$(aws cognito-idp create-user-pool \
    --endpoint-url $S3_ENDPOINT \
    --region $REGION \
    --pool-name "manpower-users-${STAGE}" \
    --auto-verified-attributes email \
    --username-attributes email \
    --schema Name=email,AttributeDataType=String,Required=true \
             Name=custom:role,AttributeDataType=String,Required=false \
             Name=custom:rut,AttributeDataType=String,Required=false \
             Name=custom:dateOfBirth,AttributeDataType=String,Required=false \
             Name=custom:address,AttributeDataType=String,Required=false \
             Name=custom:city,AttributeDataType=String,Required=false \
             Name=custom:educationLevel,AttributeDataType=String,Required=false \
             Name=custom:workExperience,AttributeDataType=String,Required=false \
             Name=custom:skills,AttributeDataType=String,Required=false \
    --query 'UserPool.Id' \
    --output text)

echo "✅ User Pool created: $USER_POOL_ID"

# Create Cognito User Pool Client
CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --endpoint-url $S3_ENDPOINT \
    --region $REGION \
    --user-pool-id $USER_POOL_ID \
    --client-name "manpower-client-${STAGE}" \
    --generate-secret \
    --explicit-auth-flows ADMIN_NO_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --query 'UserPoolClient.ClientId' \
    --output text)

echo "✅ User Pool Client created: $CLIENT_ID"

# Save configuration
cat > .env.local <<EOF
# Local development environment variables
AWS_REGION=us-east-1
STAGE=local

# DynamoDB Local
DYNAMODB_ENDPOINT=http://localhost:8000
DOCUMENTS_TABLE=manpower-documents-local
FOLDERS_TABLE=manpower-folders-local
JOBS_TABLE=manpower-jobs-local
APPLICATIONS_TABLE=manpower-applications-local

# S3 Local (LocalStack)
S3_ENDPOINT=http://localhost:4566
S3_BUCKET=manpower-files-local
S3_REGION=us-east-1
MAX_FILE_SIZE=52428800
UPLOAD_EXPIRATION=900

# Cognito Local (LocalStack)
COGNITO_ENDPOINT=http://localhost:4566
COGNITO_USER_POOL_ID=$USER_POOL_ID
COGNITO_CLIENT_ID=$CLIENT_ID

# Local service ports
FILES_SERVICE_PORT=3001
AUTH_SERVICE_PORT=3002
FOLDERS_SERVICE_PORT=3003
JOBS_SERVICE_PORT=3004
CONFIG_SERVICE_PORT=3005
API_GATEWAY_PORT=3000
EOF

echo "✅ Local environment configuration saved to .env.local"

echo ""
echo "📋 Summary:"
echo "   🗄️  DynamoDB: http://localhost:8000"
echo "   🖥️  DynamoDB Admin: http://localhost:8001"
echo "   🪣 S3 (LocalStack): http://localhost:4566"
echo "   👤 Cognito User Pool ID: $USER_POOL_ID"
echo "   🔑 Cognito Client ID: $CLIENT_ID"
echo ""
echo "🎉 Local AWS services setup complete!"
echo ""
echo "💡 Next steps:"
echo "   1. Source the environment: source .env.local"
echo "   2. Start services: npm run start:local"
echo "   3. Test endpoints with local AWS services"
echo ""
echo "🔧 Useful commands:"
echo "   - List DynamoDB tables: aws dynamodb list-tables --endpoint-url http://localhost:8000"
echo "   - List S3 buckets: aws s3 ls --endpoint-url http://localhost:4566"
echo "   - View DynamoDB data: open http://localhost:8001"