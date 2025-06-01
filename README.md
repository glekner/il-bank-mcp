# Israeli Bank Scraper MCP Server

A Model Context Protocol (MCP) server that provides access to Israeli bank and credit card data through automated scraping. Supports major Israeli financial institutions based on configured credentials.

## Features

### Core Functionality

- Automated data scraping from Israeli banks and credit card companies
- Dynamic provider detection based on configured credentials
- Parallel scraping for multiple providers
- Local SQLite database for data persistence
- Docker support for containerized deployment

### Supported Providers

For a complete list of supported banks, credit cards, and other financial providers, see the [israeli-bank-scrapers documentation](https://github.com/eshaham/israeli-bank-scrapers?tab=readme-ov-file#whats-here).

### MCP Server Capabilities

- Server instructions for financial advisor context
- Pre-defined prompts for common financial analysis workflows
- Direct access to bank data and analysis functions
- Dynamic context incorporation in prompts

## Available MCP Tools

### Banking Tools

- **`get_transactions`**: Retrieve bank and credit card transactions for a specific time period
- **`get_financial_summary`**: Generate comprehensive financial analysis including trends, income, and expenses
- **`get_accounts`**: List all bank accounts and credit cards with current balances
- **`get_account_balance_history`**: Retrieve balance history for a specific account
- **`refresh_all_data`**: Force refresh data from all configured services
- **`refresh_service_data`**: Force refresh data from a specific service
- **`get_scrape_status`**: Check current scrape status and last scrape times

### Financial Analysis Tools

- **`get_monthly_credit_summary`**: Analyze credit card spending by month
- **`get_recurring_charges`**: Detect and analyze recurring transactions

## Available MCP Prompts

The server provides structured prompts for financial analysis:

- **`financial_advisor_context`**: Full financial advisor persona with comprehensive capabilities
- **`financial_review`**: Monthly comprehensive financial analysis
- **`budget_planning`**: Budget creation based on transaction data
- **`subscription_audit`**: Detection and analysis of recurring charges
- **`spending_optimization`**: Expense reduction recommendations
- **`fraud_detection`**: Suspicious transaction scanning
- **`tax_preparation`**: Tax-relevant transaction summaries
- **`emergency_fund_analysis`**: Savings adequacy assessment
- **`debt_optimization`**: Credit card usage analysis and debt reduction strategies

## Architecture

The project is structured as a monorepo with two main packages:

- **`packages/scraper`**: Backend service for scraping bank and credit card data
- **`packages/mcp-server`**: MCP server exposing the scraping functionality as tools

### How It Works

1. The scraper service connects to configured financial institutions using credentials
2. Transaction data is fetched and stored in a local SQLite database
3. The MCP server exposes this data through standardized tools
4. AI assistants can query and analyze the financial data using these tools

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn (for workspace management)
- Chrome/Chromium (installed automatically by puppeteer)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd il-bank-mcp
```

2. Install dependencies:

```bash
yarn install
```

3. Configure environment variables:

```bash
cp env.example .env
```

Edit `.env` and add credentials for the providers you use. The system automatically detects which providers to scrape based on provided credentials:

```env
# Bank Leumi
LEUMI_USERNAME=your_username
LEUMI_PASSWORD=your_password

# Visa Cal
VISA_CAL_USERNAME=your_username
VISA_CAL_PASSWORD=your_password

# Isracard
ISRACARD_ID=your_id
ISRACARD_CARD6DIGITS=last_6_digits
ISRACARD_PASSWORD=your_password

# See env.example for all available providers
```

4. Install Chrome for puppeteer:

```bash
cd packages/scraper
npx puppeteer browsers install chrome
```

### Claude Desktop Configuration

1. Build the project:

```bash
yarn build
```

2. Add to Claude Desktop configuration:

```json
{
  "mcpServers": {
    "israeli-bank-assistant": {
      "command": "node",
      "args": ["/path/to/il-bank-mcp/packages/mcp-server/dist/index.js"],
      "env": {
        "LEUMI_USERNAME": "your_username",
        "LEUMI_PASSWORD": "your_password",
        "VISA_CAL_USERNAME": "your_username",
        "VISA_CAL_PASSWORD": "your_password",
        "ISRACARD_ID": "your_id",
        "ISRACARD_CARD6DIGITS": "last_6_digits",
        "ISRACARD_PASSWORD": "your_password"
      }
    }
  }
}
```

## Docker Deployment

Build and run with Docker:

```bash
# Build the image
docker build -t israeli-bank-scraper .

# Run the container
docker run -d \
  -e LEUMI_USERNAME=your_username \
  -e LEUMI_PASSWORD=your_password \
  -e HAPOALIM_USERCODE=your_code \
  -e HAPOALIM_PASSWORD=your_password \
  -e VISA_CAL_USERNAME=your_username \
  -e VISA_CAL_PASSWORD=your_password \
  -e ISRACARD_ID=your_id \
  -e ISRACARD_CARD6DIGITS=last_6_digits \
  -e ISRACARD_PASSWORD=your_password \
  -v $(pwd)/data:/app/data \
  israeli-bank-scraper
```

## Development

### Project Structure

```
il-bank-mcp/
├── packages/
│   ├── scraper/
│   │   ├── src/
│   │   │   ├── scrapers/
│   │   │   ├── utils/
│   │   │   ├── services/
│   │   │   ├── database/
│   │   │   └── analyzers/
│   │   └── package.json
│   └── mcp-server/
│       ├── src/
│       └── package.json
├── docker-compose.yml
├── Dockerfile
└── package.json
```

### Running in Development

```bash
# Run both services in development mode
yarn dev

# Run only the scraper
yarn workspace @il-bank-mcp/scraper dev

# Run only the MCP server
yarn workspace @il-bank-mcp/mcp-server dev
```

## License

MIT License

## Acknowledgments

- [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers) - Core scraping functionality
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP framework
