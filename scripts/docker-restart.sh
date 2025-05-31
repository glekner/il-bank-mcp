#!/bin/bash

# Bank Assistant Docker Restart Script
# Handles graceful shutdown, rebuild, and restart of Docker containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐳 Bank Assistant Docker Restart${NC}"
echo "================================"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose is not installed${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cp env.example .env
    echo -e "${YELLOW}Please edit .env with your bank credentials and run again${NC}"
    exit 1
fi

# Step 1: Stop existing containers
echo -e "\n${YELLOW}📦 Stopping existing containers...${NC}"
docker-compose down || {
    echo -e "${YELLOW}No containers to stop or error stopping containers${NC}"
}

# Step 2: Clean up any orphaned containers
echo -e "\n${YELLOW}🧹 Cleaning up orphaned containers...${NC}"
docker-compose down --remove-orphans

# Step 3: Build containers
echo -e "\n${YELLOW}🔨 Building containers...${NC}"
DOCKER_BUILDKIT=1 docker-compose build --no-cache || {
    echo -e "${RED}❌ Failed to build containers${NC}"
    exit 1
}

# Step 4: Start containers
echo -e "\n${YELLOW}🚀 Starting containers...${NC}"
docker-compose up -d || {
    echo -e "${RED}❌ Failed to start containers${NC}"
    exit 1
}

# Step 5: Wait for containers to be healthy
echo -e "\n${YELLOW}⏳ Waiting for containers to be healthy...${NC}"
sleep 5

# Step 6: Show status
echo -e "\n${GREEN}✅ Docker restart complete!${NC}"
echo -e "\n${YELLOW}📊 Container Status:${NC}"
docker-compose ps

echo -e "\n${YELLOW}📝 Next steps:${NC}"
echo "  - View logs: npm run docker:logs"
echo "  - Check status: npm run docker:status"
echo "  - Configure Claude Desktop: make claude-config"

echo -e "\n${GREEN}🎉 All done!${NC}" 