#!/bin/bash

# Script to setup/update local DynamoDB table with UniqueKeyIndex GSI
# Usage: ./scripts/setup-local-table.sh

set -e

ENDPOINT="http://localhost:8000"
TABLE_NAME="manpower-folders-local"
REGION="us-east-1"

echo "🔍 Checking if DynamoDB Local is running..."
if ! curl -s "$ENDPOINT" > /dev/null 2>&1; then
    echo "❌ DynamoDB Local is not running at $ENDPOINT"
    echo "   Please start DynamoDB Local first:"
    echo "   docker run -p 8000:8000 amazon/dynamodb-local"
    exit 1
fi

echo "✅ DynamoDB Local is running"

echo ""
echo "🔍 Checking if table exists..."
if aws dynamodb describe-table \
    --table-name "$TABLE_NAME" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" \
    > /dev/null 2>&1; then

    echo "⚠️  Table already exists"
    echo "   Checking for UniqueKeyIndex GSI..."

    # Check if GSI exists
    if aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --endpoint-url "$ENDPOINT" \
        --region "$REGION" \
        --query 'Table.GlobalSecondaryIndexes[?IndexName==`UniqueKeyIndex`]' \
        --output text | grep -q "UniqueKeyIndex"; then

        echo "✅ UniqueKeyIndex GSI already exists"
        echo "   No action needed"
        exit 0
    else
        echo "⚠️  UniqueKeyIndex GSI does not exist"
        echo "   Updating table to add GSI..."

        aws dynamodb update-table \
            --table-name "$TABLE_NAME" \
            --endpoint-url "$ENDPOINT" \
            --region "$REGION" \
            --attribute-definitions AttributeName=uniqueKey,AttributeType=S \
            --global-secondary-index-updates '[{
                "Create": {
                    "IndexName": "UniqueKeyIndex",
                    "KeySchema": [{"AttributeName": "uniqueKey", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"}
                }
            }]'

        echo "✅ GSI added successfully"
        exit 0
    fi
else
    echo "📝 Table does not exist, creating from JSON..."

    # Check if JSON file exists
    if [ ! -f "../create-folders-table.json" ]; then
        echo "❌ create-folders-table.json not found"
        exit 1
    fi

    aws dynamodb create-table \
        --cli-input-json file://../create-folders-table.json \
        --endpoint-url "$ENDPOINT" \
        --region "$REGION"

    echo "✅ Table created successfully with UniqueKeyIndex GSI"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📊 Table info:"
aws dynamodb describe-table \
    --table-name "$TABLE_NAME" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" \
    --query 'Table.{TableName:TableName,ItemCount:ItemCount,GSIs:GlobalSecondaryIndexes[].IndexName}' \
    --output table
