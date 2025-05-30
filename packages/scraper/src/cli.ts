#!/usr/bin/env node
import { ScraperService } from "./services/scraperService";
import { logger } from "./utils/logger";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const command = process.argv[2];

async function main() {
  const service = new ScraperService();

  try {
    switch (command) {
      case "scrape":
        console.log("Starting bank data scrape...");
        await service.forceScrape();
        console.log("Scraping completed successfully!");
        break;

      case "summary":
        console.log("Fetching financial summary...");
        const summary = await service.getFinancialSummary();
        console.log("\n=== Financial Summary ===");
        console.log(`Total transactions: ${summary.transactions.length}`);
        console.log(`Income categories: ${Object.keys(summary.income).length}`);
        console.log(
          `Expense categories: ${Object.keys(summary.expenses).length}`
        );
        console.log("\n=== Recent Trends ===");
        summary.trends.slice(0, 3).forEach((trend) => {
          console.log(
            `${trend.period}: Income: ₪${trend.income.toFixed(2)}, Expenses: ₪${trend.expenses.toFixed(2)}`
          );
        });
        break;

      case "accounts":
        console.log("Fetching accounts...");
        const accounts = await service.getAccounts();
        console.log("\n=== Bank Accounts ===");
        accounts.forEach((account) => {
          console.log(`${account.name}: ₪${account.balance.toFixed(2)}`);
        });
        break;

      default:
        console.log("Usage: yarn scrape [command]");
        console.log("Commands:");
        console.log("  scrape   - Force scrape bank data");
        console.log("  summary  - Show financial summary");
        console.log("  accounts - List all accounts");
        process.exit(1);
    }
  } catch (error) {
    logger.error("CLI command failed", { error });
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    service.close();
  }
}

main();
