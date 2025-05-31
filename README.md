# Israeli Bank Scraper MCP Server

A powerful Model Context Protocol (MCP) server that provides intelligent financial advisory tools powered by automated Israeli bank and credit card data scraping.

## 🚀 What Makes This Special

This isn't just another transaction scraper. It's a comprehensive financial intelligence platform that:

- 🧠 **Analyzes your spending patterns** to provide actionable insights
- 💰 **Detects recurring charges** and helps identify unused subscriptions
- 📊 **Provides financial health scoring** with personalized improvement recommendations
- 🎯 **Creates custom budgets** based on your income and spending habits
- 🔔 **Alerts you to anomalies** and potential fraudulent transactions
- 📈 **Forecasts cash flow** to help you plan ahead

## Features

### Core Banking Features

- 🏦 Multi-service support: Bank Leumi, Visa Cal, and Max (formerly Leumi Card)
- 🔄 Automated bank and credit card data scraping using [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers)
- 💾 Local SQLite database for secure data persistence
- 🐳 Docker support for easy deployment

### Advanced Financial Advisory Tools

- 💳 **Monthly Credit Card Summaries** - Track spending across all your cards
- 🔄 **Recurring Charge Detection** - Never miss a subscription again
- 💡 **AI-Powered Spending Insights** - Get personalized financial advice
- 📊 **Cash Flow Analysis & Forecasting** - Predict future balances
- 📈 **Period Comparison** - Compare spending across different time periods
- 🏪 **Merchant Analysis** - Identify your top spending destinations
- 💰 **Budget Recommendations** - Get personalized budget plans
- 🚨 **Anomaly Detection** - Catch unusual transactions early
- 📋 **Tax Summary Generation** - Simplify tax preparation
- ❤️ **Financial Health Score** - Get a comprehensive wellness check

[View detailed documentation for financial advisory tools →](docs/financial-advisory-tools.md)

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

# Query Configuration (optional)
# Comma-separated list of account IDs to ignore when querying (does not affect scraping)
# Example: IGNORED_ACCOUNT_IDS=account1,account2,account3
IGNORED_ACCOUNT_IDS=
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

### Basic Banking Tools

- **`get_transactions`**: Get bank and credit card transactions for a specific time period
- **`get_financial_summary`**: Get comprehensive financial analysis including trends, income, and expenses
- **`get_accounts`**: List all bank accounts and credit cards with balances
- **`get_account_balance_history`**: Get balance history for a specific account
- **`refresh_all_data`**: Force refresh data from all configured services
- **`refresh_service_data`**: Force refresh data from a specific service

### Financial Advisory Tools

- **`get_monthly_credit_summary`**: Detailed credit card spending analysis by month
- **`get_recurring_charges`**: Automatically detect and analyze subscriptions
- **`get_spending_insights`**: AI-powered insights about spending patterns
- **`get_cashflow_analysis`**: Analyze and forecast cash flow patterns
- **`compare_spending_periods`**: Compare spending between time periods
- **`get_merchant_analysis`**: Analyze spending by merchant
- **`get_budget_recommendations`**: Get personalized budget recommendations
- **`get_anomaly_alerts`**: Detect unusual transactions and potential fraud
- **`get_tax_summary`**: Generate tax-relevant transaction summaries
- **`get_financial_health_score`**: Comprehensive financial wellness assessment

## Example Use Cases

### With AI Assistants

Ask your AI assistant questions like:

- "How much did I spend on each credit card this month?"
- "What subscriptions am I paying for and can I cancel any?"
- "Show me my spending trends and give me advice on how to save money"
- "Alert me to any suspicious transactions in the last week"
- "Help me create a budget that lets me save 30% of my income"
- "Compare my spending this month vs last month"
- "What's my financial health score and how can I improve it?"

### Automation Ideas

- Set up monthly financial review summaries
- Get alerts when new recurring charges are detected
- Weekly spending anomaly reports
- Automated budget vs actual spending comparisons

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

## Configuration Options

### Ignoring Accounts in Queries

You can configure the system to ignore specific bank accounts when querying data (this does not affect the scraping process itself). This is useful when you want to exclude certain accounts from analysis or reports.

Set the `IGNORED_ACCOUNT_IDS` environment variable with a comma-separated list of account IDs:

```bash
IGNORED_ACCOUNT_IDS=account123,account456,account789
```

When accounts are ignored:

- They won't appear in `get_accounts` results
- Their transactions won't be included in `get_transactions` queries
- Balance history requests for ignored accounts will return empty results
- All financial analysis tools will automatically exclude these accounts

To find account IDs, first run the scraper without any ignored accounts and check the account IDs in the results.

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
