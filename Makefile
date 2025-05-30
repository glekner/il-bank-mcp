# Bank Leumi MCP Server - Makefile
# Provides convenient commands for Docker operations

.PHONY: help build up down logs clean setup test claude-config validate-env

# Default target
help:
	@echo "Bank Leumi MCP Server - Docker Management"
	@echo ""
	@echo "Available commands:"
	@echo "  make setup          - Initial setup (copy env, build, start)"
	@echo "  make build          - Build Docker images"
	@echo "  make up             - Start all services"
	@echo "  make down           - Stop all services"
	@echo "  make logs           - View logs (all services)"
	@echo "  make logs-scraper   - View scraper logs"
	@echo "  make logs-mcp       - View MCP server logs"
	@echo "  make clean          - Remove containers, volumes, and images"
	@echo "  make test-mcp       - Test MCP server connection"
	@echo "  make claude-config  - Generate Claude Desktop configuration"
	@echo "  make backup         - Backup database"
	@echo "  make shell-scraper  - Access scraper container shell"
	@echo "  make shell-mcp      - Access MCP container shell"
	@echo "  make status         - Show service status"

# Initial setup
setup:
	@echo "Setting up Bank Leumi MCP Server..."
	@if [ ! -f .env ]; then \
		echo "Creating .env file from template..."; \
		cp env.example .env; \
		echo "⚠️  Please edit .env with your Bank Leumi credentials"; \
		echo "Then run 'make setup' again"; \
		exit 1; \
	else \
		echo "✓ .env file already exists"; \
	fi
	@echo "Validating environment..."
	@chmod +x scripts/validate-env.sh
	@./scripts/validate-env.sh || exit 1
	@echo "Building Docker images..."
	@docker-compose build
	@echo "Starting services..."
	@docker-compose up -d
	@echo "✓ Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "1. Run 'make claude-config' to configure Claude Desktop"
	@echo "2. Restart Claude Desktop"

# Validate environment
validate-env:
	@chmod +x scripts/validate-env.sh
	@./scripts/validate-env.sh

# Build Docker images
build: validate-env
	@echo "Building Docker images..."
	@DOCKER_BUILDKIT=1 docker-compose build

# Start services
up: validate-env
	@echo "Starting services..."
	@docker-compose up -d
	@echo "✓ Services started"
	@docker-compose ps

# Stop services
down:
	@echo "Stopping services..."
	@docker-compose down
	@echo "✓ Services stopped"

# View logs
logs:
	@docker-compose logs -f

logs-scraper:
	@docker-compose logs -f scraper

logs-mcp:
	@docker-compose logs -f mcp-server

# Clean up everything
clean:
	@echo "⚠️  This will remove all containers, volumes, and images!"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	@docker-compose down -v --rmi all
	@echo "✓ Cleanup complete"

# Test MCP server
test-mcp:
	@echo "Testing MCP server connection..."
	@docker exec -it bank-mcp-server node dist/index.js || echo "❌ MCP server test failed"

# Generate Claude configuration
claude-config:
	@echo "Generating Claude Desktop configuration..."
	@chmod +x scripts/generate-claude-config.sh
	@./scripts/generate-claude-config.sh

# Backup database
backup:
	@echo "Backing up database..."
	@mkdir -p backups
	@docker run --rm -v $(shell pwd)/data:/data -v $(shell pwd)/backups:/backups alpine \
		tar czf /backups/bank-data-backup-$(shell date +%Y%m%d-%H%M%S).tar.gz -C /data .
	@echo "✓ Backup saved to backups/"

# Shell access
shell-scraper:
	@docker exec -it bank-scraper /bin/sh

shell-mcp:
	@docker exec -it bank-mcp-server /bin/sh

# Service status
status:
	@echo "Service Status:"
	@docker-compose ps
	@echo ""
	@echo "Resource Usage:"
	@docker stats --no-stream bank-scraper bank-mcp-server

# Development targets
dev-build:
	@echo "Building for development..."
	@docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

dev-up:
	@echo "Starting in development mode..."
	@docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Quick restart
restart: down up

# View container sizes
sizes:
	@echo "Image sizes:"
	@docker images | grep -E "(bank-mcp-server|bank-scraper|REPOSITORY)"
	@echo ""
	@echo "Volume sizes:"
	@docker system df -v | grep -A 10 "VOLUME NAME" | grep -E "(bank-|VOLUME)" 