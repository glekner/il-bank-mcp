# `il-bank-mcp` 🐷💸

Finance Assistant for Israeli Banks using MCP. Transform your bank and credit-card data into actionable insights. This repository bundles a headless scraper (powered by [`israeli-bank-scrapers`](https://github.com/eshaham/israeli-bank-scrapers)) and an MCP (Model Context Protocol) server so any LLM-powered assistant can reason over your finances.

## ✨ Demo (Using Raycast)

![Raycast MCP Server running](https://raw.githubusercontent.com/glekner/il-bank-mcp/refs/heads/master/public/raycast-examples/summary.jpeg)

## Quick Start

### Raycast AI (MCP)

Raycast ships with first-class MCP support — see the [manual](https://manual.raycast.com/ai). Spin up the server locally and **@-mention** it from any Raycast AI chat.
You can even use [Ollama](https://ollama.com/) locally with Raycast for a totally free experience.

1. Install the MCP using the `Install MCP` command (Add env vars for your providers, take a look at [env.example](https://github.com/glekner/il-bank-mcp/blob/master/env.example) for examples
   <img width="886" alt="image" src="https://github.com/user-attachments/assets/d2de2cbb-d96e-4a06-a575-3b6bc3837820" />

```bash
// arguments should be
compose -f /path/to/il-bank-mcp/docker-compose.yml run --rm -i mcp-server
```

### 2. Claude Desktop _(optional)_

Add the server to Claude Desktop via `~/.claude/config.jsonc`:

```jsonc
{
  "mcpServers": {
    "israeli-bank-assistant": {
      "command": "docker",
      "args": [
        "compose -f /path/to/il-bank-mcp/docker-compose.yml run --rm -i mcp-server",
      ],
      "env": {
        "LEUMI_USERNAME": "your_username",
        "LEUMI_PASSWORD": "your_password",
      },
    },
  },
}
```

## Available Tools

### Data Retrieval

- `get_transactions` — Retrieve transactions for a specific time period
- `get_financial_summary` — Aggregated income, expenses & trends
- `get_accounts` — List all accounts with current balances
- `get_account_balance_history` — Balance changes over time
- `search_transactions` — Search by description, amount or category

### Financial Analysis

- `get_monthly_credit_summary` — Monthly credit-card usage breakdown
- `get_recurring_charges` — Detect subscriptions & recurring payments
- `analyze_merchant_spending` — Spending patterns & anomaly detection per merchant
- `get_spending_by_merchant` — Rank merchants by total spending
- `get_category_comparison` — Compare category spending across periods
- `analyze_day_of_week_spending` — Spending habits by weekday
- `get_available_categories` — List all categories present in your data

### Data Management

- `refresh_all_data` — Update data from all providers
- `refresh_service_data` — Update data from a single provider
- `get_scrape_status` — Last update times & scraping status
- `get_metadata` — Database statistics & available ranges

## Features

- Automated scraping from Israeli banks & credit-cards
- Local SQLite database for offline persistence and security
- Parallel scraping for multiple providers
- Dynamic provider detection based on credentials

## Docker Compose (Full Stack)

Prefer a one-liner? Start the scraper **and** database in the background:

```bash
LEUMI_USERNAME=my_user LEUMI_PASSWORD=my_pass \
  docker compose up -d
```

Logs will stream to `./logs` and the database lives in `./data`.

---

## Supported Providers

The system autodetects providers by your supplied credentials. See the [`israeli-bank-scrapers` list](https://github.com/eshaham/israeli-bank-scrapers#whats-here) for all supported institutions.

---

## Contributing

Early-stage project — PRs and bug reports are welcome! 🙏

---

## License

MIT

## Acknowledgments

- [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers) - Core scraping functionality
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP framework
