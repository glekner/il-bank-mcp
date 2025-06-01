# Israeli Bank MCP Server

A Model Context Protocol (MCP) server that exposes Israeli bank data scraping functionality as tools for AI assistants.

## Architecture

The server follows a modular architecture with clear separation of concerns:

```
packages/mcp-server/
├── src/
│   ├── handlers/         # Tool handlers with business logic
│   │   ├── base.ts      # Base handler with common functionality
│   │   ├── transactionHandler.ts
│   │   ├── summaryHandler.ts
│   │   ├── accountHandler.ts
│   │   └── refreshHandler.ts
│   ├── utils/
│   │   └── logger.ts    # Logging utility
│   ├── index.ts         # Main server entry point
│   ├── tools.ts         # Tool definitions
│   └── types.ts         # TypeScript type definitions
└── README.md
```

## Available Tools

### 1. `get_transactions`

Retrieve bank and credit card transactions for a specific time period.

**Parameters:**

- `startDate` (optional): Start date in ISO format (YYYY-MM-DD)
- `endDate` (optional): End date in ISO format (YYYY-MM-DD)
- `accountId` (optional): Filter by specific account ID

### 2. `get_financial_summary`

Get a comprehensive financial summary including trends, income, and expenses.

**Parameters:**

- `startDate` (optional): Start date in ISO format (YYYY-MM-DD)
- `endDate` (optional): End date in ISO format (YYYY-MM-DD)

### 3. `get_accounts`

Get all bank accounts and credit cards with current balances.

**Parameters:** None

### 4. `get_account_balance_history`

Get balance history for a specific account.

**Parameters:**

- `accountId` (required): Account ID (e.g., 'leumi-123456')
- `days` (optional): Number of days to look back (default: 30)

### 5. `refresh_all_data`

Force a fresh scrape of all bank and credit card data.

**Parameters:** None

### 6. `refresh_service_data`

Force a fresh scrape of data from a specific service.

**Parameters:**

- `service` (required): Service to refresh ('leumi', 'visaCal', 'max', etc...)

### 7. `get_scrape_status`

Get information about the scraping status and last scrape details.

**Parameters:** None

**Returns:**

- `isRunning`: Whether a scrape is currently in progress
- `lastScrapeAt`: Timestamp of the last completed scrape
- `status`: Status of the last scrape ('completed' or 'failed')
- `duration`: Duration of the last scrape in seconds
- `transactionsCount`: Number of transactions from the last scrape
- `accountsCount`: Number of accounts from the last scrape
- `error`: Error message if the last scrape failed

## Available Prompts

The MCP server provides pre-defined prompts that help structure interactions with the financial assistant. These prompts ensure consistent, high-quality financial analysis.

### System Prompt

The system prompt defines the Israeli Bank Assistant's role, capabilities, and approach to financial advisory. It establishes:

- Professional yet approachable communication style
- Privacy and security guidelines
- Proactive financial analysis approach
- Focus on actionable, personalized advice

### User Prompts

#### 1. `financial_review`

Comprehensive monthly financial review and recommendations.

**Arguments:**

- `month` (optional): Month to review in YYYY-MM format

**Provides:**

- Overall financial summary and health score
- Income vs expenses analysis
- Spending trends and patterns
- Comparison with previous periods
- Specific recommendations for improvement

#### 2. `budget_planning`

Create a personalized budget plan based on income and spending patterns.

**Arguments:**

- `savings_goal_percentage` (optional): Desired savings percentage (0-100)
- `focus_categories` (optional): Comma-separated spending categories to optimize

**Provides:**

- Recommended budget allocation by category
- Specific areas for spending reduction
- Actionable steps to achieve savings goals
- Implementation timeline and milestones

#### 3. `subscription_audit`

Comprehensive audit of all recurring charges and subscriptions.

**Arguments:** None

**Provides:**

- List of all detected recurring charges
- Categorization (essential vs non-essential)
- Identification of unused or duplicate services
- Total monthly/annual cost calculations
- Optimization opportunities

#### 4. `spending_optimization`

Analyze spending patterns and suggest optimization strategies.

**Arguments:**

- `time_period_days` (optional): Number of days to analyze (default: 30)

**Provides:**

- Top spending categories and patterns
- Cost reduction opportunities
- Alternative merchants/services for better value
- Potential monthly savings calculations

#### 5. `fraud_detection`

Scan for suspicious transactions and potential fraud.

**Arguments:**

- `sensitivity` (optional): Detection sensitivity - low, medium, or high (default: medium)

**Provides:**

- Unusual transaction patterns identification
- Suspicious merchant flagging
- Duplicate charge detection
- Geographic anomaly analysis
- Action steps for concerns

#### 6. `tax_preparation`

Generate tax-relevant summaries and identify deduction opportunities.

**Arguments:**

- `tax_year` (optional): Tax year to prepare for (YYYY format)

**Provides:**

- Transaction categorization by tax relevance
- Business expense deduction identification
- Income source summaries
- Year-end tax optimization strategies

#### 7. `emergency_fund_analysis`

Analyze emergency fund adequacy and provide savings recommendations.

**Arguments:** None

**Provides:**

- Monthly essential expense calculations
- Recommended emergency fund size
- Savings rate analysis
- Month-by-month savings plan
- Automatic savings strategies

#### 8. `debt_optimization`

Analyze credit card usage and create debt reduction strategies.

**Arguments:** None

**Provides:**

- Credit utilization analysis
- Debt prioritization strategies
- Balance transfer opportunities
- Debt snowball vs avalanche comparison
- Credit score improvement tactics

## Development

### Building

```bash
npm run build
```

### Running

```bash
node dist/index.js
```

### Environment Variables

Configure your environment variables in the root `.env` file:

```env
# Bank credentials (loaded by scraper service)
LEUMI_USERNAME=your_username
LEUMI_PASSWORD=your_password
# ... other credentials
```

## Integration

To use this MCP server with Claude Desktop or other MCP clients, add it to your configuration:

```json
{
  "mcpServers": {
    "israeli-bank-assistant": {
      "command": "node",
      "args": ["/path/to/packages/mcp-server/dist/index.js"]
    }
  }
}
```

## Error Handling

The server implements comprehensive error handling:

- All errors are caught and returned as structured responses
- Automatic retries when data is empty (triggers scraping)
- Graceful shutdown on SIGINT/SIGTERM signals

## Scrape Status Notifications

When a scrape is currently in progress, tools that fetch data will include a notification message:

- `"A scrape is currently in progress..."` will be added to the response
- This helps AI assistants inform users that fresher data may be available soon
- Use the `get_scrape_status` tool to get detailed information about the current scraping state

## Logging

Uses structured JSON logging to stderr (standard for MCP servers):

- `info`: General information
- `warn`: Warnings
- `error`: Errors
- `debug`: Debug information (when DEBUG env var is set)
