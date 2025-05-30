# Bank Leumi Scraper

A TypeScript service for scraping financial data from Bank Leumi using the israeli-bank-scrapers library.

## Features

- Scrapes transactions from Bank Leumi accounts
- Processes and categorizes transactions
- Analyzes financial trends
- Breaks down income and expenses by category

## Setup

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Edit `.env` with your Bank Leumi credentials:

```
BANK_LEUMI_USERNAME=your_username
BANK_LEUMI_PASSWORD=your_password
SCRAPE_MONTHS_BACK=3
```

3. Install dependencies:

```bash
npm install
```

## Usage

### Development Mode

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## Data Structure

The scraper returns data in the following structure:

- **Transactions**: Processed transaction records with categorization
- **Trends**: Monthly financial trends showing income, expenses, and balance
- **Income**: Income breakdown by category
- **Expenses**: Expense breakdown by category

## Security Notes

- Never commit your `.env` file or `config.json` containing credentials
- The scraper runs in headless mode by default
- Credentials can be provided via environment variables or config.json

## API

### Main Function

```typescript
import { scrapeAndAnalyzeData } from "scraper";

const result = await scrapeAndAnalyzeData();
// Returns: { transactions, trends, income, expenses }
```

## Configuration Options

- `SCRAPE_MONTHS_BACK`: Number of months to scrape (default: 3)
- `BANK_LEUMI_USERNAME`: Your Bank Leumi username
- `BANK_LEUMI_PASSWORD`: Your Bank Leumi password
