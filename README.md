# Israeli Bank Scraper MCP Server

A TypeScript service that scrapes Israeli bank and credit card data, exposed through a Model Context Protocol (MCP) server for AI assistant integration.

## Overview

This project consists of two main components:

- **Scraper Service**: Automates data collection from Israeli financial institutions using [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers)
- **MCP Server**: Exposes the scraped data through standardized tools for AI assistants

## Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd il-bank-mcp

# Run with Docker Compose (using mock credentials)
LEUMI_USERNAME=mock_user LEUMI_PASSWORD=mock_pass docker-compose up
```

## Features

- Automated scraping from Israeli banks and credit cards
- Local SQLite database for data persistence
- Parallel scraping for multiple providers
- Dynamic provider detection based on credentials
- Docker support for easy deployment

## Available Tools

### Data Retrieval

- `get_transactions` - Retrieve transactions for a specific time period
- `get_financial_summary` - Get aggregated income, expenses, and trends
- `get_accounts` - List all accounts with current balances
- `get_account_balance_history` - Track balance changes over time
- `get_metadata` - Get database statistics and available data ranges
- `search_transactions` - Search transactions by description, amount, or category

### Financial Analysis

- `get_monthly_credit_summary` - Monthly credit card usage breakdown
- `get_recurring_charges` - Detect subscriptions and recurring payments
- `analyze_merchant_spending` - Spending patterns and anomaly detection for specific merchants
- `get_spending_by_merchant` - Rank merchants by total spending
- `get_category_comparison` - Compare spending between categories across time periods
- `analyze_day_of_week_spending` - Analyze spending patterns by day of the week
- `get_available_categories` - List all transaction categories in your data

### Data Management

- `refresh_all_data` - Update data from all configured providers
- `refresh_service_data` - Update data from a specific provider
- `get_scrape_status` - Check last update times and scraping status

## Installation

### Prerequisites

- Node.js 18+
- Yarn
- Docker (optional)

### Local Setup

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Configure environment:

   ```bash
   cp env.example .env
   # Edit .env with your credentials
   ```

3. Build the project:

   ```bash
   yarn build
   ```

4. Run services:
   ```bash
   yarn dev
   ```

### Claude Desktop Integration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "israeli-bank-assistant": {
      "command": "node",
      "args": ["/path/to/il-bank-mcp/packages/mcp-server/dist/index.js"],
      "env": {
        "LEUMI_USERNAME": "your_username",
        "LEUMI_PASSWORD": "your_password"
      }
    }
  }
}
```

## Supported Providers

The system automatically detects providers based on configured credentials. See [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers#whats-here) for the full list of supported institutions.

## Docker Deployment

```bash
# Build and run
docker-compose up

# Or build manually
docker build -t israeli-bank-scraper .
docker run -d \
  -e LEUMI_USERNAME=your_username \
  -e LEUMI_PASSWORD=your_password \
  -v $(pwd)/data:/app/data \
  israeli-bank-scraper
```

## Development

```bash
# Run both services
yarn dev

# Run specific service
yarn workspace @il-bank-mcp/scraper dev
yarn workspace @il-bank-mcp/mcp-server dev
```

## License

MIT

## Acknowledgments

- [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers) - Core scraping functionality
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP framework
