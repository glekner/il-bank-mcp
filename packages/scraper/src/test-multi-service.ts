import { scrapeAllBankData } from "./scraper";
import { logger } from "./utils/logger";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testMultiServiceScraping() {
  try {
    logger.info("Starting multi-service scraping test");

    // Test scraping all services
    logger.info("Testing scrape all services...");
    const allData = await scrapeAllBankData();

    logger.info("All services scraping results:", {
      accounts: allData.accounts.length,
      transactions: allData.transactions.length,
      services: allData.accounts
        .map((acc) => acc.id.split("-")[0])
        .filter((v, i, a) => a.indexOf(v) === i),
    });

    // Print summary for each account
    allData.accounts.forEach((account) => {
      const accountTransactions = allData.transactions.filter(
        (txn) => txn.accountId === account.id
      );
      logger.info(`Account ${account.name}:`, {
        id: account.id,
        balance: account.balance,
        type: account.type,
        transactions: accountTransactions.length,
      });
    });

    logger.info("Multi-service scraping test completed successfully!");
  } catch (error) {
    logger.error("Multi-service scraping test failed:", error);
    process.exit(1);
  }
}

// Run the test
testMultiServiceScraping().then(() => {
  logger.info("Test completed");
  process.exit(0);
});
