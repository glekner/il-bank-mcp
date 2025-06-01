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

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers) for the core scraping functionality
- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP framework
