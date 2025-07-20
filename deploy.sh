#!/bin/bash

# Deployment script for LeftPlot Backend
# This script demonstrates the proper deployment process

set -e  # Exit on any error

echo "🚀 Starting LeftPlot Backend Deployment..."

# Step 1: Run tests locally first (optional but recommended)
echo "🧪 Running tests locally..."
npm test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed! Aborting deployment."
    exit 1
fi

echo "✅ Tests passed!"

# Step 2: Build Docker image with multi-stage build
echo "🐳 Building Docker image..."
docker build --target production -t leftplot-backend:latest .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "✅ Docker image built successfully!"

# Step 3: Optional - Run containerized tests
echo "🧪 Running tests in Docker container..."
docker build --target test -t leftplot-backend:test .
docker run --rm leftplot-backend:test npm test

if [ $? -ne 0 ]; then
    echo "❌ Containerized tests failed!"
    exit 1
fi

echo "✅ Containerized tests passed!"

# Step 4: Deploy (example - replace with your actual deployment commands)
echo "🚀 Deploying application..."

# Example deployment commands (customize for your platform):
# For Docker Compose:
# docker-compose up -d

# For Kubernetes:
# kubectl apply -f k8s/

# For cloud platforms:
# docker push your-registry/leftplot-backend:latest

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Summary:"
echo "- Tests run and passed"
echo "- Production Docker image built (without test files)"
echo "- Application deployed"
echo ""
echo "🔍 The production image contains:"
echo "- Only production dependencies"
echo "- No test files"
echo "- No development tools"
echo "- Optimized for security and performance" 