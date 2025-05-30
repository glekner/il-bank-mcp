# Docker Infrastructure Documentation

This document provides comprehensive information about the Docker setup for the Bank Leumi MCP Server project.

## Overview

The project uses Docker Compose to orchestrate two main services:

- **Scraper Service**: Handles bank data scraping with Puppeteer/Chromium support
- **MCP Server**: Provides Model Context Protocol interface for AI assistants

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   Claude Desktop    │     │   Other MCP Clients │
│  (or other clients) │     │                     │
└──────────┬──────────┘     └──────────┬──────────┘
           │ stdio                      │ stdio
           │                            │
┌──────────▼────────────────────────────▼──────────┐
│              MCP Server Container                 │
│  - Exposes bank data tools via MCP protocol      │
│  - Read-only access to bank database             │
└───────────────────────┬──────────────────────────┘
                        │ Shared Volume
                        │ (Read-Only)
┌───────────────────────▼──────────────────────────┐
│            Scraper Service Container              │
│  - Runs periodic bank data scraping               │
│  - Includes Chromium for Puppeteer               │
│  - Manages SQLite database                       │
└───────────────────────────────────────────────────┘
```

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB+ available RAM
- Valid Bank Leumi credentials in `.env` file

## Quick Start

1. **Clone and setup environment:**

   ```bash
   git clone <repository-url>
   cd mcp-scraper
   cp env.example .env
   # Edit .env with your Bank Leumi credentials
   ```

2. **Build and start services:**

   ```bash
   docker-compose up -d --build
   ```

3. **Configure Claude Desktop:**

   ```bash
   ./scripts/generate-claude-config.sh
   ```

4. **Restart Claude Desktop** to load the MCP server

## Service Details

### Scraper Service

The scraper service runs continuously and handles:

- Automated bank data scraping
- Transaction processing
- Database management
- Trend analysis

**Key Features:**

- Pre-installed Chromium for Puppeteer
- Automatic retry logic
- Health monitoring
- Persistent data storage

**Environment Variables:**

```bash
NODE_ENV=production
DATABASE_PATH=/app/data/bank.db
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage
```

### MCP Server

The MCP server provides AI-friendly tools:

- `get_transactions`: Retrieve transactions by date range
- `get_financial_summary`: Get income/expense analysis
- `get_accounts`: List all accounts with balances
- `get_account_balance_history`: Track balance changes
- `refresh_bank_data`: Trigger manual data refresh

**Access Methods:**

1. **Claude Desktop**: Automatically configured via stdio
2. **Direct Connection**: `docker exec -it bank-mcp-server node dist/index.js`
3. **Custom Clients**: Connect via Docker SDK

## Docker Commands

### Basic Operations

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# View service status
docker-compose ps
```

### Service-Specific Commands

```bash
# View scraper logs only
docker-compose logs -f scraper

# View MCP server logs
docker-compose logs -f mcp-server

# Access scraper shell
docker exec -it bank-scraper /bin/sh

# Test MCP server connection
docker exec -it bank-mcp-server node dist/index.js
```

### Data Management

```bash
# Backup database
docker run --rm -v mcp-scraper_bank-data:/data -v $(pwd):/backup alpine tar czf /backup/bank-data-backup-$(date +%Y%m%d).tar.gz -C /data .

# View database size
docker exec bank-scraper du -h /app/data/bank.db

# Clear logs
docker exec bank-scraper rm -rf /app/packages/scraper/logs/*
```

## Troubleshooting

### Common Issues

1. **MCP Server not appearing in Claude Desktop**

   - Ensure Docker services are running: `docker-compose ps`
   - Regenerate config: `./scripts/generate-claude-config.sh`
   - Restart Claude Desktop completely

2. **Puppeteer/Chromium errors**

   - Check container has proper capabilities: `docker-compose logs scraper`
   - Ensure sufficient memory (2GB+ recommended)
   - Verify security options in docker-compose.yml

3. **Database connection issues**

   - Check volume permissions: `ls -la ./data`
   - Ensure database exists: `docker exec bank-scraper ls -la /app/data`
   - Verify DATABASE_PATH environment variable

4. **Authentication failures**
   - Verify .env file contains correct credentials
   - Check if bank website has changed (may need scraper updates)
   - Review scraper logs for detailed error messages

### Debug Mode

Enable detailed logging:

```bash
# Edit docker-compose.yml and add to environment:
DEBUG=true
LOG_LEVEL=debug

# Restart services
docker-compose up -d
```

### Performance Optimization

1. **Resource Limits** (add to docker-compose.yml):

   ```yaml
   services:
     scraper:
       deploy:
         resources:
           limits:
             cpus: "1.0"
             memory: 2G
           reservations:
             memory: 1G
   ```

2. **Build Cache**:

   ```bash
   # Use BuildKit for faster builds
   DOCKER_BUILDKIT=1 docker-compose build
   ```

3. **Volume Performance** (macOS):
   ```yaml
   volumes:
     - ./data:/app/data:delegated
   ```

## Security Considerations

1. **Credentials**: Never commit .env file; use secrets management in production
2. **Network Isolation**: Services communicate only via internal network
3. **Read-Only Access**: MCP server has read-only database access
4. **Container Security**: Runs with minimal required capabilities

## Production Deployment

For production use:

1. Use Docker Swarm or Kubernetes for orchestration
2. Implement proper secrets management (Docker Secrets, Vault, etc.)
3. Set up monitoring (Prometheus, Grafana)
4. Configure automated backups
5. Use external volume drivers for persistent storage
6. Implement rate limiting for bank API calls

## Development Workflow

1. **Local Development**:

   ```bash
   # Run services with live reload
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
   ```

2. **Testing Changes**:

   ```bash
   # Rebuild specific service
   docker-compose build mcp-server
   docker-compose up -d mcp-server
   ```

3. **Debugging**:
   ```bash
   # Attach debugger
   docker exec -it bank-mcp-server node --inspect=0.0.0.0:9229 dist/index.js
   ```

## Maintenance

### Regular Tasks

- **Weekly**: Check logs for errors, review resource usage
- **Monthly**: Update dependencies, backup database
- **Quarterly**: Review security updates, update base images

### Updating Services

```bash
# Update base images
docker-compose pull
docker-compose up -d --build

# Prune old images
docker image prune -a
```

## Support

For issues or questions:

1. Check logs: `docker-compose logs`
2. Review this documentation
3. Check GitHub issues
4. Contact maintainers

---

Last Updated: 2025
