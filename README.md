# Israeli Bank Scraper MCP Server 🐷💸

Transform your Israeli bank and credit-card data into actionable insights. This repository bundles a headless scraper (powered by [`israeli-bank-scrapers`](https://github.com/eshaham/israeli-bank-scrapers)) and an MCP (Model Context Protocol) server so any LLM-powered assistant can reason over your finances.

---

## ✨ Demo

![Raycast MCP Server running](docs/screenshots/raycast-quickstart.png)

_Talk to your finances directly from Raycast AI._

---

## Quick Start

### 1. Raycast AI (MCP)

Raycast ships with first-class MCP support — see the [manual](https://manual.raycast.com/ai). Spin up the server locally and **@-mention** it from any Raycast AI chat.

```bash
# run in the project root
# replace /path/to with your actual path if needed

docker compose -f /path/to/il-bank-mcp/docker-compose.yml run --rm -i mcp-server
```

The server listens on `http://localhost:3000` and Raycast will auto-discover all tools.

### 2. Claude Desktop _(optional)_

Add the server to Claude Desktop via `~/.claude/config.jsonc`:

```jsonc
{
  "mcpServers": {
    "israeli-bank-assistant": {
      "command": "node",
      "args": ["./packages/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_PATH": "./data/db.sqlite",
        "LEUMI_USERNAME": "your_username",
        "LEUMI_PASSWORD": "your_password",
      },
    },
  },
}
```

---

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

---

## Features

- Automated scraping from Israeli banks & credit-cards
- Local SQLite database for offline persistence
- Parallel scraping for multiple providers
- Dynamic provider detection based on credentials
- Docker support for zero-setup deployment

---

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
