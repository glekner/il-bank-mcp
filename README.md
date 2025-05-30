# Bank Leumi MCP Scraper

A TypeScript-based financial data scraper for Bank Leumi (Israel) with Model Context Protocol (MCP) server integration. This project enables AI assistants to access and analyze your bank data through a secure, local MCP interface.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Bank Leumi API │────▶│ Scraper Service │────▶│ SQLite Database │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │   MCP Server    │
                                                 └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  AI Assistant   │
                                                 └─────────────────┘
```

## Features

- **Automated Bank Scraping**: Periodically scrapes transaction data from Bank Leumi
- **Data Persistence**: Stores historical data in a local SQLite database
- **Financial Analysis**: Built-in analyzers for income, expenses, and trends
- **MCP Integration**: Exposes bank data through MCP tools for AI assistants
- **CLI Tools**: Manual scraping and data inspection commands

## Prerequisites

- Node.js 18+
- Yarn 4.x
- Bank Leumi online banking credentials

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/mcp-scraper.git
cd mcp-scraper
```

2. Install dependencies:

```bash
yarn install
```

3. Configure environment variables:

```bash
cp env.example .env
# Edit .env with your Bank Leumi credentials
```

4. Build the project:

```bash
yarn build
```

## Configuration

Create a `.env` file with the following variables:

```env
# Bank Leumi Credentials (required)
BANK_USERNAME=your_username
BANK_PASSWORD=your_password

# Scraping Configuration
SCRAPE_MONTHS_BACK=3              # How many months of data to fetch
SCRAPE_CRON_SCHEDULE=0 */6 * * * # Cron schedule (default: every 6 hours)

# Database Configuration
DATABASE_PATH=./data/bank-data.db # SQLite database location

# Logging
LOG_LEVEL=info                    # winston log level
```

## Usage

### 1. Initial Setup & First Scrape

```bash
# Create data directory
mkdir -p data

# Run initial scrape
yarn workspace @bank-assistant/scraper scrape scrape
```

### 2. Start Scheduled Scraper

Run the scheduler to automatically scrape data periodically:

```bash
yarn workspace @bank-assistant/scraper scrape:scheduled
```

### 3. CLI Commands

```bash
# Force a fresh scrape
yarn workspace @bank-assistant/scraper scrape scrape

# View financial summary
yarn workspace @bank-assistant/scraper scrape summary

# List accounts
yarn workspace @bank-assistant/scraper scrape accounts
```

### 4. MCP Server Integration

The MCP server can be integrated with AI assistants like Claude Desktop.

#### Available MCP Tools:

- **get_transactions**: Retrieve transactions for a date range
- **get_financial_summary**: Get comprehensive financial analysis
- **get_accounts**: List all accounts with balances
- **get_account_balance_history**: View balance trends
- **refresh_bank_data**: Force a fresh data scrape

#### Claude Desktop Configuration

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "bank-leumi": {
      "command": "node",
      "args": ["/path/to/mcp-scraper/packages/mcp-server/dist/index.js"],
      "env": {
        "BANK_USERNAME": "your_username",
        "BANK_PASSWORD": "your_password",
        "DATABASE_PATH": "/path/to/data/bank-data.db"
      }
    }
  }
}
```

## Project Structure

```
mcp-scraper/
├── packages/
│   ├── scraper/               # Core scraping functionality
│   │   ├── src/
│   │   │   ├── analyzers/     # Financial analysis logic
│   │   │   ├── database/      # Data persistence layer
│   │   │   ├── processors/    # Transaction processing
│   │   │   ├── services/      # Business logic
│   │   │   └── utils/         # Utilities
│   │   └── package.json
│   └── mcp-server/            # MCP server implementation
│       ├── src/
│       │   └── index.ts       # MCP server entry point
│       └── package.json
├── data/                      # SQLite database (gitignored)
├── .env                       # Environment variables (gitignored)
└── package.json              # Root package configuration
```

## Security Considerations

- **Credentials**: Never commit your `.env` file. Bank credentials are stored locally only.
- **Data Storage**: All financial data is stored locally in SQLite - no cloud services involved.
- **MCP Access**: The MCP server runs locally and doesn't expose any network endpoints.

## Development

```bash
# Run in development mode
yarn dev

# Run linting
yarn lint

# Format code
yarn format
```

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**: Run `yarn install` to ensure all dependencies are installed.

2. **Scraping fails**:

   - Verify your Bank Leumi credentials
   - Check if Bank Leumi's website structure has changed
   - Look at logs for detailed error messages

3. **Database errors**:

   - Ensure the data directory exists
   - Check file permissions

4. **MCP connection issues**:
   - Verify the MCP server path in your AI assistant configuration
   - Check that environment variables are properly set

## License

This project is for personal use only. Use responsibly and in accordance with Bank Leumi's terms of service.

## Disclaimer

This tool interacts with your personal banking data. Always:

- Keep your credentials secure
- Monitor the scraping activity
- Use on trusted devices only
- Comply with your bank's terms of service
