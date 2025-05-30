#!/bin/bash

# Bank Leumi MCP Server Connection Script
# This script facilitates connection to the MCP server running in Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if the MCP server container is running
if ! docker ps --format '{{.Names}}' | grep -q '^bank-mcp-server$'; then
    print_error "MCP server container is not running."
    print_info "Starting services with docker-compose..."
    
    # Start the services
    docker-compose up -d
    
    # Wait for services to be ready
    print_info "Waiting for services to start..."
    sleep 10
    
    # Check again
    if ! docker ps --format '{{.Names}}' | grep -q '^bank-mcp-server$'; then
        print_error "Failed to start MCP server. Check logs with: docker-compose logs mcp-server"
        exit 1
    fi
fi

print_info "Connecting to Bank Leumi MCP Server..."
print_info "Use Ctrl+C or type 'exit' to disconnect"
echo ""

# Connect to the MCP server via docker exec
# The -it flags enable interactive terminal
docker exec -it bank-mcp-server node dist/index.js

print_info "Disconnected from MCP server" 