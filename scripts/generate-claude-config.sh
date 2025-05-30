#!/bin/bash

# Script to generate Claude Desktop configuration for Bank Leumi MCP Server

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Claude config path
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    # Windows
    CLAUDE_CONFIG_DIR="$APPDATA/Claude"
else
    # Linux
    CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
fi

CLAUDE_CONFIG_PATH="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

# Create config directory if it doesn't exist
mkdir -p "$CLAUDE_CONFIG_DIR"

# Generate the configuration
print_info "Generating Claude Desktop configuration..."

cat > "$CLAUDE_CONFIG_PATH.tmp" << EOF
{
  "mcpServers": {
    "bank-leumi-assistant": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--network", "bank-assistant-network",
        "-v", "${PROJECT_ROOT}/data:/app/data:ro",
        "--env-file", "${PROJECT_ROOT}/.env",
        "-e", "NODE_ENV=production",
        "-e", "DATABASE_PATH=/app/data/bank.db",
        "mcp-scraper-mcp-server"
      ]
    }
  }
}
EOF

# Check if config already exists and merge if needed
if [ -f "$CLAUDE_CONFIG_PATH" ]; then
    print_warning "Existing Claude configuration found. Creating backup..."
    cp "$CLAUDE_CONFIG_PATH" "$CLAUDE_CONFIG_PATH.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Merge configurations using jq if available
    if command -v jq &> /dev/null; then
        print_info "Merging with existing configuration..."
        jq -s '.[0] * .[1]' "$CLAUDE_CONFIG_PATH" "$CLAUDE_CONFIG_PATH.tmp" > "$CLAUDE_CONFIG_PATH.new"
        mv "$CLAUDE_CONFIG_PATH.new" "$CLAUDE_CONFIG_PATH"
        rm "$CLAUDE_CONFIG_PATH.tmp"
    else
        print_warning "jq not found. Please manually merge the configuration:"
        echo ""
        cat "$CLAUDE_CONFIG_PATH.tmp"
        echo ""
        print_info "Configuration saved to: $CLAUDE_CONFIG_PATH.tmp"
        print_info "Please manually add the 'bank-leumi-assistant' server to your existing config"
    fi
else
    mv "$CLAUDE_CONFIG_PATH.tmp" "$CLAUDE_CONFIG_PATH"
fi

print_info "Claude Desktop configuration generated successfully!"
print_info "Configuration location: $CLAUDE_CONFIG_PATH"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Ensure Docker services are running: docker-compose up -d"
echo "2. Restart Claude Desktop"
echo "3. Look for the hammer icon to access Bank Leumi tools"
echo ""
print_info "Available tools:"
echo "  - get_transactions: Get bank transactions for a specific time period"
echo "  - get_financial_summary: Get comprehensive financial summary"
echo "  - get_accounts: Get all bank accounts with current balances"
echo "  - get_account_balance_history: Get balance history for an account"
echo "  - refresh_bank_data: Force a fresh scrape of bank data" 