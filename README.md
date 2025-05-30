# Israeli Bank Scraper MCP Server

A Model Context Protocol (MCP) server that provides bank data scraping tools for Israeli banks and credit cards. Currently supports Bank Leumi, Visa Cal, and Max (formerly Leumi Card).

## Features

- 🏦 Multi-service support: Bank Leumi, Visa Cal, and Max credit cards
- 🔄 Automated bank and credit card data scraping using [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers)
- 📊 Financial analysis including trends, income/expense categorization
- 💾 Local SQLite database for data persistence
- 🔧 MCP server exposing banking tools for AI assistants
- 🐳 Docker support for easy deployment

## Architecture

The project is organized as a monorepo with two main packages:

- **`packages/scraper`**: Backend service for scraping bank and credit card data
- **`packages/mcp-server`**: MCP server exposing the scraping functionality as tools

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn (for workspace management)
- Chrome/Chromium (will be installed automatically by puppeteer)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd mcp-scraper
```

2. Install dependencies:

```bash
yarn install
```

3. Set up environment variables:

```bash
cp env.example .env
```

Edit `.env` and add your credentials:

```env
# Bank Leumi Credentials
BANK_LEUMI_USERNAME=your_username_here
BANK_LEUMI_PASSWORD=your_password_here

# Visa Cal Credentials
VISA_CAL_USERNAME=your_username_here
VISA_CAL_PASSWORD=your_password_here

# Max (Leumi Card) Credentials
MAX_USERNAME=your_username_here
MAX_PASSWORD=your_password_here

# Scraping Configuration
SCRAPE_MONTHS_BACK=3
SCRAPE_CRON_SCHEDULE=0 */6 * * *
```

4. Install Chrome for puppeteer:

```bash
cd packages/scraper
npx puppeteer browsers install chrome
```

### Running the Services

#### Development Mode

```bash
# Run both scraper and MCP server in development mode
yarn dev

# Run only the scraper
yarn workspace @bank-assistant/scraper dev

# Run only the MCP server
yarn workspace @bank-assistant/mcp-server dev
```

#### Production Mode

```bash
# Build all packages
yarn build

# Run the MCP server
yarn workspace @bank-assistant/mcp-server start
```

### Using with Claude Desktop

1. Build the project:

```bash
yarn build
```

2. Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "israeli-bank-assistant": {
      "command": "node",
      "args": ["/path/to/mcp-scraper/packages/mcp-server/dist/index.js"],
      "env": {
        "BANK_LEUMI_USERNAME": "your_username",
        "BANK_LEUMI_PASSWORD": "your_password",
        "VISA_CAL_USERNAME": "your_username",
        "VISA_CAL_PASSWORD": "your_password",
        "MAX_USERNAME": "your_username",
        "MAX_PASSWORD": "your_password"
      }
    }
  }
}
```

## Available MCP Tools

- **`get_transactions`**: Get bank and credit card transactions for a specific time period
- **`get_financial_summary`**: Get comprehensive financial analysis including trends, income, and expenses
- **`get_accounts`**: List all bank accounts and credit cards with balances
- **`get_account_balance_history`**: Get balance history for a specific account
- **`refresh_all_data`**: Force refresh data from all configured services
- **`refresh_service_data`**: Force refresh data from a specific service (leumi, visaCal, or max)

## Docker Support

Build and run with Docker:

```bash
# Build the image
docker build -t israeli-bank-scraper .

# Run the container
docker run -d \
  -e BANK_LEUMI_USERNAME=your_username \
  -e BANK_LEUMI_PASSWORD=your_password \
  -e VISA_CAL_USERNAME=your_username \
  -e VISA_CAL_PASSWORD=your_password \
  -e MAX_USERNAME=your_username \
  -e MAX_PASSWORD=your_password \
  -v $(pwd)/data:/app/data \
  israeli-bank-scraper
```

## Development

### Project Structure

```
mcp-scraper/
├── packages/
│   ├── scraper/          # Bank scraping service
│   │   ├── src/
│   │   │   ├── scrapers/  # Individual service scrapers
│   │   │   ├── services/  # Business logic
│   │   │   ├── database/  # Data persistence
│   │   │   └── utils/     # Utilities
│   │   └── package.json
│   └── mcp-server/       # MCP server
│       ├── src/
│       └── package.json
├── docker-compose.yml
├── Dockerfile
└── package.json          # Root workspace config
```

### Adding New Services

To add support for a new bank or credit card:

1. Create a new scraper in `packages/scraper/src/scrapers/`
2. Implement the `BaseScraper` interface
3. Add the service type to `types.ts`
4. Update the credentials loader
5. Add environment variables to `.env.example`

## Troubleshooting

### Chrome/Puppeteer Issues

If you encounter Chrome-related errors:

```bash
# Install Chrome manually
cd packages/scraper
npx puppeteer browsers install chrome

# Or use system Chrome by setting PUPPETEER_EXECUTABLE_PATH
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

### Permission Issues

If running in Docker, ensure the data directory has proper permissions:

```bash
chmod -R 777 ./data
```

## Security Notes

- Credentials are stored in environment variables or a local config file
- The SQLite database is stored locally in the `data/` directory
- Never commit credentials to version control
- Use strong, unique passwords for your bank accounts

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers) for the core scraping functionality
- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP framework
