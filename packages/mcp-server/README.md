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

- `service` (required): Service to refresh ('leumi', 'visaCal', or 'max')

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
