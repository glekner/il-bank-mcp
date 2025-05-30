# Bank Leumi Financial Assistant

A TypeScript monorepo for scraping and analyzing Bank Leumi financial data, with plans for MCP (Model Context Protocol) integration.

## 🏗 Architecture

This project uses a monorepo structure with the following packages:

- **`packages/scraper`**: Core service for scraping Bank Leumi data using [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers)
- **`packages/query-server`**: REST API server for querying scraped financial data (with future MCP integration)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v9+)
- Bank Leumi credentials

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd bank-leumi-financial-assistant
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cd packages/scraper
cp .env.example .env
# Edit .env with your Bank Leumi credentials
```

### Development

Run all services in development mode:

```bash
npm run dev
```

Build all packages:

```bash
npm run build
```

## 📦 Packages

### Scraper (`packages/scraper`)

The scraper service is responsible for:

- Fetching transactions from Bank Leumi
- Processing and categorizing transactions
- Analyzing financial trends
- Breaking down income and expenses

See [packages/scraper/README.md](packages/scraper/README.md) for detailed documentation.

### Query Server (`packages/query-server`)

The query server provides:

- REST API for accessing scraped data
- Integration with the scraper service
- (Future) MCP protocol support for AI assistants

## 🔮 Future Features

### MCP Integration

We plan to add MCP (Model Context Protocol) support to enable:

- AI assistants to query financial data
- Natural language interactions with your bank data
- Automated financial insights and recommendations

## 🛡 Security

- **Never commit** `.env` files or `config.json` containing credentials
- All credentials are stored locally
- The scraper runs in headless mode for security

## 🧩 Tech Stack

- **TypeScript**: Type-safe development
- **Turbo**: Monorepo build system
- **israeli-bank-scrapers**: Bank scraping library
- **Express**: REST API framework
- **Winston**: Logging

## 📝 License

Private repository - All rights reserved
