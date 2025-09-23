#!/bin/bash

# Deploy WebSocket OCR Service Script
# This script deploys the OCR service with WebSocket support

set -e  # Exit on any error

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}

echo "🚀 Deploying OCR Service with WebSocket support"
echo "   Environment: $ENVIRONMENT"
echo "   Region: $REGION"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo "🔧 Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI is required but not installed"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is required but not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is required but not installed"
        exit 1
    fi
    
    # Check serverless
    if ! command -v serverless &> /dev/null; then
        echo "❌ Serverless Framework is required but not installed"
        echo "   Install with: npm install -g serverless"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "❌ AWS credentials not configured or invalid"
        exit 1
    fi
    
    echo "✅ Prerequisites check passed"
    echo ""
}

# Function to install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    npm install --silent
    echo "✅ Dependencies installed"
    echo ""
}

# Function to deploy the service
deploy_service() {
    echo "🚀 Deploying OCR service..."
    
    # Deploy with serverless
    serverless deploy --stage $ENVIRONMENT --region $REGION --verbose
    
    echo "✅ OCR service deployed successfully"
    echo ""
}

# Function to get WebSocket URL
get_websocket_url() {
    echo "🔍 Getting WebSocket URL..."
    
    # Get the WebSocket URL from serverless info
    WEBSOCKET_URL=$(serverless info --stage $ENVIRONMENT --region $REGION | grep -o 'wss://[^[:space:]]*' | head -1)
    
    if [ -z "$WEBSOCKET_URL" ]; then
        echo "⚠️  Could not automatically detect WebSocket URL"
        echo "   Please check the serverless output above for the WebSocket URL"
    else
        echo "✅ WebSocket URL: $WEBSOCKET_URL"
    fi
    
    echo ""
}

# Function to test WebSocket connection
test_websocket() {
    echo "🧪 Testing WebSocket connection..."
    
    if [ -z "$WEBSOCKET_URL" ]; then
        echo "⚠️  Skipping WebSocket test - URL not available"
        return
    fi
    
    # Create a simple test script
    cat > test-websocket-connection.js << 'EOF'
const WebSocket = require('ws');

const wsUrl = process.argv[2];
if (!wsUrl) {
    console.error('WebSocket URL is required');
    process.exit(1);
}

console.log('Testing WebSocket connection to:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
    console.log('✅ WebSocket connection successful');
    
    // Send a test message
    ws.send(JSON.stringify({ type: 'ping' }));
    
    // Close after 2 seconds
    setTimeout(() => {
        ws.close();
        process.exit(0);
    }, 2000);
});

ws.on('message', (data) => {
    console.log('📨 Received message:', data.toString());
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    process.exit(1);
});

ws.on('close', (code, reason) => {
    console.log('🔌 WebSocket closed:', code, reason.toString());
});

// Timeout after 10 seconds
setTimeout(() => {
    console.error('⏰ WebSocket test timeout');
    process.exit(1);
}, 10000);
EOF
    
    # Install ws package for testing
    npm install ws --save-dev --silent
    
    # Run the test
    if node test-websocket-connection.js "$WEBSOCKET_URL"; then
        echo "✅ WebSocket test passed"
    else
        echo "❌ WebSocket test failed"
    fi
    
    # Clean up
    rm test-websocket-connection.js
    npm uninstall ws --silent
    
    echo ""
}

# Function to show deployment summary
show_summary() {
    echo "🎉 OCR Service deployment completed!"
    echo ""
    echo "📋 Deployment Summary:"
    echo "   Environment: $ENVIRONMENT"
    echo "   Region: $REGION"
    echo "   Service: ocr-service"
    echo ""
    
    if [ ! -z "$WEBSOCKET_URL" ]; then
        echo "🔌 WebSocket Configuration:"
        echo "   URL: $WEBSOCKET_URL"
        echo ""
        echo "📝 Frontend Configuration:"
        echo "   Update your frontend WebSocket config with:"
        echo "   $WEBSOCKET_URL"
        echo ""
    fi
    
    echo "⚡ Next steps:"
    echo "   1. Update frontend WebSocket configuration"
    echo "   2. Test WebSocket connection from frontend"
    echo "   3. Monitor WebSocket logs: serverless logs -f websocketConnect --tail"
    echo "   4. Test document processing with WebSocket notifications"
}

# Handle script arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [ENVIRONMENT] [REGION]"
    echo ""
    echo "Arguments:"
    echo "  ENVIRONMENT  Deployment environment (default: dev)"
    echo "  REGION       AWS region (default: us-east-1)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy to dev environment in us-east-1"
    echo "  $0 prod               # Deploy to prod environment in us-east-1"
    echo "  $0 staging us-west-2  # Deploy to staging in us-west-2"
    echo ""
    echo "Prerequisites:"
    echo "  - AWS CLI configured"
    echo "  - Node.js and npm installed"
    echo "  - Serverless Framework installed"
    exit 0
fi

# Main deployment process
main() {
    check_prerequisites
    install_dependencies
    deploy_service
    get_websocket_url
    test_websocket
    show_summary
}

# Run deployment
main
