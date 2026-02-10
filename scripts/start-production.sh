#!/bin/bash
# =============================================================================
# 🚀 PrimeSpace Production Start Script
# =============================================================================
# Usage: ./scripts/start-production.sh
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   🚀 PrimeSpace Production Deployment                     ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for required environment variables
check_env() {
    local var_name=$1
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}ERROR: Required environment variable $var_name is not set${NC}"
        return 1
    fi
    echo -e "${GREEN}✓${NC} $var_name is set"
    return 0
}

echo "Checking environment variables..."
echo ""

# Required variables
REQUIRED_VARS=(
    "JWT_SECRET"
    "API_KEY_SALT"
)

# Optional but recommended
RECOMMENDED_VARS=(
    "DATABASE_URL"
    "REDIS_URL"
    "FRONTEND_URL"
)

all_required=true
for var in "${REQUIRED_VARS[@]}"; do
    if ! check_env "$var"; then
        all_required=false
    fi
done

if [ "$all_required" = false ]; then
    echo ""
    echo -e "${RED}Missing required environment variables. Please set them before continuing.${NC}"
    echo ""
    echo "Example:"
    echo "  export JWT_SECRET=\$(openssl rand -base64 32)"
    echo "  export API_KEY_SALT=\$(openssl rand -base64 32)"
    exit 1
fi

echo ""
echo "Checking recommended variables..."
for var in "${RECOMMENDED_VARS[@]}"; do
    if ! check_env "$var" 2>/dev/null; then
        echo -e "${YELLOW}⚠ $var is not set (using default)${NC}"
    fi
done

echo ""
echo -e "${GREEN}Environment check passed!${NC}"
echo ""

# Determine deployment method
if command -v docker-compose &> /dev/null || command -v docker &> /dev/null; then
    echo "Docker detected. Using Docker deployment..."
    echo ""
    
    # Check if docker-compose.prod.yml exists
    if [ -f "docker-compose.prod.yml" ]; then
        echo "Starting production containers..."
        docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    else
        echo "Starting containers with default compose file..."
        docker compose up -d
    fi
    
    echo ""
    echo -e "${GREEN}Containers started successfully!${NC}"
    echo ""
    echo "Useful commands:"
    echo "  docker compose logs -f        # View logs"
    echo "  docker compose ps              # Check status"
    echo "  docker compose down            # Stop containers"
    echo ""
    
else
    echo "Docker not found. Using Node.js deployment..."
    echo ""
    
    # Check Node.js version
    NODE_VERSION=$(node -v 2>/dev/null || echo "none")
    if [ "$NODE_VERSION" = "none" ]; then
        echo -e "${RED}ERROR: Node.js is not installed${NC}"
        exit 1
    fi
    
    echo "Node.js version: $NODE_VERSION"
    
    # Install dependencies
    echo ""
    echo "Installing backend dependencies..."
    cd backend
    npm ci --only=production
    
    # Build if needed
    if [ ! -d "dist" ]; then
        echo "Building backend..."
        npm run build
    fi
    
    # Start the server
    echo ""
    echo "Starting PrimeSpace server..."
    NODE_ENV=production npm start
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   PrimeSpace is running! 🎉                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
