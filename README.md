# Israeli Bank Scraper MCP Server

A powerful Model Context Protocol (MCP) server that provides financial data access through automated Israeli bank and credit card data scraping. Supports all major Israeli financial institutions dynamically based on your configuration.

## 🚀 What Makes This Special

This is a comprehensive financial data platform that:

- 🏦 **Scrapes data from ANY Israeli bank or credit card** - automatically detects configured providers
- 💳 **Analyzes monthly credit card spending** with detailed summaries across all your cards
- 🔄 **Detects recurring charges** to help identify subscriptions
- 💾 **Stores data locally** in a secure SQLite database
- 🎯 **Zero configuration** - just set credentials for the providers you use

## Features

### Core Banking Features

- 🏦 **Universal Support**: Works with all major Israeli banks and credit card companies
- 🔍 **Dynamic Provider Detection**: Automatically detects which providers you've configured
- 🔄 **Parallel Scraping**: Scrapes multiple providers simultaneously for efficiency
- 💾 **Local SQLite database** for secure data persistence
- 🐳 **Docker support** for easy deployment

### Supported Providers

#### Banks

- Bank Hapoalim
- Bank Leumi
- Discount Bank
- Mercantile Bank
- Mizrahi Bank
- Bank Otsar Hahayal
- Union Bank
- Beinleumi
- Yahav

#### Credit Cards

- Visa Cal
- Max (Leumi Card)
- Isracard
- American Express

#### Other Providers

- Massad
- Beyhad Bishvilha
- OneZero (Experimental)
- Behatsdaa
- Pagi

### MCP Server Capabilities

- 🤖 **Server Instructions**: Automatic context about the server's purpose and capabilities
- 📝 **Pre-defined Prompts**: Structured templates for common financial analysis workflows
- 🛠️ **Tools**: Direct access to real-time bank data and analysis functions
- 🔄 **Dynamic Context**: Prompts automatically incorporate current financial data

### Financial Data Tools

- 💳 **Monthly Credit Card Summaries** - Track spending across all your cards
- 🔄 **Recurring Charge Detection** - Identify subscriptions and regular payments

## Available MCP Tools

### Banking Tools

- **`get_transactions`**: Get bank and credit card transactions for a specific time period
- **`get_financial_summary`**: Get comprehensive financial analysis including trends, income, and expenses
- **`get_accounts`**: List all bank accounts and credit cards with balances
- **`get_account_balance_history`**: Get balance history for a specific account
- **`refresh_all_data`**: Force refresh data from all configured services
- **`refresh_service_data`**: Force refresh data from a specific service
- **`get_scrape_status`**: Get the current scrape status and last scrape times

### Financial Analysis Tools

- **`get_monthly_credit_summary`**: Detailed credit card spending analysis by month
- **`get_recurring_charges`**: Automatically detect and analyze subscriptions

## Available MCP Prompts

The server provides intelligent prompts that structure financial conversations:

- **`financial_advisor_context`**: Activates the full financial advisor persona with comprehensive capabilities
- **`financial_review`**: Monthly comprehensive financial analysis
- **`budget_planning`**: Personalized budget creation based on your data
- **`subscription_audit`**: Detect and analyze all recurring charges
- **`spending_optimization`**: Find ways to reduce expenses
- **`fraud_detection`**: Scan for suspicious transactions
- **`tax_preparation`**: Generate tax-relevant summaries
- **`emergency_fund_analysis`**: Assess savings adequacy
- **`debt_optimization`**: Credit card usage analysis and debt reduction

## How Instructions and Prompts Work Together

- **Server Instructions**: Automatically loaded when connecting to the MCP server, providing Claude with context about being a financial advisor
- **Prompts**: User-triggered templates for specific financial analysis tasks
- **Tools**: Direct access to fetch and analyze your bank data

The server instructions ensure Claude always understands its role as a financial advisor, while prompts provide structured workflows for specific tasks.

## Example Use Cases

### With AI Assistants

Ask your AI assistant questions like:

- "How much did I spend on each credit card this month?"
- "What subscriptions am I paying for?"
- "Show me my spending trends from the financial summary"
- "What's my current balance across all accounts?"
- "When was the last time my data was updated?"

### Using Prompts for Structured Analysis

The pre-defined prompts ensure comprehensive analysis:

```
# Trigger a complete financial review
/financial_review month=2024-11

# Audit your subscriptions
/subscription_audit

# Plan a budget with savings goals
/budget_planning savings_goal_percentage=25
```

### Automation Ideas

- Set up monthly financial review summaries
- Get alerts when new recurring charges are detected
- Track spending patterns over time

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
cd il-bank-mcp
```

2. Install dependencies:

```bash
yarn install
```

3. Set up environment variables:

```bash
cp env.example .env
```

Edit `.env` and add credentials for the providers you use. The system will automatically detect which providers to scrape based on the credentials you provide:

```env
# Example: Configure only the providers you use

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

# See env.example for all available providers and their required fields
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
      "args": ["/path/to/il-bank-mcp/packages/mcp-server/dist/index.js"],
      "env": {
        // Add only the providers you use
        "LEUMI_USERNAME": "your_username",
        "LEUMI_PASSWORD": "your_password",
        "VISA_CAL_USERNAME": "your_username",
        "VISA_CAL_PASSWORD": "your_password",
        "ISRACARD_ID": "your_id",
        "ISRACARD_CARD6DIGITS": "last_6_digits",
        "ISRACARD_PASSWORD": "your_password"
        // Add more providers as needed
      }
    }
  }
}
```

## Docker Support

Build and run with Docker:

```bash
# Build the image
docker build -t israeli-bank-scraper .

# Run the container (example with multiple providers)
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

## Dynamic Provider Configuration

The system automatically detects which providers to use based on environment variables. Each provider has a specific pattern:

### Banks

- **Bank Hapoalim**: `HAPOALIM_USERCODE`, `HAPOALIM_PASSWORD`
- **Bank Leumi**: `LEUMI_USERNAME`, `LEUMI_PASSWORD`
- **Discount**: `DISCOUNT_ID`, `DISCOUNT_PASSWORD`, `DISCOUNT_NUM`
- **Mizrahi**: `MIZRAHI_USERNAME`, `MIZRAHI_PASSWORD`
- And more...

### Credit Cards

- **Visa Cal**: `VISA_CAL_USERNAME`, `VISA_CAL_PASSWORD`
- **Max**: `MAX_USERNAME`, `MAX_PASSWORD`
- **Isracard**: `ISRACARD_ID`, `ISRACARD_CARD6DIGITS`, `ISRACARD_PASSWORD`
- **Amex**: `AMEX_USERNAME`, `AMEX_CARD6DIGITS`, `AMEX_PASSWORD`

See `env.example` for the complete list of supported providers and their required credentials.

## Development

### Project Structure

```
il-bank-mcp/
├── packages/
│   ├── scraper/             # Bank scraping service
│   │   ├── src/
│   │   │   ├── scrapers/    # Generic scraper implementation
│   │   │   ├── utils/       # Provider detection & configuration
│   │   │   ├── services/    # Business logic
│   │   │   ├── database/    # Data persistence
│   │   │   └── analyzers/   # Financial analysis
│   │   └── package.json
│   └── mcp-server/          # MCP server
│       ├── src/
│       └── package.json
├── docker-compose.yml
├── Dockerfile
└── package.json             # Root workspace config
```

### Adding New Providers

The system uses the [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers) library. When new providers are added to that library, you can easily add support by:

1. Adding the provider configuration to `PROVIDER_CONFIG` in `packages/scraper/src/utils/providers.ts`
2. Adding appropriate TypeScript types if the provider needs special credentials
3. Updating the documentation

The system will automatically detect and use the new provider when its environment variables are set.

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

### Provider Detection

To see which providers are detected:

- Check the logs when starting the scraper
- The system will log: "Detected configured provider: [Provider Name]"

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

### Scraping Configuration

```bash
# Number of months to scrape backward (default: 3)
SCRAPE_MONTHS_BACK=3

# Cron schedule for automatic scraping (default: every 6 hours)
SCRAPE_CRON_SCHEDULE=0 */6 * * *
```

## Security Notes

- Credentials are stored in environment variables or a local config file
- The SQLite database is stored locally in the `data/` directory
- Never commit credentials to version control
- Use strong, unique passwords for your bank accounts
- The system only scrapes providers you explicitly configure

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
