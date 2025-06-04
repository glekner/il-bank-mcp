<div align="center">
<h1>IL Bank MCP 🐷💸</h1>
</div>

## What is IL Bank MCP?

IL Bank MCP is a finance assistant that brings your Israeli bank data to any AI assistant. It combines a headless scraper (powered by [`israeli-bank-scrapers`](https://github.com/eshaham/israeli-bank-scrapers)) with an MCP server, letting LLMs analyze your transactions, track spending patterns, and provide financial insights.

### ✨ Demo

![Raycast MCP Server running](https://raw.githubusercontent.com/glekner/il-bank-mcp/refs/heads/master/public/raycast-examples/summary.jpeg)

### How to use IL Bank MCP?

Run it with Docker Compose for the quickest setup:

```bash
LEUMI_USERNAME=my_user LEUMI_PASSWORD=my_pass \
  docker compose up -d
```

Then add it to your AI assistant. For Raycast, use their MCP extension with:

```
docker compose -f /path/to/il-bank-mcp/docker-compose.yml run --rm -i mcp-server
```

For Claude Desktop, add to `~/.claude/config.jsonc`:

```json
{
  "mcpServers": {
    "israeli-bank-assistant": {
      "command": "docker",
      "args": [
        "compose",
        "-f",
        "/path/to/il-bank-mcp/docker-compose.yml",
        "run",
        "--rm",
        "-i",
        "mcp-server"
      ],
      "env": {
        "LEUMI_USERNAME": "your_username",
        "LEUMI_PASSWORD": "your_password"
      }
    }
  }
}
```

See [env.example](https://github.com/glekner/il-bank-mcp/blob/master/env.example) for all credential and configuration options.

### Key features of IL Bank MCP?

- **Smart Analysis**: Get spending breakdowns, detect recurring charges, and track merchant patterns
- **Local & Secure**: All data stays in a local SQLite database
- **Multi-Provider**: Works with most Israeli banks and credit cards
- **Real-time Updates**: Refresh data on-demand from any provider
- **Automated Sync**: By default, scrapes your bank data every 6 hours to keep everything current

### What tools does IL Bank MCP provide?

**Data Retrieval**

- `get_transactions` - Fetch transactions for any time period
- `get_financial_summary` - Income, expenses, and trends at a glance
- `search_transactions` - Find specific transactions by amount or description

**Financial Analysis**

- `get_monthly_credit_summary` - Credit card usage breakdown
- `get_recurring_charges` - Find subscriptions and repeated payments
- `analyze_merchant_spending` - Spot unusual spending patterns

**Data Management**

- `refresh_all_data` - Update from all connected accounts
- `get_scrape_status` - Check when data was last updated

### Use cases of IL Bank MCP?

- Ask "How much did I spend on groceries last month?"
- Track subscription creep with "Show me all my recurring charges"
- Prepare taxes with "Get all my business expenses for 2024"
- Budget planning with "Compare my spending this month vs last month"

### What questions can I ask?

Here are some powerful questions to get actionable insights from your financial data:

**Spending Analysis**

- "What's my burn rate this month compared to last month?" - See if you're spending more or less than usual
- "How much did I spend on food delivery vs groceries this month?" - The eternal question of cooking vs ordering in
- "What's my average daily spending on weekdays vs weekends?" - Understand your spending patterns

**Subscription Management**

- "Show me all subscriptions I'm paying for and their total monthly cost" - Find those forgotten recurring charges
- "Compare my utility bills month-over-month for the last year" - Spot unusual spikes or negotiation opportunities

**Savings & Budget Tracking**

- "What percentage of my income am I saving each month for the last 6 months?" - Track your savings goals
- "What's my projected balance at the end of the month based on current spending patterns?" - Know if you'll make it to payday

**Anomaly Detection**

- "Alert me when any transaction is 50% higher than my average for that merchant" - Catch errors or potential fraud
- "Show me all transactions over ₪1,000 in the last 30 days with their categories" - Quick review of major expenses
- "Which category increased the most in spending over the last 3 months?" - Identify lifestyle creep

### FAQ from IL Bank MCP?

**Which banks are supported?**  
Any bank supported by [`israeli-bank-scrapers`](https://github.com/eshaham/israeli-bank-scrapers#whats-here) - includes Leumi, Hapoalim, Discount, and most credit card companies.

**Is my data secure?**  
Yes. Everything runs locally on your machine. No data leaves your computer.

**Can I use it with local LLMs?**  
Absolutely. Works great with Ollama through Raycast for a completely offline setup.

**What if scraping fails?**  
Check the logs in `./logs`. Most issues are login-related - verify your credentials match exactly what you use on the bank's website.

## Contributing

Early days - contributions welcome! 🙏

## License

MIT

## Acknowledgments

- [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers) - Core scraping engine
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP framework
