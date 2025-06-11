# Docker Quick Reference Guide

## 🚀 Quick Start

```bash
# 1. Setup environment
cp env.example .env
# Edit .env with Bank Leumi credentials

# 2. Start everything
make setup

# 3. Configure Claude Desktop
make claude-config

# 4. Restart Claude Desktop
```

## 📋 Common Commands

| Command             | Description               |
| ------------------- | ------------------------- |
| `make up`           | Start all services        |
| `make down`         | Stop all services         |
| `make logs`         | View all logs             |
| `make logs-scraper` | View scraper logs only    |
| `make logs-mcp`     | View MCP server logs only |
| `make status`       | Check service status      |
| `make restart`      | Restart all services      |
| `make backup`       | Backup database           |

## 🔧 Troubleshooting

### Services won't start

```bash
# Check logs
make logs

# Validate environment
make validate-env

# Rebuild from scratch
make clean
make build
make up
```

### MCP not appearing in Claude

```bash
# Regenerate config
make claude-config

# Check MCP server
make test-mcp

# View MCP logs
make logs-mcp
```

### Database issues

```bash
# Check database file
docker exec bank-scraper ls -la /app/data/

# Access scraper shell
make shell-scraper

# Force scrape
docker exec bank-scraper node dist/cli.js scrape
```

## 🛠️ Development

```bash
# Run in dev mode with hot reload
make dev-up

# Rebuild specific service
docker-compose build mcp-server
docker-compose up -d mcp-server

# Access container shell
make shell-scraper  # or shell-mcp
```

## 📦 Direct Docker Commands

```bash
# If you prefer docker-compose directly:

# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Rebuild
docker-compose up -d --build

# Execute commands
docker exec bank-scraper node dist/cli.js summary
docker exec -it bank-mcp-server node dist/index.js
```

## 🔐 Security Notes

- `.env` file contains sensitive credentials - never commit!
- MCP server has read-only database access
- Services communicate only via internal Docker network
- Chromium runs with minimal privileges

## 📁 File Locations

- **Database**: `./data/bank.db`
- **Logs**: `./packages/scraper/logs/`
- **Backups**: `./backups/`
- **Claude Config**: `~/Library/Application Support/Claude/claude_desktop_config.json`

## ⚙️ Environment Variables

```bash
# Required
BANK_USERNAME=your_username
BANK_PASSWORD=your_password

# Optional
SCRAPE_MONTHS_BACK=6              # Default: 6
DATABASE_PATH=/app/data/bank.db   # Default: ./data/bank.db
LOG_LEVEL=info                    # Default: info
```

---

For detailed documentation, see [DOCKER.md](./DOCKER.md)
