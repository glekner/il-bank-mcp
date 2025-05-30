#!/bin/sh

# Docker entrypoint script for Bank Leumi Scraper Service
# Handles initialization and startup logic

set -e

# Colors for output (using echo -e compatible format)
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo_info() {
    echo "${GREEN}[INFO]${NC} $1"
}

echo_warning() {
    echo "${YELLOW}[WARNING]${NC} $1"
}

# Ensure data directory exists with proper permissions
if [ ! -d "/app/data" ]; then
    echo_info "Creating data directory..."
    mkdir -p /app/data
fi

# Initialize database if it doesn't exist
if [ ! -f "/app/data/bank.db" ]; then
    echo_info "Initializing database..."
    # The TypeScript code will handle database initialization
fi

# Ensure logs directory exists
if [ ! -d "/app/packages/scraper/logs" ]; then
    echo_info "Creating logs directory..."
    mkdir -p /app/packages/scraper/logs
fi

# Check if running in development mode
if [ "$NODE_ENV" = "development" ]; then
    echo_warning "Running in development mode"
    echo_info "Logs will be more verbose"
fi

# Display configuration
echo_info "Starting Bank Leumi Scraper Service"
echo "Configuration:"
echo "  Database: ${DATABASE_PATH:-/app/data/bank.db}"
echo "  Environment: ${NODE_ENV:-production}"
echo "  Log Level: ${LOG_LEVEL:-info}"
echo "  Scrape Schedule: ${SCRAPE_CRON_SCHEDULE:-0 */6 * * *}"

# Execute the main command
echo_info "Starting application..."
exec "$@" 